import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { NotFoundError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastUseCase');
const transcribe = getInjection('ITranscribeBroadcastUseCase');
const embedTranscript = getInjection('IEmbedTranscriptUseCase');
const detectStories = getInjection('IDetectStoriesUseCase');
const generateHeadlines = getInjection('IGenerateHeadlinesUseCase');
const extractFrames = getInjection('IExtractFramesUseCase');

let filename: string;
let broadcastId: string;

beforeEach(async () => {
  filename = `${crypto.randomUUID()}.mp4`;
  ({ id: broadcastId } = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 }));
});

it('throws NotFoundError when the broadcast row does not exist', async () => {
  await expect(transcribe('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(embedTranscript('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(detectStories('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(generateHeadlines('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
  await expect(extractFrames('unknown.mp4')).rejects.toBeInstanceOf(NotFoundError);
});

it('transcribes once and serves the stored transcript on the second call', async () => {
  const fresh = await transcribe(broadcastId);
  expect(fresh.cached).toBe(false);
  expect(fresh.data.text).toMatch(/^00:00 /);

  const again = await transcribe(broadcastId);
  expect(again.cached).toBe(true);
  expect(again.data.text).toBe(fresh.data.text);
});

it('requires a transcript before detecting stories', async () => {
  await expect(detectStories(broadcastId)).rejects.toBeInstanceOf(NotFoundError);
});

it('requires a transcript before embedding', async () => {
  await expect(embedTranscript(broadcastId)).rejects.toBeInstanceOf(NotFoundError);
});

it('chunks and embeds the transcript with positional idx, then caches', async () => {
  await transcribe(broadcastId);

  const fresh = await embedTranscript(broadcastId);
  expect(fresh.cached).toBe(false);
  expect(fresh.data.map(chunk => chunk.idx)).toEqual([0, 1, 2, 3]);
  expect(fresh.data.map(chunk => chunk.startTime)).toEqual(['00:00', '02:30', '05:00', '07:30']);
  // Content is stored timestamp-free; the span lives in start/end.
  expect(fresh.data[0].content).toBe('Good evening, tonight wildfires spread across the state.');

  const again = await embedTranscript(broadcastId);
  expect(again.cached).toBe(true);
  expect(again.data.map(chunk => chunk.id)).toEqual(fresh.data.map(chunk => chunk.id));
});

it('detects stories with positional idx and caches them', async () => {
  await transcribe(broadcastId);

  const fresh = await detectStories(broadcastId);
  expect(fresh.cached).toBe(false);
  expect(fresh.data.map(story => story.idx)).toEqual([0, 1]);

  const again = await detectStories(broadcastId);
  expect(again.cached).toBe(true);
});

it('clamps drifted spans to the video duration and drops stories starting past it', async () => {
  await transcribe(broadcastId);

  // The mock segmentation ends its second story at 10:30 and starts a third
  // at 10:05, both past the mock media processor's 600s (10:00) duration.
  const { data: stories } = await detectStories(broadcastId);
  expect(stories).toHaveLength(2);
  expect(stories[1].startTime).toBe('05:00');
  expect(stories[1].endTime).toBe('10:00');
});

it('requires stories before generating headlines', async () => {
  await transcribe(broadcastId);
  await expect(generateHeadlines(broadcastId)).rejects.toBeInstanceOf(NotFoundError);
});

it('generates one headline per story, span-aligned', async () => {
  await transcribe(broadcastId);
  const { data: stories } = await detectStories(broadcastId);

  const { data: headlines, cached } = await generateHeadlines(broadcastId);
  expect(cached).toBe(false);
  expect(headlines).toHaveLength(stories.length);
  headlines.forEach((headline, i) => {
    expect(headline.startTime).toBe(stories[i].startTime);
    expect(headline.endTime).toBe(stories[i].endTime);
  });
});

it('requires headlines before extracting frames', async () => {
  await transcribe(broadcastId);
  await detectStories(broadcastId);
  await expect(extractFrames(broadcastId)).rejects.toBeInstanceOf(NotFoundError);
});

it('extracts one frame per headline, clamped inside the story span', async () => {
  await transcribe(broadcastId);
  await detectStories(broadcastId);
  const { data: headlines } = await generateHeadlines(broadcastId);

  const { data: frames, cached } = await extractFrames(broadcastId);
  expect(cached).toBe(false);
  expect(frames).toHaveLength(headlines.length);

  const toSeconds = (ts: string) => ts.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  frames.forEach((frame, i) => {
    const frameSec = toSeconds(frame.frameTime);
    expect(frameSec).toBeGreaterThanOrEqual(toSeconds(headlines[i].startTime));
    expect(frameSec).toBeLessThanOrEqual(toSeconds(headlines[i].endTime));
    expect(frame.frameUrl).toBe(`frames/${filename.replace(/\.mp4$/, '')}/story-${i + 1}.jpg`);
  });

  const again = await extractFrames(broadcastId);
  expect(again.cached).toBe(true);
});
