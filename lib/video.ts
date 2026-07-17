/**
 * ffmpeg/ffprobe helpers shared by the frames route and the evals, so the
 * probe/extract invocations live in one place.
 */
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, rename, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

async function transcodeToBuffer(videoPath: string, suffix: string, args: string[]): Promise<Buffer> {
  const outPath = path.join(tmpdir(), `${randomUUID()}${suffix}`);
  try {
    await execFileAsync('ffmpeg', ['-i', videoPath, ...args, '-y', outPath]);
    return await readFile(outPath);
  } finally {
    await unlink(outPath).catch(() => {});
  }
}

/**
 * Transcription only needs the audio track, so we drop the video and downmix
 * to 16 kHz mono — the standard speech-recognition input. This turns a
 * hundreds-of-MB video into a few MB of audio that fits inline in one model
 * request, where the raw video would exceed the gateway's body limit.
 */
export async function extractSpeechAudio(videoPath: string): Promise<Buffer> {
  return transcodeToBuffer(videoPath, '.mp3', ['-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k']);
}

/**
 * Frame picking needs to see the footage but not at full fidelity: the model
 * returns a timestamp, and the actual frame is later cut from the original via
 * extractFrame. A 360p, 1 fps, silent proxy is enough for the model to reason
 * about the timeline (Gemini samples video at ~1 fps regardless) while staying
 * small enough to send inline. Timestamps map 1:1 back to the original.
 */
export async function createFramePreview(videoPath: string): Promise<Buffer> {
  return transcodeToBuffer(videoPath, '.mp4', [
    '-an',
    '-vf',
    'scale=-2:360,fps=1',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '32',
    '-movflags',
    '+faststart',
  ]);
}
