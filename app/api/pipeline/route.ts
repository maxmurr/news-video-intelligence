import { start } from 'workflow/api';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { requestedFilename, UPLOADS_DIR } from '@/lib/artifacts';
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

  const run = await start(runVideoPipeline, [filename]);

  return Response.json({ message: 'Video pipeline started', filename, runId: run.runId }, { status: 202 });
}
