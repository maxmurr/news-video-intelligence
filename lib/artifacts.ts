/**
 * Shared filesystem contract for the binary artifacts that stay on disk:
 * where uploads and extracted frames live, what an acceptable upload
 * filename looks like, and the upload guard protocol.
 */
import path from 'node:path';

export const PUBLIC_DIR = path.join(process.cwd(), 'public');
export const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');
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

/** Upload exceeded the byte cap mid-stream; nothing was persisted. */
export class UploadTooLargeError extends Error {}

/** Upload head failed validation (bad magic bytes or empty); nothing was persisted. */
export class UploadInvalidError extends Error {}

/**
 * Wraps an upload body so the byte cap and head check both abort mid-stream —
 * a too-large or non-matching upload errors the stream before the storage
 * adapter ever commits it, and the error aborts the source request body.
 */
export function guardUploadStream(
  source: ReadableStream<Uint8Array>,
  {
    maxBytes,
    headBytes = 12,
    validateHead,
  }: { maxBytes: number; headBytes?: number; validateHead: (head: Buffer) => boolean },
): ReadableStream<Uint8Array> {
  let total = 0;
  const headParts: Uint8Array[] = [];
  let headLen = 0;
  let validated = false;

  const validate = () => {
    if (total === 0 || !validateHead(Buffer.concat(headParts))) throw new UploadInvalidError();
    validated = true;
  };

  return source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength;
        if (total > maxBytes) throw new UploadTooLargeError();

        if (!validated) {
          headParts.push(chunk);
          headLen += chunk.byteLength;
          if (headLen >= headBytes) validate();
        }

        controller.enqueue(chunk);
      },
      flush() {
        if (!validated) validate();
      },
    }),
  );
}
