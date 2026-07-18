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

/**
 * Parses and validates the UIMessage array from a chat request body. Returns
 * the messages, or the 400 Response to return directly when the body is
 * malformed or the history fails validation.
 */
export async function parseChatRequest(req: Request): Promise<UIMessage[] | Response> {
  let rawMessages: unknown;
  try {
    ({ messages: rawMessages } = (await req.json()) as { messages?: unknown });
  } catch {
    return new Response('Invalid request body. Expected JSON with messages.', { status: 400 });
  }
  try {
    return await validateUIMessages({ messages: rawMessages });
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
