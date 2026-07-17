import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';

const saveTranscript = getInjection('ISaveTranscriptUseCase');
const getTranscript = getInjection('IGetTranscriptUseCase');

let broadcastId: string;

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('saves a transcript with an id and timestamps', async () => {
  const transcript = await saveTranscript({ broadcastId, text: '00:00 hello' });

  expect(transcript.id).toBeTruthy();
  expect(transcript.broadcastId).toBe(broadcastId);
  expect(transcript.createdAt).toBeInstanceOf(Date);
});

it('overwrites the transcript for a broadcast instead of duplicating it', async () => {
  const first = await saveTranscript({ broadcastId, text: 'first' });
  const second = await saveTranscript({ broadcastId, text: 'second' });

  expect(second.id).toBe(first.id);
  await expect(getTranscript(broadcastId)).resolves.toMatchObject({ text: 'second' });
});

it('returns undefined when no transcript exists yet', async () => {
  await expect(getTranscript(broadcastId)).resolves.toBeUndefined();
});
