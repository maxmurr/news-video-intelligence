import { start } from 'workflow/api';
import { getInjection } from '@/di/container';
import { requestedFilename } from '@/lib/artifacts';
import { uploads } from '@/lib/files';
import { NotFoundError } from '@/src/entities/errors/common';
import { runVideoPipeline } from '@/workflows/video-pipeline';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  let broadcastId: string;
  try {
    ({ id: broadcastId } = await getInjection('IGetBroadcastByFilenameController')(filename));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
    }
    throw error;
  }

  // The row is authoritative, but the pipeline still needs the binary.
  // Fail here rather than 202-ing a run that will die on its first step.
  if (!(await uploads.exists(filename))) {
    return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
  }

  let runId: string;
  try {
    ({ runId } = await start(runVideoPipeline, [filename]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${filename}:`, error);
    await getInjection('ISaveRunController')({ broadcastId, runId: null }).catch(() => {});
    return Response.json({ error: 'The analysis pipeline failed to start. Try again.' }, { status: 502 });
  }

  try {
    await getInjection('ISaveRunController')({ broadcastId, runId });
  } catch (error) {
    console.error(`Failed to save run for ${filename}:`, error);
  }

  return Response.json({ message: 'Video pipeline started', filename, runId }, { status: 202 });
}
