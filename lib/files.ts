/**
 * Storage client for the binary artifacts — uploaded broadcast videos and the
 * frames extracted from them — backed by files-sdk over an S3-compatible
 * bucket. Videos live at the bucket root keyed by their upload filename; frames
 * live under a `frames/<broadcast>/` prefix. The bucket is private, so callers
 * store the object key and mint a short-lived presigned URL at read time via
 * `uploads.url(key)`.
 */
import 'server-only';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { createFiles, FilesError } from 'files-sdk';
import { s3 } from 'files-sdk/s3';

export const FRAMES_PREFIX = 'frames';

// The adapter is constructed at import time — which includes `next build`, when
// the deploy env isn't present yet — so every field falls back to a harmless
// placeholder. Presigning is a local signing operation (no network), so real
// reads/writes still fail loudly at call time if the runtime env is missing.
const adapter = s3({
  bucket: process.env.S3_BUCKET ?? 'bucket',
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  // Local rustfs and older buckets need path-style (`host/bucket/key`); newer
  // virtual-hosted buckets (`bucket.host/key`) want it off. Default on for the
  // docker-compose setup; set S3_FORCE_PATH_STYLE=false where the bucket is
  // virtual-hosted.
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'placeholder',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'placeholder',
  },
});

export const uploads = createFiles({ adapter });

/** Streams a stored object down to a local path so path-based tools (ffmpeg) can read it. */
export async function downloadToFile(key: string, destPath: string): Promise<void> {
  const file = await uploads.download(key);
  await pipeline(Readable.fromWeb(file.stream() as NodeWebReadableStream), createWriteStream(destPath));
}

/**
 * The adapter wraps every failure in a FilesError, including errors our own
 * guarded request stream raised mid-upload. Surfaces the original error so
 * routes can map validation failures to status codes.
 */
export function unwrapFilesError(error: unknown): unknown {
  return error instanceof FilesError && error.cause !== undefined ? error.cause : error;
}
