/**
 * Canonical timestamp grammar for the pipeline: MM:SS under an hour,
 * H:MM:SS at or above. Every producer and consumer (routes and evals)
 * must parse/format through this module so the grammar lives in one place.
 */

/** A full timestamp string: MM:SS or H:MM:SS. */
export const TIMESTAMP_PATTERN = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;

/** The same grammar without anchors, for embedding in larger patterns. */
export const TIMESTAMP_SOURCE = TIMESTAMP_PATTERN.source.slice(1, -1);

/** A timestamp at the start of a line (MM:SS or H:MM:SS). */
const LINE_TIMESTAMP = /^((?:\d{1,2}:)?\d{1,2}:\d{2})\b/;

export function timestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function secondsToTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  const mmss = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}

/** The timestamp leading a transcript line, or null if the line has none. */
export function lineTimestamp(line: string): string | null {
  return line.match(LINE_TIMESTAMP)?.[1] ?? null;
}

/**
 * Strips (…) or […] wrappers the model sometimes puts around a line's leading
 * timestamp, so the rest of the pipeline only ever sees the bare MM:SS grammar.
 * A no-op on already-bare transcripts.
 */
export function normalizeTranscript(transcript: string): string {
  return transcript
    .split('\n')
    .map(line => line.replace(/^(\s*)[([]\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*[)\]]/, '$1$2'))
    .join('\n');
}

/** All timestamps that start a line in a transcript, in order. */
export function transcriptTimestamps(transcript: string): string[] {
  return [...transcript.matchAll(new RegExp(LINE_TIMESTAMP.source, 'gm'))].map(m => m[1]);
}

export interface TranscriptLine {
  timestamp: string | null;
  seconds: number | null;
  text: string;
}

/** Split a timestamped transcript into seekable rows. */
export function parseTranscriptLines(transcript: string): TranscriptLine[] {
  return transcript
    .split('\n')
    .map(raw => raw.trimEnd())
    .filter(raw => raw.length > 0)
    .map(raw => {
      const timestamp = lineTimestamp(raw);
      if (timestamp === null) return { timestamp: null, seconds: null, text: raw };
      const text = raw.slice(timestamp.length).trimStart();
      return { timestamp, seconds: timestampToSeconds(timestamp), text };
    });
}

/** Seekable line count for tab badges without shipping the full transcript body. */
export function countTimestampedTranscriptLines(transcript: string): number {
  let count = 0;
  for (const line of parseTranscriptLines(transcript)) {
    if (line.seconds !== null) count += 1;
  }
  return count;
}

/** Transcript lines whose leading timestamp falls within [start, end]. */
export function transcriptSpan(transcript: string, start: string, end: string): string {
  const startSec = timestampToSeconds(start);
  const endSec = timestampToSeconds(end);
  return transcript
    .split('\n')
    .filter(line => {
      const ts = lineTimestamp(line);
      if (ts === null) return false;
      const sec = timestampToSeconds(ts);
      return sec >= startSec && sec <= endSec;
    })
    .join('\n');
}
