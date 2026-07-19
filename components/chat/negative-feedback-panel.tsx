'use client';

import * as React from 'react';
import { ArrowUpIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group';
import { NEGATIVE_FEEDBACK_CATEGORIES, type NegativeFeedbackCategoryId } from '@/lib/chat-feedback-categories';
import { cn } from '@/lib/utils';

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
  onSubmit,
  onDismiss,
  className,
  isSubmitting = false,
}: {
  onSubmit: (payload: NegativeFeedbackPayload) => void | Promise<void>;
  onDismiss: () => void;
  className?: string;
  isSubmitting?: boolean;
}) {
  const titleId = React.useId();
  const commentId = React.useId();
  const [category, setCategory] = React.useState<NegativeFeedbackCategoryId | null>(null);
  const [comment, setComment] = React.useState('');
  const commentRef = React.useRef<HTMLTextAreaElement>(null);
  const showOtherInput = isOtherCategory(category);
  const canSubmit = canSubmitNegativeFeedback(category, comment);

  React.useEffect(() => {
    if (!showOtherInput) return;
    commentRef.current?.focus();
  }, [showOtherInput]);

  function selectCategory(next: NegativeFeedbackCategoryId) {
    if (isSubmitting) return;
    setCategory(next);

    if (isOtherCategory(next)) {
      setComment('');
      return;
    }

    void onSubmit({ category: next });
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    // Reached only from the free-text "other" box (submit button / cmd+enter);
    // preset reasons submit directly from selectCategory.
    if (isSubmitting || !category || !canSubmit) return;
    void onSubmit({ category, comment: comment.trim() });
  }

  function handleCommentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter') return;
    if (!(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    handleSubmit();
  }

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onDismiss();
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
          onClick={onDismiss}
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
                'h-auto min-h-8 w-full min-w-0 justify-start px-2.5 py-1.5 text-left text-xs font-medium break-words whitespace-normal',
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
              ref={commentRef}
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
