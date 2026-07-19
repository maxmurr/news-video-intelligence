'use client';

import { CheckIcon, CopyIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MessageAction, MessageActions, MessageToolbar } from '@/components/ai-elements/message';
import {
  NegativeFeedbackPanel,
  type NegativeFeedbackCategoryId,
  type NegativeFeedbackPayload,
} from '@/components/chat/negative-feedback-panel';
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

export function AssistantMessageActions({
  text,
  sourceCount = 0,
  className,
  onFeedbackAction,
}: {
  text: string;
  /** Unique grounded broadcasts; omit or pass 0 to hide the sources badge. */
  sourceCount?: number;
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

  const sourceLabel = sourceCount === 1 ? '1 source' : `${sourceCount} sources`;
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
    .flatMap(part => (part.type === 'text' && typeof part.text === 'string' ? [part.text] : []))
    .join('\n\n')
    .trim();
}
