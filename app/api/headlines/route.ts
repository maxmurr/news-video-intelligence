import { generateText, Output } from 'ai';
import {
  HEADLINES_DIR,
  readCachedArtifact,
  requestedFilename,
  STORIES_DIR,
  TRANSCRIPTS_DIR,
  writeArtifactAtomic,
} from '@/lib/artifacts';
import { MODELS } from '@/lib/models';
import { HEADLINE_MAX_WORDS, storiesFileSchema, type Story } from '@/lib/schemas';
import path from 'node:path';
import { z } from 'zod';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file with a transcript.' }, { status: 400 });
  }

  const headlinesPath = path.join(HEADLINES_DIR, `${filename}.json`);

  const cached = await readCachedArtifact(headlinesPath);
  if (cached !== null) {
    return new Response(cached, {
      headers: { 'Content-Type': 'application/json', 'X-Headlines-Cache': 'hit' },
    });
  }

  const transcript = await readCachedArtifact(path.join(TRANSCRIPTS_DIR, `${filename}.txt`));
  if (transcript === null) {
    return Response.json({ error: `No transcript found for ${filename}. Run /api/transcribe first.` }, { status: 404 });
  }

  const rawStories = await readCachedArtifact(path.join(STORIES_DIR, `${filename}.json`));
  if (rawStories === null) {
    return Response.json({ error: `No stories found for ${filename}. Run /api/stories first.` }, { status: 404 });
  }

  let stories: Story[];
  try {
    stories = storiesFileSchema.parse(JSON.parse(rawStories)).stories;
  } catch {
    return Response.json(
      { error: `Stories file for ${filename} is malformed. Regenerate it via /api/stories.` },
      { status: 500 },
    );
  }

  if (stories.length === 0) {
    return Response.json({ error: `Stories file for ${filename} contains no stories.` }, { status: 422 });
  }

  // Schema pins the array length so each item lines up 1:1 with the input stories.
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

  const storyList = stories
    .map((s, i) => `${i + 1}. [${s.startTime}-${s.endTime}] ${s.title}: ${s.summary}`)
    .join('\n');

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

  const body = JSON.stringify(
    {
      filename,
      items: result.output.items.map((item, i) => ({
        startTime: stories[i].startTime,
        endTime: stories[i].endTime,
        headline: item.headline,
        summary: item.summary,
      })),
    },
    null,
    2,
  );

  await writeArtifactAtomic(headlinesPath, body);

  return new Response(body, {
    headers: { 'Content-Type': 'application/json', 'X-Headlines-Cache': 'miss' },
  });
}
