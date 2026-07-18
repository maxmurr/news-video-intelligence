import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastController');
const transcribe = getInjection('ITranscribeBroadcastController');
const detectStories = getInjection('IDetectStoriesController');

let filename: string;
let broadcastId: string;

beforeEach(async () => {
  filename = `${crypto.randomUUID()}.mp4`;
  ({ id: broadcastId } = await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 }));
});

it('presents the transcribe stage as cached flag plus text', async () => {
  const dto = await transcribe(broadcastId);

  expect(dto.cached).toBe(false);
  expect(typeof dto.text).toBe('string');
  expect(Object.keys(dto).sort()).toEqual(['cached', 'text']);
});

it('presents detected stories without persistence fields', async () => {
  await transcribe(broadcastId);
  const dto = await detectStories(broadcastId);

  expect(dto.stories.length).toBeGreaterThan(0);
  expect(Object.keys(dto.stories[0]).sort()).toEqual(['endTime', 'startTime', 'summary', 'title']);
});

it('throws InputParseError for an invalid broadcast id', async () => {
  await expect(transcribe('')).rejects.toBeInstanceOf(InputParseError);
  await expect(transcribe(42)).rejects.toBeInstanceOf(InputParseError);
});
