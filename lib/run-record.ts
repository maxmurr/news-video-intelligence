/**
 * Persists the outcome of each pipeline start attempt so the read side can
 * tell "never started" apart from "started but still working". One record per
 * upload; a restart overwrites it. `runId: null` means the start call failed.
 */
import 'server-only';
import path from 'node:path';
import { z } from 'zod';
import { PUBLIC_DIR, readArtifactJson, writeArtifactAtomic } from './artifacts';

export const RUNS_DIR = path.join(PUBLIC_DIR, 'runs');

const runRecordSchema = z.object({
  runId: z.string().nullable(),
  startedAt: z.string(),
});

export type RunRecord = z.infer<typeof runRecordSchema>;

function runRecordPath(filename: string): string {
  return path.join(RUNS_DIR, `${filename}.json`);
}

export async function writeRunRecord(filename: string, runId: string | null): Promise<void> {
  const record: RunRecord = { runId, startedAt: new Date().toISOString() };
  await writeArtifactAtomic(runRecordPath(filename), JSON.stringify(record, null, 2));
}

/** Null when no start was ever attempted (or the record is malformed). */
export async function readRunRecord(filename: string): Promise<RunRecord | null> {
  return readArtifactJson(runRecordPath(filename), runRecordSchema);
}
