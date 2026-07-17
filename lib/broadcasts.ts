/**
 * Read-side view over the pipeline artifacts: which uploads exist, how far
 * each one has progressed, and the merged headline+frame story cards the
 * newspaper page renders. Never triggers generation — reading a broadcast
 * that is mid-pipeline just reports the stages that exist so far.
 */
import 'server-only';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { isValidUploadFilename, readArtifactJson, UPLOADS_DIR } from './artifacts';
import type { BroadcastDetail, BroadcastStages, BroadcastSummary, StoryCard } from './broadcast-types';
import { framesPath, headlinesPath, storiesPath, transcriptPath } from './pipeline';
import {
  framesFileSchema,
  headlinesFileSchema,
  type FrameItem,
  type FramesFile,
  type HeadlineItem,
  type HeadlinesFile,
} from './schemas';

async function artifactExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

interface BroadcastArtifacts {
  stages: BroadcastStages;
  headlinesFile: HeadlinesFile | null;
  framesFile: FramesFile | null;
}

/**
 * One read per artifact: stage flags for the cheap text artifacts come from a
 * stat, and the two JSON artifacts the UI renders are parsed exactly once and
 * shared by every consumer (stage flags, summary, story cards).
 */
async function readBroadcastArtifacts(filename: string): Promise<BroadcastArtifacts> {
  const [transcript, stories, headlinesFile, framesFile] = await Promise.all([
    artifactExists(transcriptPath(filename)),
    artifactExists(storiesPath(filename)),
    readArtifactJson(headlinesPath(filename), headlinesFileSchema),
    readArtifactJson(framesPath(filename), framesFileSchema),
  ]);
  return {
    stages: {
      transcript,
      stories,
      headlines: headlinesFile !== null,
      frames: framesFile !== null,
    },
    headlinesFile,
    framesFile,
  };
}

function mergeStories(headlines: HeadlineItem[], frames: FrameItem[] | null): StoryCard[] {
  return headlines.map((item, i) => {
    const frame = frames?.[i] ?? null;
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

function summaryFrom(filename: string, uploadedAt: Date, artifacts: BroadcastArtifacts): BroadcastSummary {
  const headlines = artifacts.headlinesFile?.items ?? [];
  return {
    filename,
    url: `/uploads/${filename}`,
    uploadedAt: uploadedAt.toISOString(),
    stages: artifacts.stages,
    storyCount: headlines.length > 0 ? headlines.length : null,
    topHeadline: headlines[0]?.headline?.trim() || null,
    thumbnailUrl: artifacts.framesFile?.items[0]?.frameUrl ?? null,
  };
}

export async function listBroadcasts(): Promise<BroadcastSummary[]> {
  let entries: string[];
  try {
    entries = await readdir(UPLOADS_DIR);
  } catch {
    return [];
  }

  // The strict filename check keeps the listing consistent with every route:
  // a stray file in uploads that routes would reject must not become a card.
  const uploads = entries.filter(isValidUploadFilename);
  const summaries = await Promise.all(
    uploads.map(async filename => {
      const [statResult, artifacts] = await Promise.all([
        stat(path.join(UPLOADS_DIR, filename)).catch(() => null),
        readBroadcastArtifacts(filename),
      ]);
      // Deleted between readdir and stat — skip it rather than failing the listing.
      if (statResult === null) return null;
      return summaryFrom(filename, statResult.mtime, artifacts);
    }),
  );

  return summaries
    .filter((summary): summary is BroadcastSummary => summary !== null)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/** Full detail for one broadcast, or null when the upload doesn't exist. */
export async function getBroadcast(filename: string): Promise<BroadcastDetail | null> {
  const [statResult, artifacts] = await Promise.all([
    stat(path.join(UPLOADS_DIR, filename)).catch(() => null),
    readBroadcastArtifacts(filename),
  ]);
  if (statResult === null) return null;
  const uploadedAt = statResult.mtime;

  return {
    ...summaryFrom(filename, uploadedAt, artifacts),
    stories: artifacts.headlinesFile
      ? mergeStories(artifacts.headlinesFile.items, artifacts.framesFile?.items ?? null)
      : [],
  };
}
