/**
 * Canonical timestamp grammar for the pipeline: MM:SS under an hour,
 * H:MM:SS at or above. Every producer and consumer (routes and evals)
 * must parse/format through this module so the grammar lives in one place.
 */

export const TIMESTAMP_PATTERN = /^(?:\d{1,2}:)?\d{1,2}:\d{2}$/;

/** The same grammar without anchors, for embedding in larger patterns. */
export const TIMESTAMP_SOURCE = TIMESTAMP_PATTERN.source.slice(1, -1);

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

export function transcriptTimestamps(transcript: string): string[] {
  return [...transcript.matchAll(new RegExp(LINE_TIMESTAMP.source, 'gm'))].map(m => m[1]);
}

export interface TranscriptLine {
  timestamp: string | null;
  seconds: number | null;
  text: string;
}

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

/**
 * Cap a transcript at the real media length. ASR models hallucinate trailing
 * lines past the end of the audio (runaway timestamps over closing silence or
 * music), and those lines describe footage the video does not contain — a click
 * on them seeks to nothing playable, and they leak into stories, embeddings, and
 * citations downstream. Line timestamps are monotonic, so the first line that
 * starts past the duration marks where the real footage ended: drop it and
 * everything after. A probe that yields no usable duration (ffprobe can print
 * "N/A" or nothing) leaves the transcript untouched rather than truncating it.
 */
export function clampTranscriptToDuration(transcript: string, durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return transcript;
  const kept: string[] = [];
  for (const line of transcript.split('\n')) {
    const timestamp = lineTimestamp(line.trimEnd());
    if (timestamp !== null && timestampToSeconds(timestamp) > durationSeconds) break;
    kept.push(line);
  }
  return kept.join('\n').trimEnd();
}

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
