/**
 * Wire contract shared between the /api/videos endpoints and the client
 * pages that render broadcast state. Types plus the few constants both
 * sides must agree on — this module is imported from server and client code.
 */

import { countTimestampedTranscriptLines } from '@/lib/timestamps';

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

/** Desk library/card row — omits video `url` so it never crosses the RSC→client boundary. */
export type DeskBroadcastRow = Omit<BroadcastSummary, 'url'>;

export function toDeskBroadcastRow(summary: BroadcastSummary): DeskBroadcastRow {
  return {
    id: summary.id,
    filename: summary.filename,
    uploadedAt: summary.uploadedAt,
    stages: summary.stages,
    storyCount: summary.storyCount,
    topHeadline: summary.topHeadline,
    thumbnailUrl: summary.thumbnailUrl,
  };
}

/** Slim broadcast fields the desk chat client needs for grounding UI. */
export interface ChatBroadcastOption {
  id: string;
  topHeadline: string | null;
  thumbnailUrl: string | null;
  /** True when the transcript stage is complete and Q&A can be grounded. */
  isAskReady: boolean;
}

export function toChatBroadcastOption(broadcast: BroadcastSummary): ChatBroadcastOption {
  return {
    id: broadcast.id,
    topHeadline: broadcast.topHeadline,
    thumbnailUrl: broadcast.thumbnailUrl,
    isAskReady: broadcast.stages.transcript,
  };
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
  /** Full timestamped transcript when available; null while pending or when omitted on the wire. */
  transcript: string | null;
  /**
   * Seekable transcript line count. Present even when `transcript` is omitted so
   * the tab badge does not require shipping the full body.
   */
  transcriptLineCount: number | null;
  run: BroadcastRun;
}

/**
 * RSC → client payload for `/v/[fileId]`: same shape as detail, but the
 * transcript body is always stripped (loaded when the transcript tab opens).
 */
export type BroadcastPageInitial = BroadcastDetail & { transcript: null };

export function toBroadcastPageInitial(detail: BroadcastDetail): BroadcastPageInitial {
  return { ...detail, transcript: null };
}

export function transcriptWireFields(
  transcript: string | null,
): Pick<BroadcastDetail, 'transcript' | 'transcriptLineCount'> {
  return {
    transcript,
    transcriptLineCount: transcript === null ? null : countTimestampedTranscriptLines(transcript),
  };
}
