import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const saveTranscript = getInjection('ISaveTranscriptController');
const getTranscript = getInjection('IGetTranscriptController');

let broadcastId: string;

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('saves a transcript and serializes timestamps as ISO strings', async () => {
  const dto = await saveTranscript({ broadcastId, text: '00:00 hi' });

  expect(dto.text).toBe('00:00 hi');
  expect(dto.createdAt).toBe(new Date(dto.createdAt).toISOString());
});

it('returns null when the broadcast has no transcript yet', async () => {
  await expect(getTranscript(broadcastId)).resolves.toBeNull();
});

it('throws InputParseError when the text is empty', async () => {
  await expect(saveTranscript({ broadcastId, text: '' })).rejects.toBeInstanceOf(InputParseError);
});
