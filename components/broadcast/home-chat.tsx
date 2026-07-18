'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageCircleIcon, XIcon } from 'lucide-react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import { Button } from '@/components/ui/button';
import { browserTimeZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

const transport = new DefaultChatTransport({
  api: '/api/chat',
  body: () => ({ timezone: browserTimeZone() }),
});

/**
 * Floating desk assistant bubble. General-purpose (not broadcast-grounded) —
 * open a video for Ask the broadcast.
 */
export function HomeChat() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { messages, sendMessage, status, error, stop } = useChat({ transport });

  const busy = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  React.useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput('');
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] sm:right-6 sm:bottom-6">
      {open && (
        <div
          id="home-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="home-chat-title"
          className={cn(
            'bg-popover text-popover-foreground ring-foreground/10 pointer-events-auto flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-xl border shadow-lg ring-1',
            'animate-in fade-in-0 zoom-in-95 h-[min(70dvh,32rem)] origin-bottom-right duration-150 ease-out',
            'motion-reduce:animate-none',
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="min-w-0">
              <h2 id="home-chat-title" className="text-sm font-medium">
                Desk assistant
              </h2>
              <p className="text-muted-foreground text-xs text-pretty">General help — not tied to a broadcast.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="shrink-0"
            >
              <XIcon />
            </Button>
          </div>

          {hasMessages ? (
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="gap-4 px-4 py-4">
                {messages.map(message => (
                  <Message from={message.role} key={message.id}>
                    <MessageContent>
                      {message.parts.map((part, i) =>
                        part.type === 'text' ? (
                          message.role === 'assistant' ? (
                            <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                          ) : (
                            <span key={`${message.id}-${i}`} className="whitespace-pre-wrap">
                              {part.text}
                            </span>
                          )
                        ) : null,
                      )}
                    </MessageContent>
                  </Message>
                ))}
                {status === 'submitted' && <p className="shimmer text-muted-foreground text-xs">Thinking…</p>}
                {error && (
                  <p role="alert" className="text-destructive text-xs">
                    {error.message || 'Something went wrong. Try asking again.'}
                  </p>
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 px-4 py-4">
              <p className="text-muted-foreground text-sm text-pretty">
                Ask about the desk, uploads, or how grounded Q&A works once a broadcast is ready.
              </p>
              {status === 'submitted' && <p className="shimmer text-muted-foreground text-xs">Thinking…</p>}
              {error && (
                <p role="alert" className="text-destructive text-xs">
                  {error.message || 'Something went wrong. Try asking again.'}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto border-t p-3">
            <PromptInput onSubmit={message => submit(message.text)} className="relative">
              <PromptInputTextarea
                ref={textareaRef}
                value={input}
                onChange={event => setInput(event.currentTarget.value)}
                placeholder="Ask a question…"
                className="pr-12 text-base"
                spellCheck={false}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() && !busy}
                onStop={stop}
                className="absolute right-1 bottom-1"
                aria-label={busy ? 'Stop generating' : 'Send message'}
              />
            </PromptInput>
          </div>
        </div>
      )}

      <Button
        type="button"
        size="icon-lg"
        onClick={() => setOpen(current => !current)}
        aria-label={open ? 'Close desk assistant' : 'Open desk assistant'}
        aria-expanded={open}
        aria-controls="home-chat-panel"
        className="ease pointer-events-auto size-12 rounded-full shadow-md transition-shadow duration-150 hover:shadow-lg"
      >
        {open ? <XIcon className="size-5" /> : <MessageCircleIcon className="size-5" />}
      </Button>
    </div>
  );
}
