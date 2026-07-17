'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { PromptInput, PromptInputSubmit, PromptInputTextarea } from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { Spinner } from '@/components/ui/spinner';
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

export function ChatPanel({
  filename,
  stories,
  transcriptReady,
  activeStory = null,
  onSeek,
}: {
  filename: string;
  stories: StoryCard[];
  transcriptReady: boolean;
  /** Story covering the current playback / last seek — drives a contextual chip. */
  activeStory?: StoryCard | null;
  onSeek: (seconds: number) => void;
}) {
  const [input, setInput] = React.useState('');
  const transport = React.useMemo(() => new DefaultChatTransport({ api: '/api/chat', body: { filename } }), [filename]);
  const { messages, sendMessage, status, error } = useChat({ transport });

  const busy = status === 'submitted' || status === 'streaming';
  const isEmpty = messages.length === 0;

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
        {!transcriptReady && (
          <span className="shimmer text-muted-foreground flex items-center gap-1.5 text-xs">
            <Spinner className="size-3" />
            Transcribing…
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="min-h-0 flex-1" aria-hidden={!transcriptReady ? undefined : true}>
          {!transcriptReady && (
            <p className="text-muted-foreground px-4 pt-4 text-sm" role="status">
              Q&A unlocks after transcription.
            </p>
          )}
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
            <>
              <p className="text-muted-foreground text-xs leading-normal">
                Answers cite moments — click to jump. Example:{' '}
                <AnswerWithCitations text="[00:04–00:30]" onSeek={onSeek} />
              </p>
              <Suggestions>
                {buildSuggestions(stories, activeStory).map(suggestion => (
                  <Suggestion
                    key={suggestion}
                    suggestion={suggestion}
                    onClick={value => submit(suggestionPrompt(value, activeStory))}
                    disabled={busy}
                  />
                ))}
              </Suggestions>
            </>
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
