'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { copyText } from '@/lib/clipboard-share';
import { parseTranscriptLines, secondsToTimestamp, type TranscriptLine } from '@/lib/timestamps';
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

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollRowIntoView(el: HTMLElement) {
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'nearest',
  });
}

function TranscriptLineSkeleton() {
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 px-1 py-2 sm:px-3">
      <Skeleton className="h-3 w-10" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </li>
  );
}

// Memoized: activeSeconds ticks on every timeupdate, and only the rows whose
// `active` flag flips should re-render out of a potentially long list.
const TranscriptRow = React.memo(function TranscriptRow({
  line,
  active,
  onSeek,
  rowRef,
}: {
  line: TranscriptLine;
  active: boolean;
  onSeek: (seconds: number) => void;
  rowRef?: (node: HTMLButtonElement | null) => void;
}) {
  if (line.timestamp === null || line.seconds === null) {
    return (
      <li className="text-muted-foreground min-w-0 px-1 py-1 text-sm leading-relaxed wrap-anywhere sm:px-3">
        {line.text}
      </li>
    );
  }

  const { timestamp, seconds, text } = line;

  return (
    <li className="min-w-0">
      <button
        ref={rowRef}
        type="button"
        onClick={event => {
          onSeek(seconds);
          scrollRowIntoView(event.currentTarget);
        }}
        aria-label={`Play from ${timestamp}: ${text}`}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 grid min-h-11 w-full min-w-0 cursor-pointer grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-3 rounded-md border border-transparent px-1 py-2 text-left transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:outline-none sm:px-3',
          '[@media(hover:hover)]:hover:bg-muted/30',
          active && 'border-border bg-muted/40',
        )}
      >
        <span
          className={cn(
            'font-mono text-xs tabular-nums',
            active ? 'text-foreground font-medium' : 'text-muted-foreground',
          )}
        >
          {timestamp}
        </span>
        <span className="max-w-[72ch] min-w-0 text-sm leading-relaxed wrap-anywhere">{text}</span>
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
  const activeLine = activeIndex !== null ? lines[activeIndex] : null;
  const [followPlayback, setFollowPlayback] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const rowRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const copiedResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const jumpToPlayhead = React.useCallback(() => {
    if (activeIndex === null) return;
    const el = rowRefs.current[activeIndex];
    if (el) scrollRowIntoView(el);
  }, [activeIndex]);

  const copyTranscript = React.useCallback(async () => {
    if (!transcript) return;
    try {
      await copyText(transcript);
      setCopied(true);
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
      copiedResetRef.current = setTimeout(() => setCopied(false), 2000);
      toast.success('Transcript copied');
    } catch {
      toast.error('Could not copy transcript');
    }
  }, [transcript]);

  React.useEffect(() => {
    if (!followPlayback || activeIndex === null) return;
    const el = rowRefs.current[activeIndex];
    if (el) scrollRowIntoView(el);
  }, [followPlayback, activeIndex]);

  React.useEffect(() => {
    return () => {
      if (copiedResetRef.current) clearTimeout(copiedResetRef.current);
    };
  }, []);

  if (lines.length === 0 && pending) {
    return (
      <section className="flex flex-col gap-2" aria-busy="true" aria-label="Transcript loading">
        <p className="text-muted-foreground text-xs">Extracting the timestamped transcript…</p>
        <ul className="flex flex-col">
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
      <section aria-label="Transcript" className="flex flex-col gap-1" role="status">
        <p className="text-sm">No transcript for this broadcast.</p>
        <p className="text-muted-foreground text-sm">Open Stories to browse segments, or Ask after transcription.</p>
      </section>
    );
  }

  const playheadClock = activeLine?.timestamp ?? (activeSeconds !== null ? secondsToTimestamp(activeSeconds) : null);

  return (
    <section aria-label="Transcript" className="flex flex-col gap-0">
      <p className="sr-only">Click a transcript line to play from that moment.</p>
      <div className="bg-background sticky top-10 z-10 -mt-px flex h-10 items-center gap-2 border-b px-1 sm:px-3">
        <p
          className="text-muted-foreground grid min-w-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 text-xs"
          aria-live="polite"
        >
          {playheadClock ? (
            <>
              <span className="text-foreground font-mono font-medium tabular-nums">{playheadClock}</span>
              <span className="min-w-0 truncate">{activeLine?.text ?? 'Playhead in transcript'}</span>
            </>
          ) : (
            <span className="col-span-2">Start playback to track the playhead.</span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={copied ? 'Transcript copied' : 'Copy full transcript'}
            aria-live="polite"
            onClick={copyTranscript}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={activeIndex === null}
            aria-label="Jump to playhead in transcript"
            onClick={jumpToPlayhead}
          >
            Jump
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={followPlayback ? 'Stop following playhead' : 'Follow playhead in transcript'}
            aria-pressed={followPlayback}
            className={cn(followPlayback && 'bg-muted')}
            onClick={() => setFollowPlayback(on => !on)}
          >
            Follow
          </Button>
        </div>
      </div>

      <ul className="flex flex-col gap-0.5 pt-2">
        {lines.map((line, i) => (
          <TranscriptRow
            key={`${line.timestamp ?? 'line'}-${i}`}
            line={line}
            active={i === activeIndex}
            onSeek={onSeekAction}
            rowRef={node => {
              rowRefs.current[i] = node;
            }}
          />
        ))}
      </ul>
    </section>
  );
}
