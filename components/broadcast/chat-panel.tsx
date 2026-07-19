'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { AssistantMessageActions, assistantMessageText } from '@/components/chat/assistant-message-actions';
import { UserMessage, userMessageText } from '@/components/chat/user-message';
import { submitChatFeedback } from '@/lib/chat-feedback';
import { shouldShowLoadingShimmer } from '@/lib/chat-loading';
import { browserTimeZone } from '@/lib/dates';
import type { StoryCard } from '@/lib/broadcast-types';
import { AnswerWithCitations } from './timestamp';

function truncateLabel(text: string, max = 36): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Short prompts that fit a thumb-zone dock without truncating mid-sentence. */
function buildSuggestions(stories: StoryCard[], activeStory: StoryCard | null): string[] {
  if (activeStory) {
    return [`Ask about "${truncateLabel(activeStory.headline)}"`, 'Key claim with a timestamp'];
  }
  if (stories.length === 0) {
    return ['What are the main stories?', 'Most important clip'];
  }
  return ['Summarize the lead', 'Key claim with a timestamp'];
}

function suggestionPrompt(suggestion: string, activeStory: StoryCard | null): string {
  if (activeStory && suggestion.startsWith('Ask about')) {
    return `What is the key claim in "${activeStory.headline}"? Cite a timestamp.`;
  }
  return suggestion;
}

/**
 * First-run teaching block for the empty conversation area. Instead of a
 * blank void, it demonstrates the product's core move — a citation chip that
 * really seeks the player — using the lead story's actual timestamps, so the
 * first click delivers the "jump to the footage" moment before any question
 * is typed. Waiting and paused variants explain what unlocks Q&A and where
 * to fix it.
 */
function ChatEmptyState({
  stories,
  transcriptReady,
  halted,
  onSeek,
}: {
  stories: StoryCard[];
  transcriptReady: boolean;
  halted: boolean;
  onSeek: (seconds: number) => void;
}) {
  if (!transcriptReady) {
    return (
      <div className="flex flex-col gap-1.5 px-4 py-4" role="status">
        <h3 className="text-sm font-medium">{halted ? 'Q&A is paused' : 'Q&A opens after transcription'}</h3>
        <p className="text-muted-foreground text-sm leading-normal text-pretty">
          {halted
            ? 'Transcription stopped before finishing. Restart the analysis from the progress panel to unlock questions.'
            : 'The broadcast is being transcribed now. Once the transcript lands, ask about any claim and jump straight to the cited moment.'}
        </p>
      </div>
    );
  }

  const lead = stories.at(0) ?? null;
  const demoCitation = lead ? `[${lead.startTime}–${lead.endTime}]` : '[00:04–00:30]';

  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:gap-4 lg:py-4">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-medium">Answers cite the footage</h3>
        <p className="text-muted-foreground text-sm leading-normal text-pretty">
          Ask about any claim in this broadcast. Every answer points at moments you can check yourself.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <p className="text-xs font-medium">Try a citation</p>
        <p className="text-muted-foreground text-xs leading-normal">
          <AnswerWithCitations text={demoCitation} onSeekAction={onSeek} />{' '}
          {lead ? (
            <>plays “{truncateLabel(lead.headline, 48)}” straight from the broadcast.</>
          ) : (
            'jumps the player to that moment.'
          )}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  fileId,
  filename,
  stories,
  transcriptReady,
  halted = false,
  activeStory = null,
  initialPrompt = null,
  onInitialPromptConsumed,
  onSeekAction,
}: {
  fileId: string;
  /** Internal storage name; only used to derive the export filename. */
  filename: string;
  stories: StoryCard[];
  transcriptReady: boolean;
  /** True when the pipeline is dead or missing — don't promise live transcription. */
  halted?: boolean;
  /** Story covering the current playback / last seek — drives a contextual chip. */
  activeStory?: StoryCard | null;
  /** Prompt handed off from Ask (`?ask=`) — submitted once the panel is ready. */
  initialPrompt?: string | null;
  /** Clear the handoff after the prompt is accepted (e.g. strip `?ask=` from the URL). */
  onInitialPromptConsumed?: () => void;
  /** Jump the broadcast player to a cited moment. */
  onSeekAction: (seconds: number) => void;
}) {
  const [input, setInput] = React.useState('');
  /** Dedupes Ask → `/v/[id]?ask=` handoffs so the same prompt isn't submitted twice. */
  const consumedAskRef = React.useRef<string | null>(null);
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${encodeURIComponent(fileId)}`,
        body: () => ({ timezone: browserTimeZone() }),
      }),
    [fileId],
  );
  const { messages, sendMessage, regenerate, status, error } = useChat({ transport });

  React.useEffect(() => {
    consumedAskRef.current = null;
  }, [fileId]);

  const busy = status === 'submitted' || status === 'streaming';
  const showLoadingShimmer = shouldShowLoadingShimmer(status, messages);
  const isEmpty = messages.length === 0;
  const exportFilename = `broadcast-${filename.replace(/\.mp4$/i, '').split('-')[0]}-chat.md`;

  // Handoff from Ask: defer a tick so the submit lands after the initial render commits.
  React.useEffect(() => {
    const trimmed = initialPrompt?.trim() ?? '';
    if (!trimmed || !transcriptReady || busy) return;
    if (consumedAskRef.current === trimmed) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || consumedAskRef.current === trimmed) return;
      consumedAskRef.current = trimmed;
      onInitialPromptConsumed?.();
      void sendMessage({ text: trimmed });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initialPrompt, transcriptReady, busy, sendMessage, onInitialPromptConsumed]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy || !transcriptReady) return;
    void sendMessage({ text: trimmed });
    setInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* On mobile this anchors to the positioned dock sheet in broadcast-view,
          landing beside the toggle row's chevron — panel chrome, so it never
          overlaps message bubbles. Hidden with the panel while the dock is closed. */}
      {!isEmpty && (
        <ConversationDownload
          messages={messages}
          filename={exportFilename}
          aria-label="Download this Q&A as Markdown"
          title="Download this Q&A as Markdown"
          className="top-3 right-11 size-9 after:absolute after:-inset-1 lg:hidden"
        />
      )}

      {/* Always in the a11y tree (sr-only on mobile); dock toggle carries the visible label. */}
      <div className="sr-only lg:not-sr-only lg:flex lg:items-center lg:justify-between lg:gap-2 lg:border-b lg:px-4 lg:py-3">
        <h2 className="text-base font-medium">Ask the broadcast</h2>
        <div className="flex items-center gap-2">
          {!transcriptReady &&
            (halted ? (
              <span className="text-muted-foreground text-xs">Transcription paused</span>
            ) : (
              <span className="shimmer text-muted-foreground text-xs">Transcribing…</span>
            ))}
          {!isEmpty && (
            <ConversationDownload
              messages={messages}
              filename={exportFilename}
              aria-label="Download this Q&A as Markdown"
              title="Download this Q&A as Markdown"
              className="relative top-auto right-auto hidden size-7 after:absolute after:-inset-2.5 lg:inline-flex"
            />
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatEmptyState stories={stories} transcriptReady={transcriptReady} halted={halted} onSeek={onSeekAction} />
        </div>
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-4 px-4 py-4">
            {messages.map((message, messageIndex) => {
              const isLast = messageIndex === messages.length - 1;
              const isStreamingAssistant = message.role === 'assistant' && busy && isLast;
              const responseText = message.role === 'assistant' ? assistantMessageText(message.parts) : '';
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
                        <div key={`${message.id}-${i}`} className="text-sm leading-normal">
                          <AnswerWithCitations text={part.text} onSeekAction={onSeekAction} />
                        </div>
                      ) : null,
                    )}
                  </MessageContent>
                  {!isStreamingAssistant && responseText ? (
                    <AssistantMessageActions
                      text={responseText}
                      onFeedbackAction={feedback => submitChatFeedback(message.id, feedback)}
                    />
                  ) : null}
                </Message>
              );
            })}
            {showLoadingShimmer ? <p className="shimmer text-muted-foreground text-xs">Checking the footage…</p> : null}
            {error && (
              <p role="alert" className="text-destructive text-xs">
                {error.message || 'Something went wrong. Try asking again.'}
              </p>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {isEmpty && showLoadingShimmer ? (
        <p className="shimmer text-muted-foreground px-4 pb-2 text-xs">Checking the footage…</p>
      ) : null}
      {isEmpty && error && (
        <p role="alert" className="text-destructive px-4 pb-2 text-xs">
          {error.message || 'Something went wrong. Try asking again.'}
        </p>
      )}

      {transcriptReady && (
        <div className="mt-auto flex flex-col gap-2 border-t p-3">
          {isEmpty && (
            <Suggestions>
              {buildSuggestions(stories, activeStory).map(suggestion => (
                <Suggestion
                  key={suggestion}
                  suggestion={suggestion}
                  onClick={value => submit(suggestionPrompt(value, activeStory))}
                  aria-disabled={busy}
                  className={busy ? 'opacity-50' : undefined}
                />
              ))}
            </Suggestions>
          )}
          <PromptInput onSubmit={message => submit(message.text)} className="relative">
            <PromptInputTextarea
              value={input}
              onChange={event => setInput(event.currentTarget.value)}
              placeholder="Was there any news about…?"
              className="pr-12"
            />
            <PromptInputSubmit status={status} disabled={!input.trim()} className="absolute right-1 bottom-1" />
          </PromptInput>
        </div>
      )}
    </div>
  );
}
