'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Spinner } from '@/components/ui/spinner';
import type { StoryCard } from '@/lib/broadcast-types';
import { AnswerWithCitations } from './timestamp';

const CHAT_STORAGE_PREFIX = 'broadcast-desk:chat:';

function chatStorageKey(filename: string): string {
  return `${CHAT_STORAGE_PREFIX}${filename}`;
}

function isStoredMessage(value: unknown): value is UIMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Partial<UIMessage>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
    Array.isArray(message.parts)
  );
}

function readStoredMessages(filename: string): UIMessage[] | null {
  try {
    const raw = window.localStorage.getItem(chatStorageKey(filename));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isStoredMessage)) return null;
    return parsed;
  } catch {
    return null;
  }
}

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
          <AnswerWithCitations text={demoCitation} onSeek={onSeek} />{' '}
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
  filename,
  stories,
  transcriptReady,
  halted = false,
  activeStory = null,
  onSeek,
}: {
  filename: string;
  stories: StoryCard[];
  transcriptReady: boolean;
  /** True when the pipeline is dead or missing — don't promise live transcription. */
  halted?: boolean;
  /** Story covering the current playback / last seek — drives a contextual chip. */
  activeStory?: StoryCard | null;
  onSeek: (seconds: number) => void;
}) {
  const [input, setInput] = React.useState('');
  const transport = React.useMemo(() => new DefaultChatTransport({ api: '/api/chat', body: { filename } }), [filename]);
  const { messages, setMessages, sendMessage, status, error } = useChat({ transport });

  // Restore the saved research trail once, then mirror settled messages back
  // to storage so a refresh or a trip to the library never loses citations.
  React.useEffect(() => {
    const stored = readStoredMessages(filename);
    if (stored) setMessages(stored);
  }, [filename, setMessages]);

  React.useEffect(() => {
    if (messages.length === 0 || status === 'submitted' || status === 'streaming') return;
    try {
      window.localStorage.setItem(chatStorageKey(filename), JSON.stringify(messages));
    } catch {
      // Storage full or blocked — the live session still works; only persistence degrades.
    }
  }, [status, messages, filename]);

  const busy = status === 'submitted' || status === 'streaming';
  const isEmpty = messages.length === 0;
  const exportFilename = `broadcast-${filename.replace(/\.mp4$/i, '').split('-')[0]}-chat.md`;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy || !transcriptReady) return;
    void sendMessage({ text: trimmed });
    setInput('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Always in the a11y tree (sr-only on mobile); dock toggle carries the visible label. */}
      <div className="sr-only lg:not-sr-only lg:flex lg:items-center lg:justify-between lg:gap-2 lg:border-b lg:px-4 lg:py-3">
        <h2 className="text-base font-medium">Ask the broadcast</h2>
        {!transcriptReady &&
          (halted ? (
            <span className="text-muted-foreground text-xs">Transcription paused</span>
          ) : (
            <span className="shimmer text-muted-foreground flex items-center gap-1.5 text-xs">
              <Spinner className="size-3" />
              Transcribing…
            </span>
          ))}
      </div>

      {isEmpty ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ChatEmptyState stories={stories} transcriptReady={transcriptReady} halted={halted} onSeek={onSeek} />
        </div>
      ) : (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="gap-4 px-4 py-4">
            {messages.map(message => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, i) =>
                    part.type === 'text' ? (
                      <div key={`${message.id}-${i}`} className="text-sm leading-normal">
                        {message.role === 'assistant' ? (
                          <AnswerWithCitations text={part.text} onSeek={onSeek} />
                        ) : (
                          <span className="whitespace-pre-wrap">{part.text}</span>
                        )}
                      </div>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))}
            {status === 'submitted' && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <Spinner className="size-3" />
                Checking the footage…
              </div>
            )}
            {error && (
              <p role="alert" className="text-destructive text-xs">
                {error.message || 'Something went wrong. Try asking again.'}
              </p>
            )}
          </ConversationContent>
          <ConversationDownload
            messages={messages}
            filename={exportFilename}
            aria-label="Download this Q&A as Markdown"
            title="Download this Q&A as Markdown"
            className="top-2 right-2 size-7"
          />
          <ConversationScrollButton />
        </Conversation>
      )}

      {isEmpty && status === 'submitted' && (
        <div className="text-muted-foreground flex items-center gap-2 px-4 pb-2 text-xs">
          <Spinner className="size-3" />
          Checking the footage…
        </div>
      )}
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
