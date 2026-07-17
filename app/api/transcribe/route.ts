import { createTextStreamResponse, streamText, toTextStream } from 'ai';
import {
  readCachedArtifact,
  requestedFilename,
  TRANSCRIPTS_DIR,
  UPLOADS_DIR,
  writeArtifactAtomic,
} from '@/lib/artifacts';
import { MODELS } from '@/lib/models';
import { lineTimestamp } from '@/lib/timestamps';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  const transcriptPath = path.join(TRANSCRIPTS_DIR, `${filename}.txt`);

  const cached = await readCachedArtifact(transcriptPath);
  if (cached !== null) {
    return new Response(cached, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Transcript-Cache': 'hit' },
    });
  }

  let video: Buffer;
  try {
    video = await readFile(path.join(UPLOADS_DIR, filename));
  } catch {
    return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
  }

  const result = streamText({
    model: MODELS.transcribe,
    system:
      'You are a transcription engine. You output verbatim transcripts and nothing else. ' +
      'Never add introductions, headers, or commentary. Your response must start directly with the first timestamp.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcribe the spoken audio in this video. Include a timestamp (MM:SS) roughly every 10 seconds and preserve speaker turns.',
          },
          { type: 'file', mediaType: 'video/mp4', data: video },
        ],
      },
    ],
  });

  // Persist once the stream completes. Only cache output that looks like a
  // transcript — a refusal or preamble cached here would poison every
  // downstream stage until someone manually deletes the file.
  void (async () => {
    try {
      const text = await result.text;
      if (lineTimestamp(text.trim()) === null) {
        console.error(
          `Transcript for ${filename} does not start with a timestamp; not caching. Got: ${text.slice(0, 80)}`,
        );
        return;
      }
      await writeArtifactAtomic(transcriptPath, text);
    } catch (error) {
      console.error(`Failed to persist transcript for ${filename}:`, error);
    }
  })();

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
    headers: { 'X-Transcript-Cache': 'miss' },
  });
}
