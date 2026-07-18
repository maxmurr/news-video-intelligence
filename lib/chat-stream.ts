import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  toUIMessageStream,
  type ChatStatus,
  type UIMessage,
  validateUIMessages,
} from 'ai';
import { MODELS } from '@/lib/models';
import { resolveTimeZone } from '@/lib/dates';

export type ParsedChatRequest = {
  messages: UIMessage[];
  /** Viewer's IANA timezone, already narrowed to a valid zone (UTC fallback). */
  timezone: string;
};

/** A broadcast (or other document) the desk assistant grounded its answer in. */
export type ChatSource = {
  sourceId: string;
  url: string;
  title: string;
};

/**
 * Parses and validates a chat request body: the UIMessage history plus the
 * client-sent timezone. Returns the parsed request, or the 400 Response to
 * return directly when the body is malformed or the history fails validation.
 */
export async function parseChatRequest(req: Request): Promise<ParsedChatRequest | Response> {
  let rawMessages: unknown;
  let rawTimezone: unknown;
  try {
    ({ messages: rawMessages, timezone: rawTimezone } = (await req.json()) as {
      messages?: unknown;
      timezone?: unknown;
    });
  } catch {
    return new Response('Invalid request body. Expected JSON with messages.', { status: 400 });
  }
  try {
    const messages = await validateUIMessages({ messages: rawMessages });
    return { messages, timezone: resolveTimeZone(rawTimezone) };
  } catch {
    return new Response('Invalid message history.', { status: 400 });
  }
}

/** The concatenated text of the most recent user message — the retrieval query. */
export function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== 'user') continue;
    return message.parts
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map(part => part.text)
      .join(' ')
      .trim();
  }
  return '';
}

function findLast<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) return items[i];
  }
  return undefined;
}

/**
 * Whether the chat UI should show a "thinking / checking" shimmer.
 * True while the request is submitted, and while streaming until the latest
 * assistant message has any text or reasoning content.
 */
export function shouldShowLoadingShimmer(status: ChatStatus, messages: UIMessage[]): boolean {
  if (status === 'submitted') return true;

  if (status === 'streaming') {
    const lastAssistant = findLast(messages, message => message.role === 'assistant');
    if (!lastAssistant) return true;

    const hasContent = lastAssistant.parts.some(
      part => (part.type === 'text' || part.type === 'reasoning') && part.text.length > 0,
    );

    return !hasContent;
  }

  return false;
}

const STREAM_ERROR = 'The assistant hit an error answering. Try asking again.';

/** Streams a chat completion under the given system prompt as a UI message stream. */
export async function streamChatResponse(
  system: string,
  messages: UIMessage[],
  sources: ChatSource[] = [],
): Promise<Response> {
  const result = streamText({
    model: MODELS.chat,
    system,
    messages: await convertToModelMessages(messages),
    experimental_transform: smoothStream({
      delayInMs: 20,
      chunking: 'word',
    }),
  });

  const stream = createUIMessageStream({
    execute({ writer }) {
      for (const source of sources) {
        writer.write({
          type: 'source-url',
          sourceId: source.sourceId,
          url: source.url,
          title: source.title,
        });
      }
      writer.merge(
        toUIMessageStream({
          stream: result.stream,
          onError: () => STREAM_ERROR,
        }),
      );
    },
    onError: () => STREAM_ERROR,
  });

  return createUIMessageStreamResponse({ stream });
}
