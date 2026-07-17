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

export interface BroadcastDetail extends BroadcastSummary {
  stories: StoryCard[];
}
