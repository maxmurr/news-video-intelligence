import { requestedFilename } from '@/lib/artifacts';
import { extractFrames } from '@/lib/pipeline';
import { stageResponse } from '@/lib/stage-response';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file in uploads.' }, { status: 400 });
  }

  return stageResponse('X-Frames-Cache', () => extractFrames(filename));
}
