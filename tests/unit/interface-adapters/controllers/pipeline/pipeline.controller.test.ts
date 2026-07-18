import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const createBroadcast = getInjection('ICreateBroadcastController');
const transcribe = getInjection('ITranscribeBroadcastController');
const detectStories = getInjection('IDetectStoriesController');

let filename: string;

beforeEach(async () => {
  filename = `${crypto.randomUUID()}.mp4`;
  await createBroadcast({ filename, url: `/uploads/${filename}`, size: 1 });
});

it('presents the transcribe stage as cached flag plus text', async () => {
  const dto = await transcribe(filename);

  expect(dto.cached).toBe(false);
  expect(typeof dto.text).toBe('string');
  expect(Object.keys(dto).sort()).toEqual(['cached', 'text']);
});

it('presents detected stories without persistence fields', async () => {
  await transcribe(filename);
  const dto = await detectStories(filename);

  expect(dto.stories.length).toBeGreaterThan(0);
  expect(Object.keys(dto.stories[0]).sort()).toEqual(['endTime', 'startTime', 'summary', 'title']);
});

it('throws InputParseError for an invalid filename', async () => {
  await expect(transcribe('')).rejects.toBeInstanceOf(InputParseError);
  await expect(transcribe(42)).rejects.toBeInstanceOf(InputParseError);
});
