import { generateText, Output } from 'ai';
import {
  readCachedArtifact,
  requestedFilename,
  STORIES_DIR,
  TRANSCRIPTS_DIR,
  writeArtifactAtomic,
} from '@/lib/artifacts';
import { MODELS } from '@/lib/models';
import { storiesFileSchema } from '@/lib/schemas';
import path from 'node:path';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file with a transcript.' }, { status: 400 });
  }

  const storiesPath = path.join(STORIES_DIR, `${filename}.json`);

  const cached = await readCachedArtifact(storiesPath);
  if (cached !== null) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json', 'X-Stories-Cache': 'hit' },
    });
  }

  const transcript = await readCachedArtifact(path.join(TRANSCRIPTS_DIR, `${filename}.txt`));
  if (transcript === null) {
    return Response.json({ error: `No transcript found for ${filename}. Run /api/transcribe first.` }, { status: 404 });
  }

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

  const body = JSON.stringify({ filename, ...result.output }, null, 2);
  await writeArtifactAtomic(storiesPath, body);

  return new Response(body, {
    headers: { 'Content-Type': 'application/json', 'X-Stories-Cache': 'miss' },
  });
}
