import { FatalError } from 'workflow';
import { detectStories, extractFrames, generateHeadlines, PipelineError, transcribeVideo } from '@/lib/pipeline';

/**
 * Durable news-video pipeline: transcribe -> stories -> headlines -> frames.
 * Steps run on separate requests and retry on failure; each stage is
 * cache-aware, so a retry after a partial failure skips the work already
 * persisted. Every step reads its inputs from disk, so nothing large is
 * threaded through the workflow — steps return only summaries.
 */
export async function runVideoPipeline(filename: string) {
  'use workflow';

  const transcribe = await transcribeStep(filename);
  const stories = await storiesStep(filename);
  const headlines = await headlinesStep(filename);
  const frames = await framesStep(filename);

  return { filename, transcribe, stories, headlines, frames };
}

/**
 * A precondition failure (missing input, malformed artifact) is deterministic:
 * retrying reruns the same broken state. Convert it to a FatalError so the step
 * fails fast instead of burning retries. Operational errors propagate as-is and
 * stay retryable.
 */
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof PipelineError) throw new FatalError(error.message);
    throw error;
  }
}

async function transcribeStep(filename: string) {
  'use step';

  const { cached } = await guarded(() => transcribeVideo(filename));
  return { cached };
}

async function storiesStep(filename: string) {
  'use step';

  const { data, cached } = await guarded(() => detectStories(filename));
  return { cached, count: data.stories.length };
}

async function headlinesStep(filename: string) {
  'use step';

  const { data, cached } = await guarded(() => generateHeadlines(filename));
  return { cached, count: data.items.length };
}

async function framesStep(filename: string) {
  'use step';

  const { data, cached } = await guarded(() => extractFrames(filename));
  return { cached, count: data.items.length };
}
