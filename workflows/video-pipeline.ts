import { FatalError } from 'workflow';
import { detectStories, extractFrames, generateHeadlines, PipelineError, transcribeVideo } from '@/lib/pipeline';

export async function runVideoPipeline(filename: string) {
  'use workflow';

  const transcribe = await transcribeStep(filename);
  const stories = await storiesStep(filename);
  const headlines = await headlinesStep(filename);
  const frames = await framesStep(filename);

  return { filename, transcribe, stories, headlines, frames };
}

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
