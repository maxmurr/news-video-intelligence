import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import type { StoryInsert } from '@/src/entities/models/story';

const replaceStories = getInjection('IReplaceStoriesUseCase');
const getStories = getInjection('IGetStoriesUseCase');

let broadcastId: string;

const sampleStories: StoryInsert[] = [
  { title: 'Wildfires', summary: 'CA wildfire coverage', startTime: '00:00', endTime: '05:00' },
  { title: 'Elections', summary: 'Local election results', startTime: '05:00', endTime: '10:00' },
];

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('assigns a positional idx and returns stories in order', async () => {
  const created = await replaceStories(broadcastId, sampleStories);

  expect(created.map(story => story.idx)).toEqual([0, 1]);
  expect(created.map(story => story.title)).toEqual(['Wildfires', 'Elections']);
});

it('reads stories back ordered by idx', async () => {
  await replaceStories(broadcastId, sampleStories);
  const stored = await getStories(broadcastId);

  expect(stored.map(story => story.title)).toEqual(['Wildfires', 'Elections']);
});

it('replaces the previous set rather than appending', async () => {
  await replaceStories(broadcastId, sampleStories);
  await replaceStories(broadcastId, [{ title: 'Weather', summary: 'Forecast', startTime: '00:00', endTime: '02:00' }]);

  const stored = await getStories(broadcastId);
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ idx: 0, title: 'Weather' });
});

it('returns an empty list for a broadcast with no stories', async () => {
  await expect(getStories(broadcastId)).resolves.toEqual([]);
});
