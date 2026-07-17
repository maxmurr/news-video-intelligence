import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const replaceFrames = getInjection('IReplaceFramesController');
const getFrames = getInjection('IGetFramesController');

let broadcastId: string;

const validFrame = {
  startTime: '00:00',
  endTime: '05:00',
  headline: 'H',
  frameTime: '02:30',
  reason: 'R',
  frameUrl: '/frames/a/story-1.jpg',
};

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('serializes frames with idx and ISO timestamps', async () => {
  const dtos = await replaceFrames({ broadcastId, items: [validFrame] });

  expect(dtos[0]).toMatchObject({ idx: 0, frameUrl: '/frames/a/story-1.jpg' });
  expect(dtos[0].createdAt).toBe(new Date(dtos[0].createdAt).toISOString());
});

it('reads frames back through the controller', async () => {
  await replaceFrames({ broadcastId, items: [validFrame] });
  await expect(getFrames(broadcastId)).resolves.toHaveLength(1);
});

it('throws InputParseError when frameTime is malformed', async () => {
  await expect(replaceFrames({ broadcastId, items: [{ ...validFrame, frameTime: 'later' }] })).rejects.toBeInstanceOf(
    InputParseError,
  );
});
