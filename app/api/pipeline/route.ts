import { start } from 'workflow/api';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { requestedFilename, UPLOADS_DIR } from '@/lib/artifacts';
import { writeRunRecord } from '@/lib/run-record';
import { runVideoPipeline } from '@/workflows/video-pipeline';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  // Fail here rather than 202-ing a run that will die on its first step.
  try {
    await access(path.join(UPLOADS_DIR, filename));
  } catch {
    return Response.json({ error: `File not found: ${filename}` }, { status: 404 });
  }

  let runId: string;
  try {
    ({ runId } = await start(runVideoPipeline, [filename]));
  } catch (error) {
    console.error(`Failed to start pipeline for ${filename}:`, error);
    await writeRunRecord(filename, null).catch(() => {});
    return Response.json({ error: 'The analysis pipeline failed to start. Try again.' }, { status: 502 });
  }

  try {
    await writeRunRecord(filename, runId);
  } catch (error) {
    console.error(`Failed to write run record for ${filename}:`, error);
  }

  return Response.json({ message: 'Video pipeline started', filename, runId }, { status: 202 });
}
