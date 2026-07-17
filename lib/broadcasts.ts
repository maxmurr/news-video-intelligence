/**
 * Read-side view over the analysis data: which broadcasts exist, how far
 * each one's pipeline has progressed, and the merged headline+frame story
 * cards the newspaper page renders. Composes the clean-architecture
 * controllers into the wire contract from broadcast-types. Never triggers
 * generation — reading a broadcast that is mid-pipeline just reports the
 * stages that exist so far.
 */
import 'server-only';
import { getRun } from 'workflow/api';
import { getInjection } from '@/di/container';
import { NotFoundError } from '@/src/entities/errors/common';
import {
  isPipelineComplete,
  type BroadcastDetail,
  type BroadcastRun,
  type BroadcastStages,
  type BroadcastSummary,
  type StoryCard,
} from './broadcast-types';

/**
 * One query per child aggregate, shared by every consumer (stage flags,
 * summary, story cards, run health). The transcript is fetched only for its
 * existence — a dedicated has-transcript read is not worth a use case yet.
 */
async function loadChildren(broadcastId: string) {
  const [transcript, stories, headlines, frames, run] = await Promise.all([
    getInjection('IGetTranscriptController')(broadcastId),
    getInjection('IGetStoriesController')(broadcastId),
    getInjection('IGetHeadlinesController')(broadcastId),
    getInjection('IGetFramesController')(broadcastId),
    getInjection('IGetRunController')(broadcastId),
  ]);

  const stages: BroadcastStages = {
    transcript: transcript !== null,
    stories: stories.length > 0,
    headlines: headlines.length > 0,
    frames: frames.length > 0,
  };

  return { stages, headlines, frames, run };
}

type BroadcastChildren = Awaited<ReturnType<typeof loadChildren>>;

interface BroadcastRow {
  filename: string;
  url: string;
  uploadedAt: string;
}

function mergeStories(headlines: BroadcastChildren['headlines'], frames: BroadcastChildren['frames']): StoryCard[] {
  return headlines.map((item, i) => {
    const frame = frames[i] ?? null;
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

function summaryFrom(broadcast: BroadcastRow, children: BroadcastChildren): BroadcastSummary {
  const { headlines, frames } = children;
  return {
    filename: broadcast.filename,
    url: broadcast.url,
    uploadedAt: broadcast.uploadedAt,
    stages: children.stages,
    storyCount: headlines.length > 0 ? headlines.length : null,
    topHeadline: headlines[0]?.headline?.trim() || null,
    thumbnailUrl: frames[0]?.frameUrl ?? null,
  };
}

export async function listBroadcasts(): Promise<BroadcastSummary[]> {
  const broadcasts = await getInjection('IGetBroadcastsController')();
  const summaries = await Promise.all(
    broadcasts.map(async broadcast => summaryFrom(broadcast, await loadChildren(broadcast.id))),
  );
  return summaries.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/**
 * Health of the run behind an incomplete pipeline. A complete pipeline never
 * queries the engine — the stored stages are the proof. A missing run row
 * predates run tracking, and an engine query failure must not break the read
 * side, so both degrade to `unknown` rather than throwing.
 */
async function resolveRun(stages: BroadcastStages, runRow: BroadcastChildren['run']): Promise<BroadcastRun> {
  if (isPipelineComplete(stages)) return { status: 'completed', startedAt: null };

  if (runRow === null) return { status: 'unknown', startedAt: null };
  if (runRow.runId === null) return { status: 'not-started', startedAt: runRow.startedAt };

  try {
    const status = await getRun(runRow.runId).status;
    return { status, startedAt: runRow.startedAt };
  } catch {
    return { status: 'unknown', startedAt: runRow.startedAt };
  }
}

/** Full detail for one broadcast, or null when it doesn't exist. */
export async function getBroadcast(filename: string): Promise<BroadcastDetail | null> {
  let broadcast;
  try {
    broadcast = await getInjection('IGetBroadcastByFilenameController')(filename);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }

  const children = await loadChildren(broadcast.id);

  return {
    ...summaryFrom(broadcast, children),
    stories: mergeStories(children.headlines, children.frames),
    run: await resolveRun(children.stages, children.run),
  };
}
