'use client';

import { ArrowUpIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { NEGATIVE_FEEDBACK_CATEGORIES, type NegativeFeedbackCategoryId } from '@/lib/chat-feedback-categories';
import { cn } from '@/lib/utils';
import { KeyboardEvent, SyntheticEvent, useId, useRef, useState } from 'react';

export type { NegativeFeedbackCategoryId };

export interface NegativeFeedbackPayload {
  category: NegativeFeedbackCategoryId;
  /** Required when category is `other`. */
  comment?: string;
}

export function isOtherCategory(category: NegativeFeedbackCategoryId | null): boolean {
  return category === 'other';
}

export function canSubmitNegativeFeedback(category: NegativeFeedbackCategoryId | null, comment: string): boolean {
  if (!category) return false;
  if (isOtherCategory(category)) return comment.trim().length > 0;
  return true;
}

export function NegativeFeedbackPanel({
  onSubmitAction,
  onDismissAction,
  className,
  isSubmitting = false,
}: {
  onSubmitAction: (payload: NegativeFeedbackPayload) => void | Promise<void>;
  onDismissAction: () => void;
  className?: string;
  isSubmitting?: boolean;
}) {
  const titleId = useId();
  const commentId = useId();
  const [category, setCategory] = useState<NegativeFeedbackCategoryId | null>(null);
  const [comment, setComment] = useState('');
  const shouldFocusOtherRef = useRef(false);
  const localSubmittingRef = useRef(false);
  const showOtherInput = isOtherCategory(category);
  const canSubmit = canSubmitNegativeFeedback(category, comment);

  function setCommentNode(node: HTMLTextAreaElement | null) {
    if (!node || !shouldFocusOtherRef.current) return;
    shouldFocusOtherRef.current = false;
    node.focus();
  }

  function selectCategory(next: NegativeFeedbackCategoryId) {
    if (isSubmitting || localSubmittingRef.current) return;
    setCategory(next);

    if (isOtherCategory(next)) {
      shouldFocusOtherRef.current = true;
      setComment('');
      return;
    }

    localSubmittingRef.current = true;
    void Promise.resolve(onSubmitAction({ category: next })).finally(() => {
      localSubmittingRef.current = false;
    });
  }

  function handleSubmit(event?: SyntheticEvent<HTMLFormElement>) {
    event?.preventDefault();
    // Reached only from the free-text "other" box (submit button / cmd+enter);
    // preset reasons submit directly from selectCategory.
    if (isSubmitting || localSubmittingRef.current || !category || !canSubmit) return;

    localSubmittingRef.current = true;
    void Promise.resolve(onSubmitAction({ category, comment: comment.trim() })).finally(() => {
      localSubmittingRef.current = false;
    });
  }

  function handleCommentKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    handleSubmit();
  }

  function handleFormKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onDismissAction();
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      aria-labelledby={titleId}
      className={cn(
        'bg-popover text-popover-foreground border-border box-border w-full max-w-full min-w-0 rounded-xl border p-3 shadow-sm',
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150',
        className,
      )}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <p id={titleId} className="min-w-0 truncate text-sm font-medium">
          Tell us more:
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onDismissAction}
          disabled={isSubmitting}
          aria-label="Dismiss feedback"
          className="text-muted-foreground relative shrink-0 after:absolute after:-inset-2"
        >
          <XIcon />
        </Button>
      </div>

      <div
        role="group"
        aria-label="Negative feedback reasons"
        className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {NEGATIVE_FEEDBACK_CATEGORIES.map(item => {
          const isSelected = category === item.id;
          return (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              aria-pressed={isSelected}
              onClick={() => selectCategory(item.id)}
              className={cn(
                'h-auto min-h-8 w-full min-w-0 justify-start px-2.5 py-1.5 text-left text-xs font-medium wrap-break-word whitespace-normal',
                'ease transition-[background-color,color,border-color] duration-150',
                isSelected &&
                  'bg-foreground text-background hover:bg-foreground hover:text-background [@media(hover:hover)]:hover:bg-foreground [@media(hover:hover)]:hover:text-background',
              )}
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      {showOtherInput ? (
        <div className="motion-safe:animate-in motion-safe:fade-in-0 mt-3 min-w-0 motion-safe:duration-150">
          <label htmlFor={commentId} className="sr-only">
            Tell us more about the issue
          </label>
          <InputGroup className="dark:bg-input/40 h-auto min-w-0">
            <InputGroupTextarea
              ref={setCommentNode}
              id={commentId}
              value={comment}
              onChange={event => setComment(event.target.value)}
              onKeyDown={handleCommentKeyDown}
              placeholder="Tell us more..."
              spellCheck={false}
              autoComplete="off"
              required
              aria-required
              disabled={isSubmitting}
              rows={3}
              className="field-sizing-content min-h-20 max-w-full min-w-0"
            />
            <InputGroupAddon align="block-end" className="justify-end pt-0">
              <InputGroupButton
                type="submit"
                size="icon-xs"
                variant="default"
                disabled={!canSubmit || isSubmitting}
                aria-label="Submit feedback"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      ) : null}
    </form>
  );
}
