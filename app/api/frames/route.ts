import { generateText, Output } from 'ai';
import {
  FRAMES_DIR,
  HEADLINES_DIR,
  readCachedArtifact,
  requestedFilename,
  UPLOADS_DIR,
  writeArtifactAtomic,
} from '@/lib/artifacts';
import { MODELS } from '@/lib/models';
import { headlinesFileSchema, type FrameItem, type HeadlineItem } from '@/lib/schemas';
import { secondsToTimestamp, TIMESTAMP_PATTERN, timestampToSeconds } from '@/lib/timestamps';
import { extractFrame, videoDurationSeconds } from '@/lib/video';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

// Frames this close to a story boundary are transition shots where the
// previous story's visuals are still on screen. The prompt tells the model
// to avoid them and the clamp below enforces it server-side.
const FRAME_BOUNDARY_MARGIN_SEC = 15;

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  const manifestPath = path.join(FRAMES_DIR, `${filename}.json`);

  const cached = await readCachedArtifact(manifestPath);
  if (cached !== null) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json', 'X-Frames-Cache': 'hit' },
    });
  }

  const rawHeadlines = await readCachedArtifact(path.join(HEADLINES_DIR, `${filename}.json`));
  if (rawHeadlines === null) {
    return Response.json({ error: `No headlines found for ${filename}. Run /api/headlines first.` }, { status: 404 });
  }

  let headlines: HeadlineItem[];
  try {
    headlines = headlinesFileSchema.parse(JSON.parse(rawHeadlines)).items;
  } catch {
    return Response.json(
      { error: `Headlines file for ${filename} is malformed. Regenerate it via /api/headlines.` },
      { status: 500 },
    );
  }

  if (headlines.length === 0) {
    return Response.json({ error: `Headlines file for ${filename} contains no items.` }, { status: 422 });
  }

  // Read the (potentially large) video only after all cheap preconditions pass.
  const videoPath = path.join(UPLOADS_DIR, filename);
  let video: Buffer;
  try {
    video = await readFile(videoPath);
  } catch {
    return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
  }

  // Schema pins the array length so each frame pick lines up 1:1 with the headlines.
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

  const storyList = headlines
    .map((h, i) => `${i + 1}. [${h.startTime}-${h.endTime}] ${h.headline}: ${h.summary}`)
    .join('\n');

  // Transcript timestamps can drift past the real video length; cap every
  // seek at the actual duration or ffmpeg extracts nothing. Probe while the
  // model call is in flight.
  const durationPromise = videoDurationSeconds(videoPath);

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
          { type: 'file', mediaType: 'video/mp4', data: video },
        ],
      },
    ],
  });

  const baseName = filename.replace(/\.mp4$/, '');
  const outputDir = path.join(FRAMES_DIR, baseName);
  await mkdir(outputDir, { recursive: true });

  const lastSeekableSec = Math.max(0, Math.floor(await durationPromise) - 1);

  const items: FrameItem[] = await Promise.all(
    result.output.items.map(async (pick, i) => {
      const story = headlines[i];
      // Clamp the pick into the story span so a stray model timestamp can't
      // pull a frame from a different story. Keep the boundary margin (when
      // the span allows) — the model has ignored the prompt rule before.
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

  const body = JSON.stringify({ filename, items }, null, 2);
  await writeArtifactAtomic(manifestPath, body);

  return new Response(body, {
    headers: { 'Content-Type': 'application/json', 'X-Frames-Cache': 'miss' },
  });
}
