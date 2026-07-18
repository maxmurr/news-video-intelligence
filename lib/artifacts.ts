/**
 * Shared contract for uploaded broadcast videos: what an acceptable broadcast
 * id looks like and the upload guard protocol. The binaries themselves live in
 * the object bucket (see `lib/files.ts`); `PUBLIC_DIR` remains only for the
 * local-fixture eval harness.
 */
import path from 'node:path';

export const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * Public broadcast identifier: the nanoid primary key. No dot, so legacy
 * `{uuid}.mp4` URLs and params fail validation and 404 naturally. Bounded
 * length rather than exactly nanoid's 21 to avoid coupling to its default.
 */
const BROADCAST_ID_PATTERN = /^[\w-]{10,40}$/;

export function isValidBroadcastId(value: unknown): value is string {
  return typeof value === 'string' && BROADCAST_ID_PATTERN.test(value);
}

/**
 * Parses the request body and returns a validated broadcast id, or null when
 * the body is malformed JSON or the id fails validation.
 */
export async function requestedBroadcastId(req: Request): Promise<string | null> {
  let id: unknown;
  try {
    ({ id } = (await req.json()) as { id?: unknown });
  } catch {
    return null;
  }
  return isValidBroadcastId(id) ? id : null;
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
