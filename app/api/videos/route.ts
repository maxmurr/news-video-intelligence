import { start } from 'workflow/api';
import { getInjection } from '@/di/container';
import { guardUploadStream, isValidBroadcastId, UploadInvalidError, UploadTooLargeError } from '@/lib/artifacts';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/broadcast-types';
import { unwrapFilesError, uploads } from '@/lib/files';
import { NotFoundError } from '@/src/entities/errors/common';
import { runVideoPipeline } from '@/workflows/video-pipeline';
import { randomUUID } from 'node:crypto';

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = params.get('id');

  if (!isValidBroadcastId(id)) {
    return Response.json({ error: 'Invalid broadcast id.' }, { status: 400 });
  }

  const broadcast = await getInjection('IGetBroadcastDetailController')(id);
  if (broadcast === null) {
    return Response.json({ error: `Broadcast not found: ${id}` }, { status: 404 });
  }

  // Pollers only need stages/stories/run — keep the transcript body off the wire
  // until the transcript tab (or another consumer) asks for the full detail.
  if (params.get('omitTranscript') === '1') {
    return Response.json({ ...broadcast, transcript: null });
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
  // resolves the row by id. Without the row the upload is invisible to the
  // DB-driven listing, so compensate by discarding the file.
  const url = filename;
  let broadcastId: string;
  try {
    ({ id: broadcastId } = await getInjection('ICreateBroadcastController')({ filename, url, size }));
  } catch (error) {
    console.error(`Failed to register broadcast for ${filename}:`, error);
    await uploads.delete(filename).catch(() => {});
    return Response.json({ error: 'Failed to register the upload. Try again.' }, { status: 500 });
  }

  // The upload is already persisted; a workflow-start failure must not turn a
  // successful upload into a 500 that hides the created broadcast. The run
  // row makes the failure visible to the broadcast page instead.
  let runId: string | null = null;
  try {
    ({ runId } = await start(runVideoPipeline, [broadcastId]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${broadcastId}:`, error);
  }
  try {
    await getInjection('ISaveRunController')({ broadcastId, runId });
  } catch (error) {
    console.error(`Failed to save run for ${broadcastId}:`, error);
  }

  return Response.json({ id: broadcastId, runId }, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get('id');

  if (!isValidBroadcastId(id)) {
    return Response.json({ error: 'Invalid broadcast id.' }, { status: 400 });
  }

  try {
    await getInjection('IDeleteBroadcastController')(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: `Broadcast not found: ${id}` }, { status: 404 });
    }
    throw error;
  }

  return Response.json({ id });
}
