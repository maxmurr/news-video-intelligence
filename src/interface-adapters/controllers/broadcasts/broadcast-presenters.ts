import type { BroadcastSummary, StoryCard } from '@/lib/broadcast-types';
import type { BroadcastAnalysis } from '@/src/application/use-cases/broadcasts/broadcast-analysis';

/** One story of the interactive newspaper: headline + frame merged by index. */
export function mergeStoryCards(analysis: BroadcastAnalysis): StoryCard[] {
  return analysis.headlines.map((item, i) => {
    const frame = analysis.frames[i] ?? null;
    return {
      headline: item.headline,
      summary: item.summary,
      startTime: item.startTime,
      endTime: item.endTime,
      frameUrl: frame?.frameUrl ?? null,
      frameReason: frame?.reason ?? null,
    };
  });
}

export function presentSummary(analysis: BroadcastAnalysis): BroadcastSummary {
  const { broadcast, stages, headlines, frames } = analysis;
  return {
    filename: broadcast.filename,
    url: broadcast.url,
    uploadedAt: broadcast.uploadedAt.toISOString(),
    stages,
    storyCount: headlines.length > 0 ? headlines.length : null,
    topHeadline: headlines[0]?.headline?.trim() || null,
    thumbnailUrl: frames[0]?.frameUrl ?? null,
  };
}
