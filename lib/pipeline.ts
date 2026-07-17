/**
 * Pipeline stage logic, decoupled from HTTP. Each stage is keyed by upload
 * filename, reads its inputs from disk, generates its artifact, and persists
 * it atomically. Stages are cache-aware: a second call returns the existing
 * artifact instead of regenerating. Both the API routes and the durable
 * workflow drive these functions, so the prompts and shapes live in one place.
 */
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  FRAMES_DIR,
  HEADLINES_DIR,
  parseCachedArtifact,
  readArtifactJson,
  readCachedArtifact,
  STORIES_DIR,
  TRANSCRIPTS_DIR,
  UPLOADS_DIR,
  writeArtifactAtomic,
} from './artifacts';
import { MODELS } from './models';
import {
  framesFileSchema,
  HEADLINE_MAX_WORDS,
  headlinesFileSchema,
  storiesFileSchema,
  type FrameItem,
  type HeadlineItem,
  type Story,
} from './schemas';
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

export function transcriptPath(filename: string): string {
  return path.join(TRANSCRIPTS_DIR, `${filename}.txt`);
}

export function storiesPath(filename: string): string {
  return path.join(STORIES_DIR, `${filename}.json`);
}

export function headlinesPath(filename: string): string {
  return path.join(HEADLINES_DIR, `${filename}.json`);
}

export function framesPath(filename: string): string {
  return path.join(FRAMES_DIR, `${filename}.json`);
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
 * Cache-hit path for a JSON stage: read, validate, and wrap the artifact with
 * its filename. Returns null when there is no artifact yet, or when a stored
 * one is malformed — either way the caller regenerates.
 */
async function readCachedJsonStage<T>(
  filePath: string,
  schema: z.ZodType<T>,
  filename: string,
): Promise<StageResult<{ filename: string } & T> | null> {
  const parsed = await readArtifactJson(filePath, schema);
  if (parsed === null) return null;
  return { data: { filename, ...parsed }, cached: true };
}

/** Persists a freshly generated artifact and returns it as a cache miss. */
async function writeJsonArtifact<T extends object>(filePath: string, data: T): Promise<StageResult<T>> {
  await writeArtifactAtomic(filePath, JSON.stringify(data, null, 2));
  return { data, cached: false };
}

/** Loads a required upstream JSON artifact: 404 when absent, 500 when malformed. */
async function loadRequiredArtifact<T>(
  filePath: string,
  schema: z.ZodType<T>,
  messages: { notFound: string; malformed: string },
): Promise<T> {
  const raw = await readCachedArtifact(filePath);
  if (raw === null) throw new PipelineError(messages.notFound, 404);
  const parsed = parseCachedArtifact(raw, schema);
  if (parsed === null) throw new PipelineError(messages.malformed, 500);
  return parsed;
}

async function readTranscript(filename: string): Promise<string> {
  const transcript = await readCachedArtifact(transcriptPath(filename));
  if (transcript === null) {
    throw new PipelineError(`No transcript found for ${filename}. Run /api/transcribe first.`, 404);
  }
  return transcript;
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
  const transcriptFile = transcriptPath(filename);

  const cached = await readCachedArtifact(transcriptFile);
  if (cached !== null) return { data: cached, cached: true };

  const audio = await extractSpeechAudio(await resolveUpload(filename));

  const result = await generateText(transcribeRequest(audio));

  const text = normalizeTranscript(result.text).trim();
  // Reject a refusal/preamble as a retryable failure instead of persisting garbage.
  if (!isValidTranscript(text)) {
    throw new Error(`Transcript for ${filename} does not start with a timestamp. Got: ${text.slice(0, 80)}`);
  }

  await writeArtifactAtomic(transcriptFile, text);
  return { data: text, cached: false };
}

export async function detectStories(filename: string): Promise<StageResult<{ filename: string; stories: Story[] }>> {
  const file = storiesPath(filename);

  const hit = await readCachedJsonStage(file, storiesFileSchema, filename);
  if (hit) return hit;

  const transcript = await readTranscript(filename);

  const result = await generateText({
    model: MODELS.stories,
    output: Output.object({ schema: storiesFileSchema }),
    system:
      'You are a news video segmentation engine. You split news transcripts into distinct stories. ' +
      'A story boundary is where the topic changes to a different news item, not where speakers change turns ' +
      'within the same discussion. Use only timestamps that appear in the transcript. ' +
      "Stories must be contiguous and cover the full transcript in order: each story's startTime must be " +
      "exactly the previous story's endTime — the shared boundary timestamp — with no gap in between.",
    prompt: `Detect the story boundaries in this timestamped news transcript:\n\n${transcript}`,
  });

  return writeJsonArtifact(file, { filename, ...result.output });
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
  const file = headlinesPath(filename);

  const hit = await readCachedJsonStage(file, headlinesFileSchema, filename);
  if (hit) return hit;

  const [transcript, { stories }] = await Promise.all([
    readTranscript(filename),
    loadRequiredArtifact(storiesPath(filename), storiesFileSchema, {
      notFound: `No stories found for ${filename}. Run /api/stories first.`,
      malformed: `Stories file for ${filename} is malformed. Regenerate it via /api/stories.`,
    }),
  ]);

  if (stories.length === 0) {
    throw new PipelineError(`Stories file for ${filename} contains no stories.`, 422);
  }

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

  const data = {
    filename,
    items: result.output.items.map((item, i) => ({
      startTime: stories[i].startTime,
      endTime: stories[i].endTime,
      headline: item.headline,
      summary: item.summary,
    })),
  };

  return writeJsonArtifact(file, data);
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
  const file = framesPath(filename);

  const hit = await readCachedJsonStage(file, framesFileSchema, filename);
  if (hit) return hit;

  const { items: headlines } = await loadRequiredArtifact(headlinesPath(filename), headlinesFileSchema, {
    notFound: `No headlines found for ${filename}. Run /api/headlines first.`,
    malformed: `Headlines file for ${filename} is malformed. Regenerate it via /api/headlines.`,
  });

  if (headlines.length === 0) {
    throw new PipelineError(`Headlines file for ${filename} contains no items.`, 422);
  }

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

  return writeJsonArtifact(file, { filename, items });
}
