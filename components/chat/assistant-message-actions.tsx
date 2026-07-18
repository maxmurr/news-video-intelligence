'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { MessageAction, MessageActions, MessageToolbar } from '@/components/ai-elements/message';
import { copyText } from '@/lib/clipboard-share';
import { cn } from '@/lib/utils';

type Feedback = 'up' | 'down' | null;

function BroadcastSourcesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="1.5" y="3.5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <rect x="4.5" y="4.5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8.75 7.25v3l2.5-1.5-2.5-1.5Z" fill="currentColor" />
    </svg>
  );
}

function hitTargetClassName(className?: string) {
  return cn(
    'text-muted-foreground relative after:absolute after:-inset-2',
    'hover:text-foreground',
    '[@media(hover:hover)]:hover:bg-muted/80',
    className,
  );
}

export function AssistantMessageActions({
  text,
  sourceCount,
  className,
}: {
  text: string;
  sourceCount: number;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Feedback>(null);
  const copyResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  async function handleCopy() {
    if (!text.trim()) return;
    try {
      await copyText(text);
      setCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function toggleFeedback(next: Exclude<Feedback, null>) {
    setFeedback(current => (current === next ? null : next));
  }

  const sourceLabel = sourceCount === 1 ? '1 source' : `${sourceCount} sources`;

  return (
    <MessageToolbar className={cn('mt-1.5 w-auto justify-start gap-2', className)}>
      <MessageActions className="gap-0.5">
        <MessageAction
          tooltip={copied ? 'Copied' : 'Copy'}
          label={copied ? 'Copied' : 'Copy response'}
          onClick={() => void handleCopy()}
          className={hitTargetClassName()}
          aria-label={copied ? 'Copied' : 'Copy response'}
        >
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
        </MessageAction>
        <MessageAction
          tooltip="Good response"
          label="Good response"
          onClick={() => toggleFeedback('up')}
          aria-pressed={feedback === 'up'}
          className={hitTargetClassName(feedback === 'up' ? 'text-foreground bg-muted/80' : undefined)}
        >
          <ThumbsUpIcon className="size-3.5" />
        </MessageAction>
        <MessageAction
          tooltip="Bad response"
          label="Bad response"
          onClick={() => toggleFeedback('down')}
          aria-pressed={feedback === 'down'}
          className={hitTargetClassName(feedback === 'down' ? 'text-foreground bg-muted/80' : undefined)}
        >
          <ThumbsDownIcon className="size-3.5" />
        </MessageAction>
      </MessageActions>

      {sourceCount > 0 ? (
        <span
          className={cn(
            'text-muted-foreground inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs',
            'border-border/80 bg-muted/40 tabular-nums',
          )}
          title={sourceLabel}
        >
          <BroadcastSourcesIcon className="size-3.5 shrink-0" />
          <span>{sourceLabel}</span>
        </span>
      ) : null}
    </MessageToolbar>
  );
}

/** Collect grounded broadcast sources from an assistant message's parts. */
export function countMessageSources(parts: ReadonlyArray<{ type: string }>): number {
  let count = 0;
  for (const part of parts) {
    if (part.type === 'source-url' || part.type === 'source-document') count += 1;
  }
  return count;
}

/** Concatenate text parts for clipboard copy. */
export function assistantMessageText(parts: ReadonlyArray<{ type: string; text?: string }>): string {
  return parts
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n\n')
    .trim();
}
