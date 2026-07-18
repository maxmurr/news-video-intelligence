import type { BroadcastStages } from '@/lib/broadcast-types';
import type { IFramesRepository } from '@/src/application/repositories/frames.repository.interface';
import type { IHeadlinesRepository } from '@/src/application/repositories/headlines.repository.interface';
import type { IStoriesRepository } from '@/src/application/repositories/stories.repository.interface';
import type { ITranscriptsRepository } from '@/src/application/repositories/transcripts.repository.interface';
import type { Broadcast } from '@/src/entities/models/broadcast';
import type { Frame } from '@/src/entities/models/frame';
import type { Headline } from '@/src/entities/models/headline';

export interface AnalysisRepositories {
  transcriptsRepository: ITranscriptsRepository;
  storiesRepository: IStoriesRepository;
  headlinesRepository: IHeadlinesRepository;
  framesRepository: IFramesRepository;
}

export interface BroadcastAnalysis {
  broadcast: Broadcast;
  stages: BroadcastStages;
  /** Full timestamped transcript text when transcription has finished; otherwise null. */
  transcript: string | null;
  headlines: Headline[];
  frames: Frame[];
}

/**
 * One query per child aggregate — the shared read behind every broadcast
 * view (stage flags, transcript, summaries, story cards). Stories are fetched
 * only for their existence bit.
 */
export async function loadBroadcastAnalysis(
  repositories: AnalysisRepositories,
  broadcast: Broadcast,
): Promise<BroadcastAnalysis> {
  const [transcript, stories, headlines, frames] = await Promise.all([
    repositories.transcriptsRepository.getTranscript(broadcast.id),
    repositories.storiesRepository.getStories(broadcast.id),
    repositories.headlinesRepository.getHeadlines(broadcast.id),
    repositories.framesRepository.getFrames(broadcast.id),
  ]);

  return {
    broadcast,
    stages: {
      transcript: transcript !== undefined,
      stories: stories.length > 0,
      headlines: headlines.length > 0,
      frames: frames.length > 0,
    },
    transcript: transcript?.text ?? null,
    headlines,
    frames,
  };
}
