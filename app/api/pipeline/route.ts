import { start } from 'workflow/api';
import { getInjection } from '@/di/container';
import { requestedBroadcastId } from '@/lib/artifacts';
import { uploads } from '@/lib/files';
import { NotFoundError } from '@/src/entities/errors/common';
import { runVideoPipeline } from '@/workflows/video-pipeline';

export async function POST(req: Request) {
  const id = await requestedBroadcastId(req);
  if (!id) {
    return Response.json({ error: 'Invalid broadcast id.' }, { status: 400 });
  }

  let filename: string;
  try {
    ({ filename } = await getInjection('IGetBroadcastByIdController')(id));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return Response.json({ error: `Broadcast not found: ${id}` }, { status: 404 });
    }
    throw error;
  }

  // The row is authoritative, but the pipeline still needs the binary.
  // Fail here rather than 202-ing a run that will die on its first step.
  if (!(await uploads.exists(filename))) {
    return Response.json({ error: `Video file missing for broadcast ${id}` }, { status: 404 });
  }

  let runId: string;
  try {
    ({ runId } = await start(runVideoPipeline, [id]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${id}:`, error);
    await getInjection('ISaveRunController')({ broadcastId: id, runId: null }).catch(() => {});
    return Response.json({ error: 'The analysis pipeline failed to start. Try again.' }, { status: 502 });
  }

  try {
    await getInjection('ISaveRunController')({ broadcastId: id, runId });
  } catch (error) {
    console.error(`Failed to save run for ${id}:`, error);
  }

  return Response.json({ message: 'Video pipeline started', id, runId }, { status: 202 });
}
