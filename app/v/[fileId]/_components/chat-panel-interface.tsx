'use client';

import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { AssistantMessageActions, assistantMessageText } from '@/components/chat/assistant-message-actions';
import { UserMessage, userMessageText } from '@/components/chat/user-message';
import type { StoryCard } from '@/lib/broadcast-types';
import { submitChatFeedback } from '@/lib/chat/chat-feedback';
import { shouldShowLoadingShimmer } from '@/lib/chat/chat-loading';
import { browserTimeZone } from '@/lib/dates';
import {
  Provider,
  useChat,
  useChatActions,
  useChatError,
  useChatStatus,
  useChatStore,
  useChatStoreApi,
  useMessageById,
  useMessageCount,
  useMessageIds,
} from '@ai-sdk-tools/store';
import { useForm, useSelector, type ReactFormExtendedApi } from '@tanstack/react-form';
import { DefaultChatTransport } from 'ai';
import { ArrowUpIcon } from 'lucide-react';
import { createContext, use, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AnswerWithCitations } from './timestamp';

function isChatBusy(status: string): boolean {
  return status === 'submitted' || status === 'streaming';
}

interface ChatAskFormValues {
  question: string;
}

interface AskFormActions {
  setQuestion: (question: string) => void;
  applyStarter: (suggestion: string) => void;
  submit: () => void;
}

interface AskFormMeta {
  stories: StoryCard[];
  activeStory: StoryCard | null;
  filename: string;
  onSeek: (seconds: number) => void;
}

// Validator generics are irrelevant for field selectors; keep form values typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChatAskFormApi = ReactFormExtendedApi<ChatAskFormValues, any, any, any, any, any, any, any, any, any, any, any>;

const AskFormActionsContext = createContext<AskFormActions | null>(null);
const AskFormMetaContext = createContext<AskFormMeta | null>(null);
const AskFormApiContext = createContext<ChatAskFormApi | null>(null);

function useAskFormActions() {
  const actions = use(AskFormActionsContext);
  if (!actions) throw new Error('AskFormContext missing');
  return actions;
}

function useAskFormMeta() {
  const meta = use(AskFormMetaContext);
  if (!meta) throw new Error('AskFormContext missing');
  return meta;
}

function useAskFormApi() {
  const api = use(AskFormApiContext);
  if (!api) throw new Error('AskFormContext missing');
  return api;
}

function useAskFormQuestion(): string {
  const form = useAskFormApi();
  return useSelector(form.store, state => state.values.question);
}

function useAskFormBusy() {
  const status = useChatStatus();
  return isChatBusy(status);
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
  if (suggestion === 'Key claim with a timestamp') {
    return 'What is the key claim? Cite a timestamp.';
  }
  return suggestion;
}

function exportChatFilename(filename: string): string {
  return `broadcast-${filename.replace(/\.mp4$/i, '').split('-')[0]}-chat.md`;
}

/**
 * First-run teaching block for an empty ready conversation. Demonstrates a
 * citation chip that really seeks the player using the lead story's timestamps.
 */
function ChatReadyEmpty({ stories, onSeek }: { stories: StoryCard[]; onSeek: (seconds: number) => void }) {
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

function AskFormProvider({
  stories,
  activeStory,
  filename,
  onSeek,
  children,
}: {
  stories: StoryCard[];
  activeStory: StoryCard | null;
  filename: string;
  onSeek: (seconds: number) => void;
  children: ReactNode;
}) {
  const chatStore = useChatStoreApi();
  const { sendMessage } = useChatActions();
  const activeStoryRef = useRef(activeStory);

  useEffect(() => {
    activeStoryRef.current = activeStory;
  }, [activeStory]);

  const form = useForm({
    defaultValues: {
      question: '',
    } as ChatAskFormValues,
    onSubmit: ({ value }) => {
      if (isChatBusy(chatStore.getState().status)) return;

      const trimmed = value.question.trim();
      if (!trimmed) return;

      form.setFieldValue('question', '');
      void sendMessage({ text: trimmed });
    },
  });

  const actions = useMemo<AskFormActions>(
    () => ({
      setQuestion: next => {
        form.setFieldValue('question', next);
      },
      applyStarter: suggestion => {
        if (isChatBusy(chatStore.getState().status)) return;
        form.setFieldValue('question', suggestionPrompt(suggestion, activeStoryRef.current));
      },
      submit: () => {
        void form.handleSubmit();
      },
    }),
    [chatStore, form],
  );

  const meta = useMemo<AskFormMeta>(
    () => ({ stories, activeStory, filename, onSeek }),
    [stories, activeStory, filename, onSeek],
  );

  return (
    <AskFormApiContext value={form}>
      <AskFormMetaContext value={meta}>
        <AskFormActionsContext value={actions}>{children}</AskFormActionsContext>
      </AskFormMetaContext>
    </AskFormApiContext>
  );
}

interface ChatPanelInterfaceProps {
  fileId: string;
  /** Internal storage name; only used to derive the export filename. */
  filename: string;
  stories: StoryCard[];
  /** Story covering the current playback / last seek — drives a contextual chip. */
  activeStory?: StoryCard | null;
  /** Prompt handed off from Ask (`?ask=`) — submitted once the panel is ready. */
  initialPrompt?: string | null;
  /** Clear the handoff after the prompt is accepted (e.g. strip `?ask=` from the URL). */
  onInitialPromptConsumedAction?: () => void;
  /** Jump the broadcast player to a cited moment. */
  onSeekAction: (seconds: number) => void;
}

/** Ready Q&A — transcript is available and the prompt is unlocked. */
export function ChatPanelInterface({
  fileId,
  filename,
  stories,
  activeStory = null,
  initialPrompt = null,
  onInitialPromptConsumedAction,
  onSeekAction,
}: ChatPanelInterfaceProps) {
  return (
    <Provider key={fileId} initialMessages={[]}>
      <ChatPanelInterfaceRoot
        fileId={fileId}
        filename={filename}
        stories={stories}
        activeStory={activeStory}
        initialPrompt={initialPrompt}
        onInitialPromptConsumedAction={onInitialPromptConsumedAction}
        onSeekAction={onSeekAction}
      />
    </Provider>
  );
}

function ChatPanelInterfaceRoot({
  fileId,
  filename,
  stories,
  activeStory,
  initialPrompt,
  onInitialPromptConsumedAction,
  onSeekAction,
}: Required<Pick<ChatPanelInterfaceProps, 'fileId' | 'filename' | 'stories' | 'activeStory' | 'onSeekAction'>> &
  Pick<ChatPanelInterfaceProps, 'initialPrompt' | 'onInitialPromptConsumedAction'>) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/${encodeURIComponent(fileId)}`,
        body: () => ({ timezone: browserTimeZone() }),
      }),
    [fileId],
  );

  useChat({
    id: fileId,
    transport,
  });

  useInitialAskHandoff(initialPrompt, onInitialPromptConsumedAction);

  const hasMessages = useMessageCount() > 0;

  return (
    <AskFormProvider stories={stories} activeStory={activeStory} filename={filename} onSeek={onSeekAction}>
      {hasMessages ? <ActiveChatPanelInterface /> : <EmptyChatPanelInterface />}
    </AskFormProvider>
  );
}

/** Handoff from Ask: defer a tick so the submit lands after the initial render commits. */
function useInitialAskHandoff(initialPrompt: string | null | undefined, onConsumed?: () => void) {
  const chatStore = useChatStoreApi();
  const { sendMessage } = useChatActions();
  /** Dedupes Ask → `/v/[id]?ask=` handoffs so the same prompt isn't submitted twice. */
  const consumedAskRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmed = initialPrompt?.trim() ?? '';
    if (!trimmed) return;
    if (consumedAskRef.current === trimmed) return;
    if (isChatBusy(chatStore.getState().status)) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || consumedAskRef.current === trimmed) return;
      if (isChatBusy(chatStore.getState().status)) return;
      consumedAskRef.current = trimmed;
      onConsumed?.();
      void sendMessage({ text: trimmed });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [initialPrompt, chatStore, sendMessage, onConsumed]);
}

function EmptyChatPanelInterface() {
  const { stories, onSeek } = useAskFormMeta();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatPanelHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ChatReadyEmpty stories={stories} onSeek={onSeek} />
      </div>
      <ChatPanelEmptyStatus />
      <div className="mt-auto flex flex-col gap-2 border-t p-3">
        <EmptyChatSuggestions />
        <AskComposer />
      </div>
    </div>
  );
}

function ActiveChatPanelInterface() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <MobileChatDownload />
      <ChatPanelHeader />
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 px-4 py-4">
          <ChatPanelMessages />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mt-auto flex flex-col gap-2 border-t p-3">
        <AskComposer />
      </div>
    </div>
  );
}

function ChatPanelHeader() {
  return (
    <div className="sr-only lg:not-sr-only lg:flex lg:items-center lg:justify-between lg:gap-2 lg:border-b lg:px-4 lg:py-3">
      <h2 className="text-base font-medium">Ask the broadcast</h2>
      <div className="flex items-center gap-2">
        <DesktopChatDownload />
      </div>
    </div>
  );
}

function useExportFilename() {
  const { filename } = useAskFormMeta();
  return exportChatFilename(filename);
}

function DesktopChatDownload() {
  const messages = useChatStore(state => state.messages);
  const exportFilename = useExportFilename();

  if (messages.length === 0) return null;

  return (
    <ConversationDownload
      messages={messages}
      filename={exportFilename}
      aria-label="Download this Q&A as Markdown"
      title="Download this Q&A as Markdown"
      className="relative top-auto right-auto hidden size-7 after:absolute after:-inset-2.5 lg:inline-flex"
    />
  );
}

function MobileChatDownload() {
  const messages = useChatStore(state => state.messages);
  const exportFilename = useExportFilename();

  if (messages.length === 0) return null;

  return (
    <ConversationDownload
      messages={messages}
      filename={exportFilename}
      aria-label="Download this Q&A as Markdown"
      title="Download this Q&A as Markdown"
      className="top-3 right-11 size-9 after:absolute after:-inset-1 lg:hidden"
    />
  );
}

function ChatPanelMessages() {
  const messageIds = useMessageIds();
  const error = useChatError();
  const busy = useAskFormBusy();
  const lastMessageId = messageIds[messageIds.length - 1];

  return (
    <>
      {messageIds.map(messageId => (
        <ChatPanelMessage key={messageId} messageId={messageId} busy={busy} isLast={messageId === lastMessageId} />
      ))}
      <ChatPanelLoadingShimmer />
      {error ? (
        <p role="alert" className="text-destructive text-xs text-pretty">
          {error.message || 'Something went wrong. Try asking again.'}
        </p>
      ) : null}
    </>
  );
}

function ChatPanelMessage({ messageId, busy, isLast }: { messageId: string; busy: boolean; isLast: boolean }) {
  const message = useMessageById(messageId);
  const { sendMessage, regenerate } = useChatActions();
  const { onSeek } = useAskFormMeta();
  const isStreamingAssistant = message.role === 'assistant' && busy && isLast;

  if (message.role === 'user') {
    return (
      <Message from={message.role}>
        <UserMessage
          text={userMessageText(message.parts)}
          disabled={busy}
          onRetry={() => void regenerate({ messageId: message.id })}
          onEditRetry={next => void sendMessage({ text: next, messageId: message.id })}
        />
      </Message>
    );
  }

  const responseText = assistantMessageText(message.parts);

  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) =>
          part.type === 'text' ? (
            <div key={`${message.id}-${i}`} className="text-sm leading-normal">
              <AnswerWithCitations text={part.text} onSeekAction={onSeek} />
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
}

function ChatPanelLoadingShimmer() {
  const show = useChatStore(state => shouldShowLoadingShimmer(state.status, state.messages));

  if (!show) return null;

  return <p className="shimmer text-muted-foreground text-xs">Checking the footage…</p>;
}

function ChatPanelEmptyStatus() {
  const error = useChatError();
  const showLoadingShimmer = useChatStore(state => shouldShowLoadingShimmer(state.status, state.messages));

  if (showLoadingShimmer) {
    return <p className="shimmer text-muted-foreground px-4 pb-2 text-xs">Checking the footage…</p>;
  }

  if (error) {
    return (
      <p role="alert" className="text-destructive px-4 pb-2 text-xs text-pretty">
        {error.message || 'Something went wrong. Try asking again.'}
      </p>
    );
  }

  return null;
}

function EmptyChatSuggestions() {
  const busy = useAskFormBusy();
  const { stories, activeStory } = useAskFormMeta();
  const { applyStarter } = useAskFormActions();
  const starters = buildSuggestions(stories, activeStory);

  return (
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
  );
}

function AskQuestionField() {
  const question = useAskFormQuestion();
  const busy = useAskFormBusy();
  const { setQuestion } = useAskFormActions();

  return (
    <PromptInputTextarea
      value={question}
      onChange={event => setQuestion(event.currentTarget.value)}
      placeholder="Was there any news about…?"
      aria-label="Ask about a claim in this broadcast"
      className="min-h-16 resize-none border-0 bg-transparent px-3 pt-3 pb-2 text-base shadow-none focus-visible:ring-0"
      spellCheck
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      disabled={busy}
    />
  );
}

function AskSubmit() {
  const status = useChatStatus();
  const { stop } = useChatActions();
  const question = useAskFormQuestion();
  const busy = useAskFormBusy();

  return (
    <PromptInputSubmit
      status={status}
      disabled={!question.trim() && !busy}
      onStop={stop}
      aria-label={busy ? 'Stop generating' : 'Ask question'}
    >
      {busy ? undefined : <ArrowUpIcon className="size-4" />}
    </PromptInputSubmit>
  );
}

function AskComposer() {
  const { submit } = useAskFormActions();

  return (
    <PromptInput
      onSubmit={submit}
      className="w-full **:data-[slot=input-group]:h-auto **:data-[slot=input-group]:overflow-visible"
    >
      <AskQuestionField />
      <PromptInputFooter className="border-border/60 justify-between border-t px-2 pt-2 pb-2">
        <PromptInputTools />
        <AskSubmit />
      </PromptInputFooter>
    </PromptInput>
  );
}
