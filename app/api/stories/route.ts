import { requestedFilename } from '@/lib/artifacts';
import { detectStories } from '@/lib/pipeline';
import { stageResponse } from '@/lib/stage-response';

export async function POST(req: Request) {
  const filename = await requestedFilename(req);
  if (!filename) {
    return Response.json({ error: 'Invalid filename. Expected a .mp4 file with a transcript.' }, { status: 400 });
  }

  return stageResponse('X-Stories-Cache', () => detectStories(filename));
}
