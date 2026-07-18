import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';
import { InputParseError } from '@/src/entities/errors/common';

const saveRun = getInjection('ISaveRunController');

let broadcastId: string;

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('saves a run and serializes startedAt as an ISO string', async () => {
  const dto = await saveRun({ broadcastId, runId: 'run_1' });

  expect(dto.runId).toBe('run_1');
  expect(dto.startedAt).toBe(new Date(dto.startedAt).toISOString());
});

it('throws InputParseError when broadcastId is missing', async () => {
  await expect(saveRun({ runId: 'run_1' })).rejects.toBeInstanceOf(InputParseError);
});
