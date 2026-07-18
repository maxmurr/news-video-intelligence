import { beforeEach, expect, it } from 'vitest';

import { getInjection } from '@/di/container';

const saveRun = getInjection('ISaveRunUseCase');
const runsRepository = getInjection('IRunsRepository');

let broadcastId: string;

beforeEach(() => {
  broadcastId = crypto.randomUUID();
});

it('records a run with a startedAt timestamp', async () => {
  const run = await saveRun({ broadcastId, runId: 'run_123' });

  expect(run.runId).toBe('run_123');
  expect(run.startedAt).toBeInstanceOf(Date);
});

it('accepts a null runId for a failed start attempt', async () => {
  const run = await saveRun({ broadcastId, runId: null });
  expect(run.runId).toBeNull();
});

it('overwrites the run for a broadcast instead of duplicating it', async () => {
  const first = await saveRun({ broadcastId, runId: null });
  const second = await saveRun({ broadcastId, runId: 'run_456' });

  expect(second.id).toBe(first.id);
  await expect(runsRepository.getRun(broadcastId)).resolves.toMatchObject({ runId: 'run_456' });
});

it('returns undefined when no start was ever attempted', async () => {
  await expect(runsRepository.getRun(broadcastId)).resolves.toBeUndefined();
});
