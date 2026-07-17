import { start } from 'workflow/api';
import { isValidUploadFilename, UPLOADS_DIR, writeArtifactAtomic } from '@/lib/artifacts';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/broadcast-types';
import { getBroadcast, listBroadcasts } from '@/lib/broadcasts';
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
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart/form-data with a "file" field.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing "file" field.' }, { status: 400 });
  }

  if (file.size === 0) {
    return Response.json({ error: 'File is empty.' }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: `File too large. Max ${MAX_UPLOAD_MB}MB.` }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isMp4(bytes)) {
    return Response.json({ error: 'Only MP4 video files are accepted.' }, { status: 415 });
  }

  const filename = `${randomUUID()}.mp4`;
  await writeArtifactAtomic(path.join(UPLOADS_DIR, filename), bytes);

  // The upload is already persisted; a workflow-start failure must not turn a
  // successful upload into a 500 that hides the generated filename.
  let runId: string | null = null;
  try {
    ({ runId } = await start(runVideoPipeline, [filename]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${filename}:`, error);
  }

  return Response.json(
    {
      filename,
      url: `/uploads/${filename}`,
      size: file.size,
      runId,
    },
    { status: 201 },
  );
}
