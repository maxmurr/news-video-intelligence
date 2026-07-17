/**
 * Shared filesystem contract for pipeline artifacts: where each stage's
 * files live, what an acceptable upload filename looks like, and the
 * cache-read / atomic-write protocol every stage uses.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';

export const PUBLIC_DIR = path.join(process.cwd(), 'public');
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
export const TRANSCRIPTS_DIR = path.join(PUBLIC_DIR, 'transcripts');
export const STORIES_DIR = path.join(PUBLIC_DIR, 'stories');
export const HEADLINES_DIR = path.join(PUBLIC_DIR, 'headlines');
export const FRAMES_DIR = path.join(PUBLIC_DIR, 'frames');

/**
 * Security boundary for every route that touches public/uploads: word
 * characters and dashes only, so no dots, slashes, or traversal segments.
 */
const FILENAME_PATTERN = /^[\w-]+\.mp4$/;

export function isValidUploadFilename(value: unknown): value is string {
  return typeof value === 'string' && FILENAME_PATTERN.test(value);
}

/**
 * Parses the request body and returns a validated upload filename, or null
 * when the body is malformed JSON or the filename fails validation.
 */
export async function requestedFilename(req: Request): Promise<string | null> {
  let filename: unknown;
  try {
    ({ filename } = (await req.json()) as { filename?: unknown });
  } catch {
    return null;
  }
  return isValidUploadFilename(filename) ? filename : null;
}

/** Reads a cached artifact, or returns null when it doesn't exist yet. */
export async function readCachedArtifact(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

/** Parses and validates a stored artifact, or returns null when it is malformed. */
export function parseCachedArtifact<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Reads and validates a JSON artifact, or returns null when it doesn't exist
 * yet or is malformed. Callers that must tell those cases apart compose
 * readCachedArtifact + parseCachedArtifact instead.
 */
export async function readArtifactJson<T>(filePath: string, schema: z.ZodType<T>): Promise<T | null> {
  const raw = await readCachedArtifact(filePath);
  if (raw === null) return null;
  return parseCachedArtifact(raw, schema);
}

/**
 * Atomic write: unique temp file in the same directory + rename, so a
 * concurrent request never reads a half-written file as a cache hit and
 * concurrent writers never clobber each other's temp files.
 */
export async function writeArtifactAtomic(filePath: string, body: string | Buffer): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tmpPath, body);
  await rename(tmpPath, filePath);
}
