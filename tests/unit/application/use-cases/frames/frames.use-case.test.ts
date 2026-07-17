import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import type { FrameInsert } from '@/src/entities/models/frame';

const replaceFrames = getInjection('IReplaceFramesUseCase');
const getFrames = getInjection('IGetFramesUseCase');

let broadcastId: string;

const sampleFrames: FrameInsert[] = [
  {
    startTime: '00:00',
    endTime: '05:00',
    headline: 'Wildfires spread',
    frameTime: '02:30',
    reason: 'On-location footage',
    frameUrl: '/frames/a/story-1.jpg',
  },
];

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('stores the frame url and metadata with a positional idx', async () => {
  const created = await replaceFrames(broadcastId, sampleFrames);

  expect(created[0]).toMatchObject({ idx: 0, frameUrl: '/frames/a/story-1.jpg', frameTime: '02:30' });
});

it('replaces the previous set rather than appending', async () => {
  await replaceFrames(broadcastId, sampleFrames);
  await replaceFrames(broadcastId, sampleFrames);

  await expect(getFrames(broadcastId)).resolves.toHaveLength(1);
});

it('returns an empty list for a broadcast with no frames', async () => {
  await expect(getFrames(broadcastId)).resolves.toEqual([]);
});
