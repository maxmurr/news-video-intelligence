'use client';

import * as React from 'react';
import { Play } from 'lucide-react';
import { TIMESTAMP_SOURCE, timestampToSeconds } from '@/lib/timestamps';

/**
 * A [MM:SS] or [MM:SS-MM:SS] citation inside assistant text. Clicking one
 * jumps the broadcast player to that moment — the "verify against the
 * footage" affordance the whole product hangs on. Built from the pipeline's
 * canonical timestamp grammar so citations can't drift from the transcript.
 */
const CITATION_GROUP = new RegExp(`\\[(${TIMESTAMP_SOURCE}(?:\\s*[,–-]\\s*${TIMESTAMP_SOURCE})*)\\]`, 'g');
const TIMESTAMP = new RegExp(TIMESTAMP_SOURCE, 'g');

function TimestampButton({
  timestamp,
  endTimestamp,
  onSeek,
}: {
  timestamp: string;
  endTimestamp?: string;
  onSeek: (seconds: number) => void;
}) {
  const label = endTimestamp ? `${timestamp}–${endTimestamp}` : timestamp;
  return (
    <button
      type="button"
      onClick={() => onSeek(timestampToSeconds(timestamp))}
      aria-label={`Play video at ${label}`}
      className="bg-muted hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 align-baseline font-mono text-xs font-medium tabular-nums transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:outline-none"
    >
      <Play className="size-2.5 fill-current" aria-hidden />
      {label}
    </button>
  );
}

/**
 * Minimal inline formatting for the bits the chat model actually emits
 * despite the plain-text prompt: **bold** spans and `*` bullets.
 */
function formatPlainText(segment: string, keyPrefix: string): React.ReactNode[] {
  const withBullets = segment.replace(/^\s*[*-]\s+/gm, '• ');
  return withBullets.split(/\*\*([^*]+)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyPrefix}-b${i}`} className="font-medium">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

/**
 * Assistant answer text with every timestamp citation rendered as a jump
 * button. A bracket group may hold one timestamp, a dash range, or a comma
 * list — each timestamp becomes its own button (a range becomes one).
 */
export function AnswerWithCitations({ text, onSeek }: { text: string; onSeek: (seconds: number) => void }) {
  const nodes = React.useMemo(() => {
    const parsed: React.ReactNode[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(CITATION_GROUP)) {
      if (match.index > lastIndex) parsed.push(...formatPlainText(text.slice(lastIndex, match.index), `${lastIndex}`));

      const group = match[1];
      const timestamps = group.match(TIMESTAMP) ?? [];
      const isRange = timestamps.length === 2 && /[-–]/.test(group) && !group.includes(',');

      if (isRange) {
        parsed.push(
          <TimestampButton
            key={`${match.index}-range`}
            timestamp={timestamps[0]}
            endTimestamp={timestamps[1]}
            onSeek={onSeek}
          />,
        );
      } else {
        timestamps.forEach((timestamp, i) => {
          if (i > 0) parsed.push(' ');
          parsed.push(<TimestampButton key={`${match.index}-${i}`} timestamp={timestamp} onSeek={onSeek} />);
        });
      }

      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parsed.push(...formatPlainText(text.slice(lastIndex), `${lastIndex}`));

    return parsed;
  }, [text, onSeek]);

  return <span className="whitespace-pre-wrap">{nodes}</span>;
}
