'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ArrowUpIcon, CirclePlusIcon, FilmIcon, XIcon } from 'lucide-react';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import {
  AssistantMessageActions,
  assistantMessageText,
  countMessageSources,
} from '@/components/chat/assistant-message-actions';
import { UserMessage, userMessageText } from '@/components/chat/user-message';
import { Button } from '@/components/ui/button';
import { shouldShowLoadingShimmer } from '@/lib/chat-stream';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BroadcastSummary } from '@/lib/broadcast-types';
import { browserTimeZone } from '@/lib/dates';
import { cn } from '@/lib/utils';

function broadcastTitle(broadcast: BroadcastSummary): string {
  const headline = broadcast.topHeadline?.trim();
  if (headline) return headline;
  return 'Untitled broadcast';
}

function truncateLabel(text: string, max = 42): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function isAskReady(broadcast: BroadcastSummary): boolean {
  return broadcast.stages.transcript;
}

const GENERAL_STARTERS = [
  'How does grounded Q&A work?',
  'What can I upload?',
  'How do timestamp citations work?',
] as const;

function buildStarters(lead: BroadcastSummary | null): string[] {
  if (!lead) return [...GENERAL_STARTERS];
  return [
    `Ask about “${truncateLabel(broadcastTitle(lead), 28)}”`,
    'What are the main stories?',
    'Key claim with a timestamp',
  ];
}

function starterPrompt(suggestion: string, lead: BroadcastSummary | null): string {
  if (!lead) return suggestion;
  if (suggestion.startsWith('Ask about')) {
    return `What is the key claim in “${broadcastTitle(lead)}”? Cite a timestamp.`;
  }
  if (suggestion === 'Key claim with a timestamp') {
    return 'What is the key claim? Cite a timestamp.';
  }
  return suggestion;
}

function ScopeChip({
  broadcast,
  disabled,
  onRemove,
}: {
  broadcast: BroadcastSummary;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const title = broadcastTitle(broadcast);

  return (
    <div
      title={title}
      className="bg-muted border-border inline-flex max-w-full items-center gap-1.5 rounded-md border py-1 pr-1 pl-1.5 text-xs sm:max-w-xs"
    >
      <span className="bg-background relative size-5 shrink-0 overflow-hidden rounded-sm">
        {broadcast.thumbnailUrl ? (
          <Image src={broadcast.thumbnailUrl} alt="" fill sizes="20px" className="object-cover" unoptimized />
        ) : (
          <span className="text-muted-foreground flex size-full items-center justify-center">
            <FilmIcon className="size-3" aria-hidden />
          </span>
        )}
      </span>
      <span className="min-w-0 truncate font-medium">{title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        className="text-muted-foreground hover:text-foreground relative size-6 shrink-0 after:absolute after:-inset-2"
        aria-label={`Remove ${title}`}
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </div>
  );
}

function BroadcastPicker({
  broadcasts,
  selectedId,
  disabled,
  onSelectedIdChange,
}: {
  broadcasts: BroadcastSummary[];
  selectedId: string | null;
  disabled?: boolean;
  onSelectedIdChange: (id: string | null) => void;
}) {
  const hasSelection = selectedId !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            title={
              hasSelection
                ? 'Change or clear the broadcast grounding this chat'
                : 'Optionally ground answers in a broadcast'
            }
            aria-label={hasSelection ? 'Change broadcast' : 'Add broadcast context'}
            className="text-muted-foreground hover:text-foreground h-8 gap-1.5 px-2"
          >
            <CirclePlusIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="text-xs font-medium">{hasSelection ? 'Change' : 'Add broadcast'}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" side="top" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Optional grounding</DropdownMenuLabel>
          {broadcasts.length === 0 ? (
            <p className="text-muted-foreground px-1.5 py-2 text-sm text-pretty">
              No broadcasts yet.{' '}
              <Link href="/" className="text-foreground underline-offset-4 hover:underline">
                Upload a broadcast
              </Link>{' '}
              to ground answers in footage.
            </p>
          ) : (
            broadcasts.map(broadcast => {
              const title = broadcastTitle(broadcast);
              return (
                <DropdownMenuCheckboxItem
                  key={broadcast.id}
                  checked={selectedId === broadcast.id}
                  onCheckedChange={checked => {
                    if (checked) onSelectedIdChange(broadcast.id);
                    else if (selectedId === broadcast.id) onSelectedIdChange(null);
                  }}
                  className="items-start gap-2 py-2"
                  title={title}
                >
                  <span className="bg-muted relative mt-0.5 size-8 shrink-0 overflow-hidden rounded-md">
                    {broadcast.thumbnailUrl ? (
                      <Image
                        src={broadcast.thumbnailUrl}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center">
                        <FilmIcon className="size-3.5" aria-hidden />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm leading-snug">{title}</span>
                    {!isAskReady(broadcast) ? (
                      <span className="text-muted-foreground mt-0.5 block text-xs">Transcribing…</span>
                    ) : null}
                  </span>
                </DropdownMenuCheckboxItem>
              );
            })
          )}
        </DropdownMenuGroup>
        {selectedId ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedIdChange(null)}>Ask without a broadcast</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatEmptyState({ broadcasts }: { broadcasts: BroadcastSummary[] }) {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const selected = selectedId ? (broadcasts.find(broadcast => broadcast.id === selectedId) ?? null) : null;
  const scoped = selected && isAskReady(selected) ? selected : null;
  const hasScope = scoped !== null;
  const starters = React.useMemo(() => buildStarters(scoped), [scoped]);

  const transport = React.useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: () => ({ timezone: browserTimeZone() }) }),
    [],
  );

  const { messages, sendMessage, regenerate, status, error, stop } = useChat({
    id: 'general',
    transport,
  });

  const busy = status === 'submitted' || status === 'streaming';
  const hasMessages = messages.length > 0;
  const alertMessage = formError ?? (error ? error.message || 'Something went wrong. Try asking again.' : null);

  function changeSelection(id: string | null) {
    setSelectedId(id);
    setFormError(null);
  }

  function applyStarter(suggestion: string) {
    if (busy) return;
    setFormError(null);
    setInput(starterPrompt(suggestion, scoped));
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    if (selectedId && !scoped) {
      setFormError('That broadcast is still transcribing. Clear it to keep chatting, or wait for the transcript.');
      return;
    }

    setFormError(null);
    setInput('');

    // Grounded asks open the broadcast desk — ChatPanel owns /api/chat/[fileId].
    if (scoped) {
      const params = new URLSearchParams({ ask: trimmed });
      router.push(`/v/${encodeURIComponent(scoped.id)}?${params.toString()}`);
      return;
    }

    void sendMessage({ text: trimmed });
  }

  // Desk chrome: py-6 (3rem) + nav (2rem) + gap-6 (1.5rem) + safe-area.
  // Keep overflow on the conversation only — outer overflow-hidden clips the prompt focus ring.
  const filledHeight = 'h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom,0px))] min-h-0';

  return (
    <div className={cn('flex w-full flex-col', hasMessages ? cn(filledHeight, 'gap-4') : 'gap-6')}>
      {!hasMessages ? (
        <header className="flex shrink-0 flex-col gap-1.5 border-b pb-4">
          <h1 className="font-heading max-w-2xl text-2xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-3xl">
            Desk assistant
          </h1>
          <p className="text-muted-foreground max-w-xl text-sm text-pretty">
            Ask about the desk, uploads, or how grounded Q&A works. Add a broadcast to open it and ask against the
            footage.
          </p>
        </header>
      ) : (
        <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b pb-4">
          <h1 className="min-w-0 text-base font-medium text-pretty">Desk assistant</h1>
        </header>
      )}

      {hasMessages ? (
        <Conversation className="min-h-0 w-full flex-1 overflow-hidden">
          <ConversationContent className="gap-4 px-0 py-2">
            {messages.map((message, messageIndex) => {
              const isLast = messageIndex === messages.length - 1;
              const isStreamingAssistant = message.role === 'assistant' && busy && isLast;
              const responseText = message.role === 'assistant' ? assistantMessageText(message.parts) : '';
              const sourceCount = message.role === 'assistant' ? countMessageSources(message.parts) : 0;
              const promptText = message.role === 'user' ? userMessageText(message.parts) : '';

              if (message.role === 'user') {
                return (
                  <Message from={message.role} key={message.id}>
                    <UserMessage
                      text={promptText}
                      disabled={busy}
                      onRetry={() => void regenerate({ messageId: message.id })}
                      onEditRetry={next => void sendMessage({ text: next, messageId: message.id })}
                    />
                  </Message>
                );
              }

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts.map((part, i) =>
                      part.type === 'text' ? (
                        <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                      ) : null,
                    )}
                  </MessageContent>
                  {!isStreamingAssistant && responseText ? (
                    <AssistantMessageActions text={responseText} sourceCount={sourceCount} />
                  ) : null}
                </Message>
              );
            })}
            {shouldShowLoadingShimmer(status, messages) ? (
              <p className="shimmer text-muted-foreground text-xs">Thinking…</p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive text-xs text-pretty">
                {error.message || 'Something went wrong. Try asking again.'}
              </p>
            ) : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div className={cn('flex w-full shrink-0 flex-col gap-2', !hasMessages && 'mt-auto')}>
        {!hasMessages ? (
          <Suggestions>
            {starters.map(suggestion => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onClick={applyStarter}
                disabled={busy}
                aria-disabled={busy}
                className={busy ? 'opacity-50' : undefined}
              />
            ))}
          </Suggestions>
        ) : null}

        {selected ? (
          <div className="flex w-full flex-wrap gap-2" aria-label="Selected broadcast">
            <ScopeChip broadcast={selected} disabled={busy} onRemove={() => changeSelection(null)} />
          </div>
        ) : null}

        <PromptInput
          onSubmit={message => submit(message.text)}
          className="w-full **:data-[slot=input-group]:h-auto **:data-[slot=input-group]:overflow-visible"
        >
          <PromptInputTextarea
            value={input}
            onChange={event => {
              setInput(event.currentTarget.value);
              if (formError) setFormError(null);
            }}
            placeholder={hasScope ? 'Was there any news about…?' : 'Ask a question…'}
            aria-label={hasScope ? 'Ask about a claim — opens that broadcast' : 'Ask the desk assistant'}
            aria-invalid={alertMessage ? true : undefined}
            className="min-h-16 resize-none border-0 bg-transparent px-3 pt-3 pb-2 text-base shadow-none focus-visible:ring-0"
            spellCheck
            autoComplete="off"
            autoFocus
            data-1p-ignore
            data-lpignore="true"
            disabled={busy}
          />
          <PromptInputFooter className="border-border/60 justify-between border-t px-2 pt-2 pb-2">
            <PromptInputTools>
              {!hasMessages ? (
                <BroadcastPicker
                  broadcasts={broadcasts}
                  selectedId={selectedId}
                  disabled={busy}
                  onSelectedIdChange={changeSelection}
                />
              ) : null}
            </PromptInputTools>
            <PromptInputSubmit
              status={hasScope ? 'ready' : status}
              disabled={!input.trim() && !busy}
              onStop={stop}
              aria-label={hasScope ? 'Open broadcast and ask' : busy ? 'Stop generating' : 'Ask question'}
            >
              {busy && !hasScope ? undefined : <ArrowUpIcon className="size-4" />}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>

        {alertMessage && !hasMessages ? (
          <p role="alert" className="text-destructive text-xs text-pretty">
            {alertMessage}
          </p>
        ) : formError && hasMessages ? (
          <p role="alert" className="text-destructive text-xs text-pretty">
            {formError}
          </p>
        ) : !hasMessages ? (
          <p className="text-muted-foreground text-xs text-pretty">
            {hasScope
              ? 'Submit opens that broadcast and asks there, with timestamp citations.'
              : 'General help by default. Add a broadcast to ask against footage.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
