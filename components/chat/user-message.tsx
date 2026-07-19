'use client';

import { CheckIcon, CopyIcon, PencilIcon, RefreshCwIcon } from 'lucide-react';
import { MessageAction, MessageActions, MessageContent, MessageToolbar } from '@/components/ai-elements/message';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { copyText } from '@/lib/clipboard-share';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';

function hitTargetClassName(className?: string) {
  return cn(
    'text-muted-foreground relative after:absolute after:-inset-2',
    'hover:text-foreground',
    '[@media(hover:hover)]:hover:bg-muted/80',
    className,
  );
}

export function userMessageText(parts: ReadonlyArray<{ type: string; text?: string }>): string {
  return parts
    .flatMap(part => (part.type === 'text' && typeof part.text === 'string' ? [part.text] : []))
    .join('\n\n')
    .trim();
}

function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  async function copy(text: string) {
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

  return { copied, copy };
}

export function ViewUserMessage({
  text,
  disabled = false,
  onRetry,
  onEdit,
  className,
}: {
  text: string;
  disabled?: boolean;
  onRetry: () => void;
  onEdit: () => void;
  className?: string;
}) {
  const { copied, copy } = useCopyFeedback();

  return (
    <>
      <MessageContent className={className}>
        <span className="whitespace-pre-wrap">{text}</span>
      </MessageContent>
      <MessageToolbar className="mt-1.5 ml-auto w-auto justify-end gap-2">
        <MessageActions className="gap-0.5">
          <MessageAction
            tooltip={copied ? 'Copied' : 'Copy'}
            label={copied ? 'Copied' : 'Copy prompt'}
            onClick={() => void copy(text)}
            className={hitTargetClassName()}
            aria-label={copied ? 'Copied' : 'Copy prompt'}
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </MessageAction>
          <MessageAction
            tooltip="Edit"
            label="Edit prompt"
            onClick={onEdit}
            disabled={disabled}
            className={hitTargetClassName()}
            aria-label="Edit prompt"
          >
            <PencilIcon className="size-3.5" />
          </MessageAction>
          <MessageAction
            tooltip="Retry"
            label="Retry prompt"
            onClick={onRetry}
            disabled={disabled}
            className={hitTargetClassName()}
            aria-label="Retry prompt"
          >
            <RefreshCwIcon className="size-3.5" />
          </MessageAction>
        </MessageActions>
      </MessageToolbar>
    </>
  );
}

export function EditingUserMessage({
  text,
  disabled = false,
  onCancel,
  onSave,
  className,
}: {
  text: string;
  disabled?: boolean;
  onCancel: () => void;
  onSave: (text: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  function submitEdit(event: SyntheticEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || disabled) return;
    onSave(trimmed);
  }

  return (
    <MessageContent className={cn('w-full max-w-full', className)}>
      <form onSubmit={submitEdit} className="flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={event => setDraft(event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              onCancel();
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          disabled={disabled}
          aria-label="Edit prompt"
          className="border-border/60 bg-background min-h-16 resize-none text-sm"
        />
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={disabled || !draft.trim()}>
            Save & retry
          </Button>
        </div>
      </form>
    </MessageContent>
  );
}

export function UserMessage({
  text,
  disabled = false,
  onRetry,
  onEditRetry,
  className,
}: {
  text: string;
  disabled?: boolean;
  onRetry: () => void;
  onEditRetry: (text: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EditingUserMessage
        text={text}
        disabled={disabled}
        className={className}
        onCancel={() => setEditing(false)}
        onSave={next => {
          setEditing(false);
          onEditRetry(next);
        }}
      />
    );
  }

  return (
    <ViewUserMessage
      text={text}
      disabled={disabled}
      className={className}
      onRetry={onRetry}
      onEdit={() => {
        if (!disabled) setEditing(true);
      }}
    />
  );
}
