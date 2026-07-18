import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  toUIMessageStream,
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

/** Streams a chat completion under the given system prompt as a UI message stream. */
export async function streamChatResponse(system: string, messages: UIMessage[]): Promise<Response> {
  const result = streamText({
    model: MODELS.chat,
    system,
    messages: await convertToModelMessages(messages),
    experimental_transform: smoothStream({
      delayInMs: 20,
      chunking: 'word',
    }),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => 'The assistant hit an error answering. Try asking again.',
    }),
  });
}
