import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { NotFoundError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastUseCase');
const transcribe = getInjection('ITranscribeBroadcastUseCase');
const detectStories = getInjection('IDetectStoriesUseCase');
const generateHeadlines = getInjection('IGenerateHeadlinesUseCase');
const extractFrames = getInjection('IExtractFramesUseCase');

let filename: string;

beforeEach(async () => {
  filename = `${crypto.randomUUID()}.mp4`;
  await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
});

it('throws NotFoundError when the broadcast row does not exist', async () => {
  await expect(transcribe('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(detectStories('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(generateHeadlines('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(extractFrames('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
});

it('transcribes once and serves the stored transcript on the second call', async () => {
  const fresh = await transcribe(filename);
  expect(fresh.cached).toBe(false);
  expect(fresh.data.text).toMatch(/^00:00 /);

  const again = await transcribe(filename);
  expect(again.cached).toBe(true);
  expect(again.data.text).toBe(fresh.data.text);
});

it('requires a transcript before detecting stories', async () => {
  await expect(detectStories(filename)).rejects.toBeInstanceOf(NotFoundError);
});

it('detects stories with positional idx and caches them', async () => {
  await transcribe(filename);

  const fresh = await detectStories(filename);
  expect(fresh.cached).toBe(false);
  expect(fresh.data.map(story => story.idx)).toEqual([0, 1]);

  const again = await detectStories(filename);
  expect(again.cached).toBe(true);
});

it('clamps drifted spans to the video duration and drops stories starting past it', async () => {
  await transcribe(filename);

  // The mock segmentation ends its second story at 10:30 and starts a third
  // at 10:05, both past the mock media processor's 600s (10:00) duration.
  const { data: stories } = await detectStories(filename);
  expect(stories).toHaveLength(2);
  expect(stories[1].startTime).toBe('05:00');
  expect(stories[1].endTime).toBe('10:00');
});

it('requires stories before generating headlines', async () => {
  await transcribe(filename);
  await expect(generateHeadlines(filename)).rejects.toBeInstanceOf(NotFoundError);
});

it('generates one headline per story, span-aligned', async () => {
  await transcribe(filename);
  const { data: stories } = await detectStories(filename);

  const { data: headlines, cached } = await generateHeadlines(filename);
  expect(cached).toBe(false);
  expect(headlines).toHaveLength(stories.length);
  headlines.forEach((headline, i) => {
    expect(headline.startTime).toBe(stories[i].startTime);
    expect(headline.endTime).toBe(stories[i].endTime);
  });
});

it('requires headlines before extracting frames', async () => {
  await transcribe(filename);
  await detectStories(filename);
  await expect(extractFrames(filename)).rejects.toBeInstanceOf(NotFoundError);
});

it('extracts one frame per headline, clamped inside the story span', async () => {
  await transcribe(filename);
  await detectStories(filename);
  const { data: headlines } = await generateHeadlines(filename);

  const { data: frames, cached } = await extractFrames(filename);
  expect(cached).toBe(false);
  expect(frames).toHaveLength(headlines.length);

  const toSeconds = (ts: string) => ts.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  frames.forEach((frame, i) => {
    const frameSec = toSeconds(frame.frameTime);
    expect(frameSec).toBeGreaterThanOrEqual(toSeconds(headlines[i].startTime));
    expect(frameSec).toBeLessThanOrEqual(toSeconds(headlines[i].endTime));
    expect(frame.frameUrl).toBe(`frames/${filename.replace(/\.mp4$/, '')}/story-${i + 1}.jpg`);
  });

  const again = await extractFrames(filename);
  expect(again.cached).toBe(true);
});
