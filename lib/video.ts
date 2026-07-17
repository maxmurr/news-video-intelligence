/**
 * ffmpeg/ffprobe helpers shared by the frames route and the evals, so the
 * probe/extract invocations live in one place.
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** Duration of a video in (fractional) seconds, via ffprobe. */
export async function videoDurationSeconds(videoPath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    videoPath,
  ]);
  return Number(stdout.trim());
}

/**
 * Extracts the frame at `seconds` into `outPath`. Extracts into a unique
 * temp file, verifies ffmpeg actually produced a frame (a seek at/past the
 * last frame exits 0 with no output), then renames into place so concurrent
 * requests never read a half-written jpg.
 */
export async function extractFrame(videoPath: string, seconds: number, outPath: string): Promise<void> {
  const tmpPath = path.join(path.dirname(outPath), `.tmp-${randomUUID()}-${path.basename(outPath)}`);
  await execFileAsync('ffmpeg', [
    '-ss',
    String(seconds),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    '-y',
    tmpPath,
  ]);
  const extracted = await stat(tmpPath).catch(() => null);
  if (!extracted || extracted.size === 0) {
    throw new Error(`ffmpeg produced no frame at ${seconds}s from ${videoPath}`);
  }
  await rename(tmpPath, outPath);
}
