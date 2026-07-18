import { FatalError } from 'workflow';
import { getInjection } from '@/di/container';
import { InputParseError, NotFoundError } from '@/src/entities/errors/common';

export async function runVideoPipeline(broadcastId: string) {
  'use workflow';

  const transcribe = await transcribeStep(broadcastId);
  // Embedding needs only the transcript and feeds nothing downstream, so it
  // overlaps story detection instead of adding serial latency.
  const [embed, stories] = await Promise.all([embedStep(broadcastId), storiesStep(broadcastId)]);
  const headlines = await headlinesStep(broadcastId);
  const frames = await framesStep(broadcastId);

  return { broadcastId, transcribe, embed, stories, headlines, frames };
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

async function transcribeStep(broadcastId: string) {
  'use step';

  const { cached } = await guarded(() => getInjection('ITranscribeBroadcastController')(broadcastId));
  return { cached };
}

async function embedStep(broadcastId: string) {
  'use step';

  const { cached, count } = await guarded(() => getInjection('IEmbedTranscriptController')(broadcastId));
  return { cached, count };
}

async function storiesStep(broadcastId: string) {
  'use step';

  const { cached, stories } = await guarded(() => getInjection('IDetectStoriesController')(broadcastId));
  return { cached, count: stories.length };
}

async function headlinesStep(broadcastId: string) {
  'use step';

  const { cached, items } = await guarded(() => getInjection('IGenerateHeadlinesController')(broadcastId));
  return { cached, count: items.length };
}

async function framesStep(broadcastId: string) {
  'use step';

  const { cached, items } = await guarded(() => getInjection('IExtractFramesController')(broadcastId));
  return { cached, count: items.length };
}
