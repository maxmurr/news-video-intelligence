/**
 * Pipeline stage logic, decoupled from HTTP. Each stage is keyed by upload
 * filename, reads its inputs from the database through the clean-architecture
 * controllers, generates its output, and persists it the same way. Only the
 * binaries stay on disk: the source MP4 in public/uploads and the extracted
 * frame JPEGs in public/frames. Stages are cache-aware: a second call returns
 * the stored rows instead of regenerating. Both the API routes and the durable
 * workflow drive these functions, so the prompts and shapes live in one place.
 */
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';
import { FRAMES_DIR, UPLOADS_DIR } from './artifacts';
import { MODELS } from './models';
import { HEADLINE_MAX_WORDS, storiesOutputSchema, type FrameItem, type HeadlineItem, type Story } from './schemas';
import {
  lineTimestamp,
  normalizeTranscript,
  secondsToTimestamp,
  TIMESTAMP_PATTERN,
  timestampToSeconds,
} from './timestamps';
import { createFramePreview, extractFrame, extractSpeechAudio, videoDurationSeconds } from './video';

/**
 * A precondition or validation failure that a retry will not fix: a missing
 * upstream artifact, a malformed cache file, an empty input. Carries the HTTP
 * status a route should return; the workflow treats it as fatal (no retry).
 * Operational failures (model calls, ffmpeg) throw plain Errors and stay
 * retryable.
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export interface StageResult<T> {
  data: T;
  cached: boolean;
}

function uploadPath(filename: string): string {
  return path.join(UPLOADS_DIR, filename);
}

/** Resolves an upload to its path, or throws a 404 PipelineError when absent. */
export async function resolveUpload(filename: string): Promise<string> {
  const videoPath = uploadPath(filename);
  try {
    await stat(videoPath);
  } catch {
    throw new PipelineError(`File not found: ${filename}`, 404);
  }
  return videoPath;
}

/**
 * Stages never create the aggregate root — the upload route is the sole
 * creator. A stage running against a filename with no broadcast row is a
 * broken invocation, not a recoverable state.
 */
async function resolveBroadcastId(filename: string): Promise<string> {
  try {
    const broadcast = await getInjection('IGetBroadcastByFilenameController')(filename);
    return broadcast.id;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new PipelineError(`No broadcast for ${filename}. Upload it first.`, 404);
    }
    throw error;
  }
}

/**
 * A controller rejecting generated data is deterministic — the same output
 * would fail again — so it must surface as a fatal PipelineError rather than
 * a plain Error the workflow would burn retries on.
 */
async function persist<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof InputParseError) {
      throw new PipelineError(`Generated data failed validation: ${error.message}`, 500);
    }
    throw error;
  }
}

async function requireTranscript(broadcastId: string, filename: string): Promise<string> {
  const transcript = await getInjection('IGetTranscriptController')(broadcastId);
  if (transcript === null) {
    throw new PipelineError(`No transcript found for ${filename}. Run the transcribe stage first.`, 404);
  }
  return transcript.text;
}

function toStory(row: { title: string; summary: string; startTime: string; endTime: string }): Story {
  return { title: row.title, summary: row.summary, startTime: row.startTime, endTime: row.endTime };
}

function toHeadlineItem(row: { startTime: string; endTime: string; headline: string; summary: string }): HeadlineItem {
  return { startTime: row.startTime, endTime: row.endTime, headline: row.headline, summary: row.summary };
}

function toFrameItem(row: {
  startTime: string;
  endTime: string;
  headline: string;
  frameTime: string;
  reason: string;
  frameUrl: string;
}): FrameItem {
  return {
    startTime: row.startTime,
    endTime: row.endTime,
    headline: row.headline,
    frameTime: row.frameTime,
    reason: row.reason,
    frameUrl: row.frameUrl,
  };
}

/**
 * Shared model-call options for transcription. The HTTP route streams this
 * request (streamText) while the workflow awaits it (generateText via
 * transcribeVideo), so the prompt lives here, once.
 */
export function transcribeRequest(audio: Buffer) {
  return {
    model: MODELS.transcribe,
    system:
      'You are a transcription engine. You output verbatim transcripts and nothing else. ' +
      'Never add introductions, headers, or commentary. Your response must start directly with the first timestamp.',
    messages: [
      {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'Transcribe the spoken audio. Start a new line with a plain MM:SS timestamp (for example 01:23 — no parentheses or brackets) roughly every 10 seconds, and preserve speaker turns.',
          },
          { type: 'file' as const, mediaType: 'audio/mpeg', data: audio },
        ],
      },
    ],
  };
}

/**
 * A transcript must start with a timestamp; anything else is a refusal or
 * preamble that would poison every downstream stage if cached.
 */
export function isValidTranscript(text: string): boolean {
  return lineTimestamp(text.trim()) !== null;
}

export async function transcribeVideo(filename: string): Promise<StageResult<string>> {
  const broadcastId = await resolveBroadcastId(filename);

  const existing = await getInjection('IGetTranscriptController')(broadcastId);
  if (existing !== null) return { data: existing.text, cached: true };

  const audio = await extractSpeechAudio(await resolveUpload(filename));

  const result = await generateText(transcribeRequest(audio));

  const text = normalizeTranscript(result.text).trim();
  // Reject a refusal/preamble as a retryable failure instead of persisting garbage.
  if (!isValidTranscript(text)) {
    throw new Error(`Transcript for ${filename} does not start with a timestamp. Got: ${text.slice(0, 80)}`);
  }

  await persist(() => getInjection('ISaveTranscriptController')({ broadcastId, text }));
  return { data: text, cached: false };
}

export async function detectStories(filename: string): Promise<StageResult<{ filename: string; stories: Story[] }>> {
  const broadcastId = await resolveBroadcastId(filename);

  const existing = await getInjection('IGetStoriesController')(broadcastId);
  if (existing.length > 0) return { data: { filename, stories: existing.map(toStory) }, cached: true };

  const transcript = await requireTranscript(broadcastId, filename);

  const result = await generateText({
    model: MODELS.stories,
    output: Output.object({ schema: storiesOutputSchema }),
    system:
      'You are a news video segmentation engine. You split news transcripts into distinct stories. ' +
      'A story boundary is where the topic changes to a different news item, not where speakers change turns ' +
      'within the same discussion. Use only timestamps that appear in the transcript. ' +
      "Stories must be contiguous and cover the full transcript in order: each story's startTime must be " +
      "exactly the previous story's endTime — the shared boundary timestamp — with no gap in between.",
    prompt: `Detect the story boundaries in this timestamped news transcript:\n\n${transcript}`,
  });

  const { stories } = result.output;
  await persist(() => getInjection('IReplaceStoriesController')({ broadcastId, items: stories }));
  return { data: { filename, stories }, cached: false };
}

/**
 * The numbered story-list block every prompt that references detected stories
 * uses (headline generation, frame picking, chat grounding). One owner so the
 * chat model and the pipeline stages always see the same shape.
 */
export function formatStoryList<T extends { startTime: string; endTime: string; summary: string }>(
  items: T[],
  heading: (item: T) => string,
): string {
  return items
    .map((item, i) => `${i + 1}. [${item.startTime}-${item.endTime}] ${heading(item)}: ${item.summary}`)
    .join('\n');
}

export async function generateHeadlines(
  filename: string,
): Promise<StageResult<{ filename: string; items: HeadlineItem[] }>> {
  const broadcastId = await resolveBroadcastId(filename);

  const existing = await getInjection('IGetHeadlinesController')(broadcastId);
  if (existing.length > 0) return { data: { filename, items: existing.map(toHeadlineItem) }, cached: true };

  const [transcript, storyRows] = await Promise.all([
    requireTranscript(broadcastId, filename),
    getInjection('IGetStoriesController')(broadcastId),
  ]);

  if (storyRows.length === 0) {
    throw new PipelineError(`No stories found for ${filename}. Run the stories stage first.`, 404);
  }
  const stories = storyRows.map(toStory);

  // Length is pinned so each item lines up 1:1 with the input stories.
  const headlinesSchema = z.object({
    items: z
      .array(
        z.object({
          headline: z.string().describe(`Punchy news-style headline, under ${HEADLINE_MAX_WORDS} words, no clickbait`),
          summary: z.string().describe('Two to three sentence summary grounded only in this story segment'),
        }),
      )
      .length(stories.length),
  });

  const storyList = formatStoryList(stories, s => s.title);

  const result = await generateText({
    model: MODELS.headlines,
    output: Output.object({ schema: headlinesSchema }),
    system:
      'You are a news editor. You write headlines and summaries for segments of a news video. ' +
      'For each story you are given, write one headline and one summary based only on what is said ' +
      "in that story's transcript span. Do not invent facts that are not in the transcript. " +
      'Return exactly one item per story, in the same order as the story list.',
    prompt: `Here are the detected stories:\n\n${storyList}\n\nFull timestamped transcript:\n\n${transcript}`,
  });

  const items = result.output.items.map((item, i) => ({
    startTime: stories[i].startTime,
    endTime: stories[i].endTime,
    headline: item.headline,
    summary: item.summary,
  }));

  await persist(() => getInjection('IReplaceHeadlinesController')({ broadcastId, items }));
  return { data: { filename, items }, cached: false };
}

// Frames this close to a story boundary are transition shots where the
// previous story's visuals are still on screen. The prompt tells the model to
// avoid them and the clamp below enforces it server-side.
const FRAME_BOUNDARY_MARGIN_SEC = 15;

/**
 * Runs the frame-picking model call against a small downscaled proxy of the
 * video. The proxy buffer is scoped to this function so it becomes GC-eligible
 * before the ffmpeg extraction loop, which reads the original from disk.
 */
async function pickRepresentativeFrames(filename: string, headlines: HeadlineItem[]) {
  const preview = await createFramePreview(await resolveUpload(filename));

  // Length is pinned so each frame pick lines up 1:1 with the headlines.
  const framePicksSchema = z.object({
    items: z
      .array(
        z.object({
          frameTime: z
            .string()
            .regex(TIMESTAMP_PATTERN)
            .describe('MM:SS timestamp of the single most representative frame, within the story span'),
          reason: z.string().describe('One sentence on why this frame visually represents the story'),
        }),
      )
      .length(headlines.length),
  });

  const storyList = formatStoryList(headlines, h => h.headline);

  const result = await generateText({
    model: MODELS.frames,
    output: Output.object({ schema: framePicksSchema }),
    system:
      'You are a news video picture editor. For each story you are given, watch the video and pick the ' +
      'single frame that best represents that story visually: prefer relevant footage, graphics, or ' +
      'expressive moments over static talking heads when available. ' +
      `Never pick a frame within the first or last ${FRAME_BOUNDARY_MARGIN_SEC} seconds of a story span — those are transition ` +
      'shots where the presenter is still handing off from the previous topic. Search the middle of the ' +
      'span for the strongest visual, in this order of preference: (1) cutaway footage, on-location ' +
      'shots, graphics, or named people from the story; (2) the guest or expert who is speaking about ' +
      'the story; (3) only as a last resort, the studio host or presenter — the host introduces every ' +
      'story, so a host shot tells the viewer nothing about this one. Avoid frames that are blurry or ' +
      "mid-cut. The frame timestamp must lie within the story's time span. " +
      'Return exactly one pick per story, in the same order as the story list.',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Pick a representative frame for each of these stories:\n\n${storyList}` },
          { type: 'file', mediaType: 'video/mp4', data: preview },
        ],
      },
    ],
  });

  return result.output.items;
}

export async function extractFrames(filename: string): Promise<StageResult<{ filename: string; items: FrameItem[] }>> {
  const broadcastId = await resolveBroadcastId(filename);

  const existing = await getInjection('IGetFramesController')(broadcastId);
  if (existing.length > 0) return { data: { filename, items: existing.map(toFrameItem) }, cached: true };

  const headlineRows = await getInjection('IGetHeadlinesController')(broadcastId);
  if (headlineRows.length === 0) {
    throw new PipelineError(`No headlines found for ${filename}. Run the headlines stage first.`, 404);
  }
  const headlines = headlineRows.map(toHeadlineItem);

  const videoPath = uploadPath(filename);

  // Transcript timestamps can drift past the real video length; cap every seek
  // at the actual duration or ffmpeg extracts nothing. Probe while the model
  // call is in flight.
  const durationPromise = videoDurationSeconds(videoPath);
  const picks = await pickRepresentativeFrames(filename, headlines);

  const baseName = filename.replace(/\.mp4$/, '');
  const outputDir = path.join(FRAMES_DIR, baseName);
  await mkdir(outputDir, { recursive: true });

  const lastSeekableSec = Math.max(0, Math.floor(await durationPromise) - 1);

  const items: FrameItem[] = await Promise.all(
    picks.map(async (pick, i) => {
      const story = headlines[i];
      // Clamp the pick into the story span so a stray model timestamp can't pull
      // a frame from a different story. Keep the boundary margin when the span
      // allows — the model has ignored the prompt rule before.
      const startSec = timestampToSeconds(story.startTime);
      const endSec = timestampToSeconds(story.endTime);
      const margin = endSec - startSec > 3 * FRAME_BOUNDARY_MARGIN_SEC ? FRAME_BOUNDARY_MARGIN_SEC : 0;
      const frameSec = Math.min(
        Math.max(timestampToSeconds(pick.frameTime), startSec + margin),
        endSec - margin,
        lastSeekableSec,
      );

      const frameFile = `story-${i + 1}.jpg`;
      await extractFrame(videoPath, frameSec, path.join(outputDir, frameFile));

      return {
        startTime: story.startTime,
        endTime: story.endTime,
        headline: story.headline,
        frameTime: secondsToTimestamp(frameSec),
        reason: pick.reason,
        frameUrl: `/frames/${baseName}/${frameFile}`,
      };
    }),
  );

  await persist(() => getInjection('IReplaceFramesController')({ broadcastId, items }));
  return { data: { filename, items }, cached: false };
}
