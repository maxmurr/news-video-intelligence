'use client';

import { CheckIcon, CopyIcon, PlayIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MessageAction, MessageActions, MessageToolbar } from '@/components/ai-elements/message';
import {
  NegativeFeedbackPanel,
  type NegativeFeedbackCategoryId,
  type NegativeFeedbackPayload,
} from '@/components/chat/negative-feedback-panel';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import type { ChatMessageSource } from '@/lib/chat/message-sources';
import { copyText } from '@/lib/clipboard-share';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, useTransition } from 'react';

function thankYouForFeedback() {
  toast.success('Thanks for the feedback', {
    description: 'Your rating helps improve future answers.',
  });
}

function feedbackFailed() {
  toast.error('Couldn’t send feedback', {
    description: 'Please try again in a moment.',
  });
}

type Feedback = 'up' | 'down' | null;

export interface AssistantFeedback {
  sentiment: 'up' | 'down';
  category?: NegativeFeedbackCategoryId;
  comment?: string;
}

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

function SourcesPopover({ sources }: { sources: readonly ChatMessageSource[] }) {
  const sourceCount = sources.length;
  const sourceLabel = sourceCount === 1 ? '1 source' : `${sourceCount} sources`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              'text-muted-foreground border-border/80 bg-muted/40 h-7 shrink-0 gap-1.5 px-2 text-xs tabular-nums',
              'hover:text-foreground',
            )}
            title={sourceLabel}
            aria-label={`Show ${sourceLabel}`}
          />
        }
      >
        <BroadcastSourcesIcon className="size-3.5 shrink-0" />
        <span>{sourceLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-80 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>Sources</PopoverTitle>
        </PopoverHeader>
        <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto">
          {sources.map(source => (
            <li key={source.sourceId} className="flex min-w-0 flex-col gap-1.5">
              <Link
                href={`/v/${source.sourceId}`}
                className="hover:text-foreground text-sm font-medium text-pretty underline-offset-2 hover:underline"
              >
                {source.title}
              </Link>
              {source.timestamps.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {source.timestamps.map(timestamp => (
                    <li key={timestamp}>
                      <Link
                        href={`/v/${source.sourceId}?t=${encodeURIComponent(timestamp)}`}
                        aria-label={`Open ${source.title} at ${timestamp}`}
                        className="bg-muted hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 inline-flex min-h-8 items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs font-medium tabular-nums transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:outline-none"
                      >
                        <PlayIcon className="size-2.5 fill-current" aria-hidden />
                        {timestamp}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function AssistantMessageActions({
  text,
  sources = [],
  className,
  onFeedbackAction,
}: {
  text: string;
  /** Unique grounded broadcasts with jumpable moments; omit to hide the badge. */
  sources?: readonly ChatMessageSource[];
  className?: string;
  /**
   * Fired when the reader rates the response; wire to Langfuse scores.
   * Return `false` (or a promise of `false`) to signal a failed submit — negative
   * feedback only hides the thumbs-up control after a successful submit.
   */
  onFeedbackAction?: (feedback: AssistantFeedback) => boolean | void | Promise<boolean | void>;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isNegativePanelOpen, setIsNegativePanelOpen] = useState(false);
  const [isSubmittingNegative, startNegativeSubmit] = useTransition();
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingNegativeRef = useRef(false);

  useEffect(() => {
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

  async function handleThumbsUp() {
    setIsNegativePanelOpen(false);
    if (feedback === 'up') {
      setFeedback(null);
      return;
    }
    // Optimistic: hide thumbs-down as soon as thumbs-up is chosen, then roll back
    // if the submit fails so the toolbar never shows an unrecorded rating.
    setFeedback('up');
    const result = await onFeedbackAction?.({ sentiment: 'up' });
    if (result === false) {
      setFeedback(null);
      feedbackFailed();
      return;
    }
    thankYouForFeedback();
  }

  function handleThumbsDown() {
    if (isNegativePanelOpen) {
      setIsNegativePanelOpen(false);
      return;
    }

    if (feedback === 'down') {
      setFeedback(null);
      return;
    }

    // Keep thumbs-up visible until negative feedback submits successfully.
    setIsNegativePanelOpen(true);
  }

  function handleNegativeSubmit(payload: NegativeFeedbackPayload) {
    if (submittingNegativeRef.current) return;
    submittingNegativeRef.current = true;

    startNegativeSubmit(async () => {
      try {
        const result = await onFeedbackAction?.({
          sentiment: 'down',
          category: payload.category,
          comment: payload.comment,
        });
        if (result === false) {
          feedbackFailed();
          return;
        }
        setFeedback('down');
        setIsNegativePanelOpen(false);
        thankYouForFeedback();
      } finally {
        submittingNegativeRef.current = false;
      }
    });
  }

  function handleNegativeDismiss() {
    setIsNegativePanelOpen(false);
  }

  const showThumbsUp = feedback !== 'down';
  const showThumbsDown = feedback !== 'up';
  const isThumbsDownActive = feedback === 'down' || isNegativePanelOpen;

  return (
    <div className={cn('flex w-full max-w-full min-w-0 flex-col items-stretch gap-2', className)}>
      <MessageToolbar className="mt-1.5 w-full min-w-0 justify-start gap-2">
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
          {showThumbsUp ? (
            <MessageAction
              tooltip="Good response"
              label="Good response"
              onClick={() => void handleThumbsUp()}
              aria-pressed={feedback === 'up'}
              className={hitTargetClassName(feedback === 'up' ? 'text-foreground bg-muted/80' : undefined)}
            >
              <ThumbsUpIcon className="size-3.5" />
            </MessageAction>
          ) : null}
          {showThumbsDown ? (
            <MessageAction
              tooltip="Bad response"
              label="Bad response"
              onClick={handleThumbsDown}
              aria-pressed={feedback === 'down'}
              aria-expanded={isNegativePanelOpen}
              className={hitTargetClassName(isThumbsDownActive ? 'text-foreground bg-muted/80' : undefined)}
            >
              <ThumbsDownIcon className="size-3.5" />
            </MessageAction>
          ) : null}
        </MessageActions>

        {sources.length > 0 ? <SourcesPopover sources={sources} /> : null}
      </MessageToolbar>

      {isNegativePanelOpen ? (
        <NegativeFeedbackPanel
          onSubmitAction={handleNegativeSubmit}
          onDismissAction={handleNegativeDismiss}
          isSubmitting={isSubmittingNegative}
        />
      ) : null}
    </div>
  );
}

export function assistantMessageText(parts: ReadonlyArray<{ type: string; text?: string }>): string {
  return parts
    .flatMap(part => (part.type === 'text' && typeof part.text === 'string' ? [part.text] : []))
    .join('\n\n')
    .trim();
}

export type { ChatMessageSource } from '@/lib/chat/message-sources';
export { collectMessageSources, countMessageSources } from '@/lib/chat/message-sources';
