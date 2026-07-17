import { start } from 'workflow/api';
import {
  isValidUploadFilename,
  streamUploadAtomic,
  UPLOADS_DIR,
  UploadInvalidError,
  UploadTooLargeError,
} from '@/lib/artifacts';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/broadcast-types';
import { getBroadcast, listBroadcasts } from '@/lib/broadcasts';
import { writeRunRecord } from '@/lib/run-record';
import { runVideoPipeline } from '@/workflows/video-pipeline';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export async function GET(req: Request) {
  const filename = new URL(req.url).searchParams.get('filename');

  if (filename === null) {
    return Response.json({ broadcasts: await listBroadcasts() });
  }

  if (!isValidUploadFilename(filename)) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  const broadcast = await getBroadcast(filename);
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
  let size: number;
  try {
    size = await streamUploadAtomic(path.join(UPLOADS_DIR, filename), req.body, {
      maxBytes: MAX_UPLOAD_BYTES,
      validateHead: isMp4,
    });
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return Response.json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB.` }, { status: 413 });
    }
    if (error instanceof UploadInvalidError) {
      return Response.json({ error: 'Only MP4 video files are accepted.' }, { status: 415 });
    }
    throw error;
  }

  // The upload is already persisted; a workflow-start failure must not turn a
  // successful upload into a 500 that hides the generated filename. The run
  // record makes the failure visible to the broadcast page instead.
  let runId: string | null = null;
  try {
    ({ runId } = await start(runVideoPipeline, [filename]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${filename}:`, error);
  }
  try {
    await writeRunRecord(filename, runId);
  } catch (error) {
    console.error(`Failed to write run record for ${filename}:`, error);
  }

  return Response.json(
    {
      filename,
      url: `/uploads/${filename}`,
      size,
      runId,
    },
    { status: 201 },
  );
}
