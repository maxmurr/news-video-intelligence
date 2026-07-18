/**
 * Turns a timestamped transcript into overlapping retrieval windows. Each chunk
 * spans ~35s of speech and re-includes ~10s of the previous window, so a
 * sentence split across a boundary survives whole in at least one chunk. A hard
 * token cap force-closes a window when speech is dense, keeping every chunk
 * within a size the embedding model handles well.
 *
 * Timestamps are already stripped by `parseTranscriptLines` (its `text` holds
 * the words after the leading MM:SS), so the emitted `content` is clean speech
 * and the span lives in `startTime`/`endTime`.
 */
import { parseTranscriptLines, secondsToTimestamp } from '@/lib/timestamps';

export const CHUNKING = {
  targetWindowSeconds: 35,
  overlapSeconds: 10,
  maxTokens: 512,
} as const;

export interface TranscriptChunkDraft {
  idx: number;
  startTime: string;
  endTime: string;
  content: string;
  tokenCount: number;
}

/** Cheap upper-bound estimate; exact tokenization isn't needed for a size cap. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface AnchoredLine {
  seconds: number;
  timestamp: string;
  text: string;
}

/**
 * Continuation lines (speaker turns without their own timestamp) inherit the
 * time of the last timestamped line, so every line has a seconds anchor for
 * windowing and a timestamp for the span.
 */
function anchorLines(transcript: string): AnchoredLine[] {
  let seconds = 0;
  let timestamp = secondsToTimestamp(0);
  return parseTranscriptLines(transcript).map(line => {
    if (line.seconds !== null && line.timestamp !== null) {
      seconds = line.seconds;
      timestamp = line.timestamp;
    }
    return { seconds, timestamp, text: line.text };
  });
}

function firstIndexAtOrAfter(lines: AnchoredLine[], fromExclusive: number, seconds: number, fallback: number): number {
  for (let i = fromExclusive; i < lines.length; i++) {
    if (lines[i].seconds >= seconds) return i;
  }
  return fallback;
}

export function chunkTranscript(transcript: string): TranscriptChunkDraft[] {
  const lines = anchorLines(transcript);
  if (lines.length === 0) return [];

  const chunks: TranscriptChunkDraft[] = [];
  let start = 0;

  while (start < lines.length) {
    const windowStartSec = lines[start].seconds;
    let end = start + 1;
    let content = lines[start].text;

    while (end < lines.length) {
      const next = lines[end];
      const withinWindow = next.seconds - windowStartSec < CHUNKING.targetWindowSeconds;
      const candidate = content ? `${content} ${next.text}` : next.text;
      const withinTokens = estimateTokens(candidate) <= CHUNKING.maxTokens;
      if (!withinWindow || !withinTokens) break;
      content = candidate;
      end++;
    }

    const text = content.trim();
    if (text.length > 0) {
      chunks.push({
        idx: chunks.length,
        startTime: lines[start].timestamp,
        endTime: lines[end - 1].timestamp,
        content: text,
        tokenCount: estimateTokens(text),
      });
    }

    // Advance so each window drops (target − overlap) of lead time, but never
    // past the last line this window consumed (no gap) and never zero lines (no
    // infinite loop when a token cap keeps windows short).
    const advanceSec = windowStartSec + (CHUNKING.targetWindowSeconds - CHUNKING.overlapSeconds);
    const nextStart = firstIndexAtOrAfter(lines, start + 1, advanceSec, end);
    start = Math.min(Math.max(nextStart, start + 1), end);
  }

  return chunks;
}
