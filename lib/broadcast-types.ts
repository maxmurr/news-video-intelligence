/**
 * Wire contract shared between the /api/videos endpoints and the client
 * pages that render broadcast state. Types plus the few constants both
 * sides must agree on — this module is imported from server and client code.
 */

export const PIPELINE_STAGES = ['transcript', 'stories', 'headlines', 'frames'] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type BroadcastStages = Record<PipelineStage, boolean>;

/** Upload size cap enforced by the server (413) and mirrored by the dropzone. */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

/** Single owner of "is this broadcast fully analyzed" for every consumer. */
export function isPipelineComplete(stages: BroadcastStages): boolean {
  return PIPELINE_STAGES.every(stage => stages[stage]);
}

export interface BroadcastSummary {
  id: string;
  /** Internal storage key; kept on the wire for display (short id, exports). */
  filename: string;
  url: string;
  uploadedAt: string;
  stages: BroadcastStages;
  storyCount: number | null;
  /** First extracted headline when headlines exist; otherwise null. */
  topHeadline: string | null;
  thumbnailUrl: string | null;
}

/** One story of the interactive newspaper: headline + frame merged by index. */
export interface StoryCard {
  headline: string;
  summary: string;
  startTime: string;
  endTime: string;
  frameUrl: string | null;
  frameReason: string | null;
}

/**
 * Health of the workflow run behind an incomplete pipeline. The first five
 * come from the workflow engine; `not-started` means the start call failed
 * after upload; `unknown` means no run record exists or the engine could not
 * be queried, so the client must fall back to progress-based heuristics.
 */
export type BroadcastRunStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'not-started' | 'unknown';

export interface BroadcastRun {
  status: BroadcastRunStatus;
  /** When the most recent start attempt happened; null when never attempted. */
  startedAt: string | null;
}

export interface BroadcastDetail extends BroadcastSummary {
  stories: StoryCard[];
  /** Full timestamped transcript when available; null while transcription is pending. */
  transcript: string | null;
  run: BroadcastRun;
}
