import type { BroadcastSummary, StoryCard } from '@/lib/broadcast-types';
import { uploads } from '@/lib/files';
import type { BroadcastAnalysis } from '@/src/application/use-cases/broadcasts/broadcast-analysis';

/**
 * One story of the interactive newspaper: headline + frame merged by index.
 * Frame keys are presigned here so the private bucket serves them for the
 * lifetime of the URL.
 */
export function mergeStoryCards(analysis: BroadcastAnalysis): Promise<StoryCard[]> {
  return Promise.all(
    analysis.headlines.map(async (item, i) => {
      const frame = analysis.frames[i] ?? null;
      return {
        headline: item.headline,
        summary: item.summary,
        startTime: item.startTime,
        endTime: item.endTime,
        frameUrl: frame ? await uploads.url(frame.frameUrl) : null,
        frameReason: frame?.reason ?? null,
      };
    }),
  );
}

export async function presentSummary(analysis: BroadcastAnalysis): Promise<BroadcastSummary> {
  const { broadcast, stages, headlines, frames } = analysis;
  const thumbnailKey = frames[0]?.frameUrl ?? null;
  return {
    filename: broadcast.filename,
    url: await uploads.url(broadcast.url),
    uploadedAt: broadcast.uploadedAt.toISOString(),
    stages,
    storyCount: headlines.length > 0 ? headlines.length : null,
    topHeadline: headlines[0]?.headline?.trim() || null,
    thumbnailUrl: thumbnailKey ? await uploads.url(thumbnailKey) : null,
  };
}
