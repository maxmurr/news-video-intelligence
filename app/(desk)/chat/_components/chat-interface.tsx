'use client';

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
import { AssistantMessageActions, assistantMessageText } from '@/components/chat/assistant-message-actions';
import { UserMessage, userMessageText } from '@/components/chat/user-message';
import { Button } from '@/components/ui/button';
import type { ChatBroadcastOption } from '@/lib/broadcast-types';
import { submitChatFeedback } from '@/lib/chat-feedback';
import { shouldShowLoadingShimmer } from '@/lib/chat-loading';
import { browserTimeZone } from '@/lib/dates';
import {
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
import { ArrowUpIcon, FilmIcon, XIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createContext, use, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { BroadcastPickerFallback } from './chat-broadcast-picker';

function isChatBusy(status: string): boolean {
  return status === 'submitted' || status === 'streaming';
}

const BroadcastPicker = dynamic(() => import('./chat-broadcast-picker').then(mod => mod.BroadcastPicker), {
  ssr: false,
  loading: () => <BroadcastPickerFallback />,
});

const GENERAL_STARTERS = [
  'How does grounded Q&A work?',
  'What can I upload?',
  'How do timestamp citations work?',
] as const;

interface ChatAskFormValues {
  question: string;
  selectedId: string | null;
}

interface AskFormActions {
  setQuestion: (question: string) => void;
  setSelectedId: (id: string | null) => void;
  clearSubmitError: () => void;
  clearScope: () => void;
  applyStarter: (suggestion: string) => void;
  submit: () => void;
}

interface AskFormMeta {
  broadcasts: ChatBroadcastOption[];
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

function useAskFormSelectedId(): string | null {
  const form = useAskFormApi();
  return useSelector(form.store, state => state.values.selectedId);
}

function useAskFormSubmitError(): string | null {
  const form = useAskFormApi();
  return useSelector(form.store, state => submitErrorMessage(state.errorMap.onSubmit));
}

function useAskFormBusy() {
  const status = useChatStatus();
  return isChatBusy(status);
}

function useAskFormSelection() {
  const { broadcasts } = useAskFormMeta();
  const selectedId = useAskFormSelectedId();
  const selected = resolveSelected(broadcasts, selectedId);
  const scoped = resolveScoped(selected);
  return { selectedId, selected, scoped };
}

function submitErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    const joined = error.filter((part): part is string => typeof part === 'string').join(', ');
    return joined || null;
  }
  return null;
}

function broadcastTitle(broadcast: ChatBroadcastOption): string {
  const headline = broadcast.topHeadline?.trim();
  if (headline) return headline;
  return 'Untitled broadcast';
}

function truncateLabel(text: string, max = 42): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function resolveSelected(broadcasts: ChatBroadcastOption[], selectedId: string | null): ChatBroadcastOption | null {
  if (!selectedId) return null;
  return broadcasts.find(broadcast => broadcast.id === selectedId) ?? null;
}

function resolveScoped(selected: ChatBroadcastOption | null): ChatBroadcastOption | null {
  return selected?.isAskReady ? selected : null;
}

function buildStarters(lead: ChatBroadcastOption | null): string[] {
  if (!lead) return [...GENERAL_STARTERS];
  return [
    `Ask about “${truncateLabel(broadcastTitle(lead), 28)}”`,
    'What are the main stories?',
    'Key claim with a timestamp',
  ];
}

function starterPrompt(suggestion: string, lead: ChatBroadcastOption | null): string {
  if (!lead) return suggestion;
  if (suggestion.startsWith('Ask about')) {
    return `What is the key claim in “${broadcastTitle(lead)}”? Cite a timestamp.`;
  }
  if (suggestion === 'Key claim with a timestamp') {
    return 'What is the key claim? Cite a timestamp.';
  }
  return suggestion;
}

function countMessageSources(parts: ReadonlyArray<{ type: string }>): number {
  let count = 0;
  for (const part of parts) {
    if (part.type === 'source-url' || part.type === 'source-document') count += 1;
  }
  return count;
}

function ScopeChip({
  broadcast,
  disabled,
  onRemove,
}: {
  broadcast: ChatBroadcastOption;
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

function AskFormProvider({ broadcasts, children }: { broadcasts: ChatBroadcastOption[]; children: ReactNode }) {
  const router = useRouter();
  const chatStore = useChatStoreApi();
  const { sendMessage } = useChatActions();
  const broadcastsRef = useRef(broadcasts);

  useEffect(() => {
    broadcastsRef.current = broadcasts;
  }, [broadcasts]);

  const form = useForm({
    defaultValues: {
      question: '',
      selectedId: null,
    } as ChatAskFormValues,
    validators: {
      onSubmit: ({ value }) => {
        if (!value.selectedId) return undefined;
        const selected = resolveSelected(broadcastsRef.current, value.selectedId);
        if (selected && !selected.isAskReady) {
          return 'That broadcast is still transcribing. Clear it to keep chatting, or wait for the transcript.';
        }
        return undefined;
      },
    },
    onSubmit: ({ value }) => {
      if (isChatBusy(chatStore.getState().status)) return;

      const trimmed = value.question.trim();
      if (!trimmed) return;

      const selected = resolveSelected(broadcastsRef.current, value.selectedId);
      const scoped = resolveScoped(selected);

      form.setFieldValue('question', '');

      if (scoped) {
        const params = new URLSearchParams({ ask: trimmed });
        router.push(`/v/${encodeURIComponent(scoped.id)}?${params.toString()}`);
        return;
      }

      void sendMessage({ text: trimmed });
    },
  });

  const actions = useMemo<AskFormActions>(
    () => ({
      setQuestion: next => {
        form.setFieldValue('question', next);
      },
      setSelectedId: id => {
        form.setFieldValue('selectedId', id);
        form.setErrorMap({});
      },
      clearSubmitError: () => {
        form.setErrorMap({});
      },
      clearScope: () => {
        form.setFieldValue('selectedId', null);
        form.setErrorMap({});
      },
      applyStarter: suggestion => {
        if (isChatBusy(chatStore.getState().status)) return;
        const selectedId = form.store.state.values.selectedId;
        const scoped = resolveScoped(resolveSelected(broadcastsRef.current, selectedId));
        form.setErrorMap({});
        form.setFieldValue('question', starterPrompt(suggestion, scoped));
      },
      submit: () => {
        void form.handleSubmit();
      },
    }),
    [chatStore, form],
  );

  const meta = useMemo<AskFormMeta>(() => ({ broadcasts }), [broadcasts]);

  return (
    <AskFormApiContext value={form}>
      <AskFormMetaContext value={meta}>
        <AskFormActionsContext value={actions}>{children}</AskFormActionsContext>
      </AskFormMetaContext>
    </AskFormApiContext>
  );
}

interface ChatInterfaceProps {
  broadcasts: ChatBroadcastOption[];
}

export function ChatInterface({ broadcasts }: ChatInterfaceProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: () => ({ timezone: browserTimeZone() }) }),
    [],
  );

  useChat({
    id: 'general',
    transport,
  });

  const hasMessages = useMessageCount() > 0;

  return (
    <AskFormProvider broadcasts={broadcasts}>
      {hasMessages ? <ActiveChatInterface /> : <EmptyChatInterface />}
    </AskFormProvider>
  );
}

function EmptyChatInterface() {
  return (
    <div className="flex w-full flex-col gap-6">
      <EmptyChatHeader />
      <div className="mt-auto flex w-full shrink-0 flex-col gap-2">
        <EmptyChatSuggestions />
        <ChatScopeChip />
        <EmptyAskComposer />
        <EmptyChatFooter />
      </div>
    </div>
  );
}

function ActiveChatInterface() {
  return (
    <div className="flex h-[calc(100dvh-6.5rem-env(safe-area-inset-bottom,0px))] min-h-0 w-full flex-col gap-4">
      <ActiveChatHeader />
      <Conversation className="min-h-0 w-full flex-1 overflow-hidden">
        <ConversationContent className="gap-4 px-0 py-2">
          <ChatInterfaceMessages />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="flex w-full shrink-0 flex-col gap-2">
        <ChatScopeChip />
        <ActiveAskComposer />
        <ActiveChatAlert />
      </div>
    </div>
  );
}

function EmptyChatHeader() {
  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b pb-4">
      <h1 className="font-heading max-w-2xl text-2xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-3xl">
        Desk assistant
      </h1>
      <p className="text-muted-foreground max-w-xl text-sm text-pretty">
        Ask about the desk, uploads, or how grounded Q&A works. Add a broadcast to open it and ask against the footage.
      </p>
    </header>
  );
}

function ActiveChatHeader() {
  return (
    <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b pb-4">
      <h1 className="min-w-0 text-base font-medium text-pretty">Desk assistant</h1>
    </header>
  );
}

function ChatInterfaceMessages() {
  const messageIds = useMessageIds();
  const error = useChatError();
  const busy = useAskFormBusy();
  const lastMessageId = messageIds[messageIds.length - 1];

  return (
    <>
      {messageIds.map(messageId => (
        <ChatInterfaceMessage key={messageId} messageId={messageId} busy={busy} isLast={messageId === lastMessageId} />
      ))}
      <ChatInterfaceLoadingShimmer />
      {error ? (
        <p role="alert" className="text-destructive text-xs text-pretty">
          {error.message || 'Something went wrong. Try asking again.'}
        </p>
      ) : null}
    </>
  );
}

function ChatInterfaceMessage({ messageId, busy, isLast }: { messageId: string; busy: boolean; isLast: boolean }) {
  const message = useMessageById(messageId);
  const { sendMessage, regenerate } = useChatActions();
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
  const sourceCount = countMessageSources(message.parts);

  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, i) =>
          part.type === 'text' ? <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse> : null,
        )}
      </MessageContent>
      {!isStreamingAssistant && responseText ? (
        <AssistantMessageActions
          text={responseText}
          sourceCount={sourceCount}
          onFeedbackAction={feedback => submitChatFeedback(message.id, feedback)}
        />
      ) : null}
    </Message>
  );
}

function ChatInterfaceLoadingShimmer() {
  const show = useChatStore(state => shouldShowLoadingShimmer(state.status, state.messages));

  if (!show) return null;

  return <p className="shimmer text-muted-foreground text-xs">Thinking…</p>;
}

function EmptyChatSuggestions() {
  const busy = useAskFormBusy();
  const { scoped } = useAskFormSelection();
  const { applyStarter } = useAskFormActions();
  const starters = buildStarters(scoped);

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

function ChatScopeChip() {
  const busy = useAskFormBusy();
  const { selected } = useAskFormSelection();
  const { clearScope } = useAskFormActions();

  if (!selected) return null;

  return (
    <div className="flex w-full flex-wrap gap-2" aria-label="Selected broadcast">
      <ScopeChip broadcast={selected} disabled={busy} onRemove={clearScope} />
    </div>
  );
}

function AskQuestionField({
  placeholder,
  ariaLabel,
  alertMessage,
}: {
  placeholder: string;
  ariaLabel: string;
  alertMessage: string | null;
}) {
  const question = useAskFormQuestion();
  const busy = useAskFormBusy();
  const { setQuestion, clearSubmitError } = useAskFormActions();

  return (
    <PromptInputTextarea
      value={question}
      onChange={event => {
        setQuestion(event.currentTarget.value);
        if (alertMessage) clearSubmitError();
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={alertMessage ? true : undefined}
      className="min-h-16 resize-none border-0 bg-transparent px-3 pt-3 pb-2 text-base shadow-none focus-visible:ring-0"
      spellCheck
      autoComplete="off"
      autoFocus
      data-1p-ignore
      data-lpignore="true"
      disabled={busy}
    />
  );
}

function ScopedAskSubmit() {
  const question = useAskFormQuestion();
  const busy = useAskFormBusy();

  return (
    <PromptInputSubmit status="ready" disabled={!question.trim() && !busy} aria-label="Open broadcast and ask">
      <ArrowUpIcon className="size-4" />
    </PromptInputSubmit>
  );
}

function GeneralAskSubmit() {
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

function AskComposerFrame({ children, tools, submit }: { children: ReactNode; tools?: ReactNode; submit: ReactNode }) {
  const { submit: handleSubmit } = useAskFormActions();

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className="w-full **:data-[slot=input-group]:h-auto **:data-[slot=input-group]:overflow-visible"
    >
      {children}
      <PromptInputFooter className="border-border/60 justify-between border-t px-2 pt-2 pb-2">
        <PromptInputTools>{tools}</PromptInputTools>
        {submit}
      </PromptInputFooter>
    </PromptInput>
  );
}

function EmptyScopedAskComposer({ alertMessage }: { alertMessage: string | null }) {
  const busy = useAskFormBusy();
  const { selectedId } = useAskFormSelection();
  const { setSelectedId } = useAskFormActions();
  const { broadcasts } = useAskFormMeta();

  return (
    <AskComposerFrame
      tools={
        <BroadcastPicker
          broadcasts={broadcasts}
          selectedId={selectedId}
          disabled={busy}
          onSelectedIdChange={setSelectedId}
        />
      }
      submit={<ScopedAskSubmit />}
    >
      <AskQuestionField
        placeholder="Was there any news about…?"
        ariaLabel="Ask about a claim — opens that broadcast"
        alertMessage={alertMessage}
      />
    </AskComposerFrame>
  );
}

function EmptyGeneralAskComposer({ alertMessage }: { alertMessage: string | null }) {
  const busy = useAskFormBusy();
  const { selectedId } = useAskFormSelection();
  const { setSelectedId } = useAskFormActions();
  const { broadcasts } = useAskFormMeta();

  return (
    <AskComposerFrame
      tools={
        <BroadcastPicker
          broadcasts={broadcasts}
          selectedId={selectedId}
          disabled={busy}
          onSelectedIdChange={setSelectedId}
        />
      }
      submit={<GeneralAskSubmit />}
    >
      <AskQuestionField placeholder="Ask a question…" ariaLabel="Ask the desk assistant" alertMessage={alertMessage} />
    </AskComposerFrame>
  );
}

function ActiveScopedAskComposer({ alertMessage }: { alertMessage: string | null }) {
  return (
    <AskComposerFrame submit={<ScopedAskSubmit />}>
      <AskQuestionField
        placeholder="Was there any news about…?"
        ariaLabel="Ask about a claim — opens that broadcast"
        alertMessage={alertMessage}
      />
    </AskComposerFrame>
  );
}

function ActiveGeneralAskComposer({ alertMessage }: { alertMessage: string | null }) {
  return (
    <AskComposerFrame submit={<GeneralAskSubmit />}>
      <AskQuestionField placeholder="Ask a question…" ariaLabel="Ask the desk assistant" alertMessage={alertMessage} />
    </AskComposerFrame>
  );
}

function EmptyAskComposer() {
  const { scoped } = useAskFormSelection();
  const submitError = useAskFormSubmitError();
  const error = useChatError();
  const alertMessage = submitError ?? (error ? error.message || 'Something went wrong. Try asking again.' : null);

  if (scoped) return <EmptyScopedAskComposer alertMessage={alertMessage} />;
  return <EmptyGeneralAskComposer alertMessage={alertMessage} />;
}

function ActiveAskComposer() {
  const { scoped } = useAskFormSelection();
  const submitError = useAskFormSubmitError();

  if (scoped) return <ActiveScopedAskComposer alertMessage={submitError} />;
  return <ActiveGeneralAskComposer alertMessage={submitError} />;
}

function ScopedEmptyHint() {
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      Submit opens that broadcast and asks there, with timestamp citations.
    </p>
  );
}

function GeneralEmptyHint() {
  return (
    <p className="text-muted-foreground text-xs text-pretty">
      General help by default. Add a broadcast to ask against footage.
    </p>
  );
}

function EmptyChatFooter() {
  const { scoped } = useAskFormSelection();
  const submitError = useAskFormSubmitError();
  const error = useChatError();
  const alertMessage = submitError ?? (error ? error.message || 'Something went wrong. Try asking again.' : null);

  if (alertMessage) {
    return (
      <p role="alert" className="text-destructive text-xs text-pretty">
        {alertMessage}
      </p>
    );
  }

  if (scoped) return <ScopedEmptyHint />;
  return <GeneralEmptyHint />;
}

function ActiveChatAlert() {
  const submitError = useAskFormSubmitError();

  if (!submitError) return null;

  return (
    <p role="alert" className="text-destructive text-xs text-pretty">
      {submitError}
    </p>
  );
}
