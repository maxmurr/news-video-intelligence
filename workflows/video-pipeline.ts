import { FatalError } from 'workflow';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

export async function runVideoPipeline(filename: string) {
  'use workflow';

  const transcribe = await transcribeStep(filename);
  const stories = await storiesStep(filename);
  const headlines = await headlinesStep(filename);
  const frames = await framesStep(filename);

  return { filename, transcribe, stories, headlines, frames };
}

/**
 * Precondition and validation failures are deterministic — the same input
 * would fail again — so they surface as FatalError (no retry). Operational
 * failures (model calls, ffmpeg) stay plain Errors and remain retryable.
 */
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof InputParseError) throw new FatalError(error.message);
    throw error;
  }
}

async function transcribeStep(filename: string) {
  'use step';

  const { cached } = await guarded(() => getInjection('ITranscribeBroadcastController')(filename));
  return { cached };
}

async function storiesStep(filename: string) {
  'use step';

  const { cached, stories } = await guarded(() => getInjection('IDetectStoriesController')(filename));
  return { cached, count: stories.length };
}

async function headlinesStep(filename: string) {
  'use step';

  const { cached, items } = await guarded(() => getInjection('IGenerateHeadlinesController')(filename));
  return { cached, count: items.length };
}

async function framesStep(filename: string) {
  'use step';

  const { cached, items } = await guarded(() => getInjection('IExtractFramesController')(filename));
  return { cached, count: items.length };
}
