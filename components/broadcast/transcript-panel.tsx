'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { parseTranscriptLines, type TranscriptLine } from '@/lib/timestamps';
import { cn } from '@/lib/utils';

/** Index of the line covering `activeSeconds`, or the latest line that has started. */
export function activeTranscriptLineIndex(lines: TranscriptLine[], activeSeconds: number | null): number | null {
  if (activeSeconds === null) return null;

  let best: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const seconds = lines[i].seconds;
    if (seconds === null) continue;
    if (seconds <= activeSeconds) best = i;
    else break;
  }
  return best;
}

function TranscriptLineSkeleton() {
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border p-3">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </li>
  );
}

// Memoized: activeSeconds ticks on every timeupdate, and only the rows whose
// `active` flag flips should re-render out of a potentially long list.
const TranscriptRow = React.memo(function TranscriptRow({
  line,
  active,
  onSeek,
}: {
  line: TranscriptLine;
  active: boolean;
  onSeek: (seconds: number) => void;
}) {
  if (line.timestamp === null || line.seconds === null) {
    return <li className="text-muted-foreground px-3 py-1 text-sm leading-relaxed wrap-break-word">{line.text}</li>;
  }

  const { timestamp, seconds, text } = line;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSeek(seconds)}
        aria-label={`Play from ${timestamp}: ${text}`}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 grid min-h-11 w-full cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:outline-none',
          active && 'border-primary bg-muted/40 ring-primary/15 ring-1',
        )}
      >
        <span
          className={cn(
            'font-mono text-xs font-medium tabular-nums',
            active ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {timestamp}
        </span>
        <span className="text-sm leading-relaxed wrap-break-word">{text}</span>
      </button>
    </li>
  );
});

export function TranscriptPanel({
  transcript,
  pending,
  onSeekAction,
  activeSeconds = null,
}: {
  transcript: string | null;
  /** True while transcription has not finished. */
  pending: boolean;
  /** Jump the broadcast player to a transcript line’s timestamp. */
  onSeekAction: (seconds: number) => void;
  /** Current playback / last seek time in seconds — drives the active line. */
  activeSeconds?: number | null;
}) {
  const lines = React.useMemo(() => (transcript ? parseTranscriptLines(transcript) : []), [transcript]);
  const activeIndex = activeTranscriptLineIndex(lines, activeSeconds);

  if (lines.length === 0 && pending) {
    return (
      <section className="flex flex-col gap-2" aria-busy="true" aria-label="Transcript loading">
        <ul className="flex flex-col gap-2">
          <TranscriptLineSkeleton />
          <TranscriptLineSkeleton />
          <TranscriptLineSkeleton />
          <TranscriptLineSkeleton />
        </ul>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section aria-label="Transcript">
        <p className="text-muted-foreground text-sm" role="status">
          No transcript is available for this broadcast.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Transcript">
      <ul className="flex flex-col gap-1">
        {lines.map((line, i) => (
          <TranscriptRow
            key={`${line.timestamp ?? 'line'}-${i}`}
            line={line}
            active={i === activeIndex}
            onSeek={onSeekAction}
          />
        ))}
      </ul>
    </section>
  );
}
