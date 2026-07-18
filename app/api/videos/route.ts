import { start } from 'workflow/api';
import { getInjection } from '@/di/container';
import { guardUploadStream, isValidUploadFilename, UploadInvalidError, UploadTooLargeError } from '@/lib/artifacts';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/broadcast-types';
import { unwrapFilesError, uploads } from '@/lib/files';
import { NotFoundError } from '@/src/entities/errors/common';
import { runVideoPipeline } from '@/workflows/video-pipeline';
import { randomUUID } from 'node:crypto';

export async function GET(req: Request) {
  const filename = new URL(req.url).searchParams.get('filename');

  if (filename === null) {
    return Response.json({ broadcasts: await getInjection('IGetBroadcastSummariesController')() });
  }

  if (!isValidUploadFilename(filename)) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  const broadcast = await getInjection('IGetBroadcastDetailController')(filename);
  if (broadcast === null) {
    return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
  }

  return Response.json(broadcast);
}

/** MP4 files carry an "ftyp" box marker at byte offset 4. */
function isMp4(bytes: Buffer): boolean {
  return bytes.length > 8 && bytes.subarray(4, 8).toString('ascii') === 'ftyp';
}

export async function POST(req: Request) {
  if (req.body === null) {
    return Response.json({ error: 'Expected a video request body.' }, { status: 400 });
  }

  const declaredLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return Response.json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB.` }, { status: 413 });
  }

  const filename = `${randomUUID()}.mp4`;
  const guarded = guardUploadStream(req.body, { maxBytes: MAX_UPLOAD_BYTES, validateHead: isMp4 });
  let size: number;
  try {
    ({ size } = await uploads.upload(filename, guarded, { contentType: 'video/mp4' }));
  } catch (error) {
    const cause = unwrapFilesError(error);
    if (cause instanceof UploadTooLargeError) {
      return Response.json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB.` }, { status: 413 });
    }
    if (cause instanceof UploadInvalidError) {
      return Response.json({ error: 'Only MP4 video files are accepted.' }, { status: 415 });
    }
    throw error;
  }

  // The broadcast row must exist before the workflow starts — its first step
  // resolves the row by filename. Without the row the upload is invisible to
  // the DB-driven listing, so compensate by discarding the file.
  const url = `/uploads/${filename}`;
  let broadcastId: string;
  try {
    ({ id: broadcastId } = await getInjection('ICreateBroadcastController')({ filename, url, size }));
  } catch (error) {
    console.error(`Failed to register broadcast for ${filename}:`, error);
    await uploads.delete(filename).catch(() => {});
    return Response.json({ error: 'Failed to register the upload. Try again.' }, { status: 500 });
  }

  // The upload is already persisted; a workflow-start failure must not turn a
  // successful upload into a 500 that hides the generated filename. The run
  // row makes the failure visible to the broadcast page instead.
  let runId: string | null = null;
  try {
    ({ runId } = await start(runVideoPipeline, [filename]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${filename}:`, error);
  }
  try {
    await getInjection('ISaveRunController')({ broadcastId, runId });
  } catch (error) {
    console.error(`Failed to save run for ${filename}:`, error);
  }

  return Response.json({ filename, url, size, runId }, { status: 201 });
}

/**
 * Removes a broadcast and everything derived from it: the row (child stages
 * cascade in SQLite) plus the uploaded video and extracted frames on disk.
 */
export async function DELETE(req: Request) {
  const filename = new URL(req.url).searchParams.get('filename');

  if (!isValidUploadFilename(filename)) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  try {
    const broadcast = await getInjection('IGetBroadcastByFilenameController')(filename);
    await getInjection('IDeleteBroadcastController')(broadcast.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
    }
    throw error;
  }

  return Response.json({ filename });
}
