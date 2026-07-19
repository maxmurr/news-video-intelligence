import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  pruneMessages,
  smoothStream,
  streamText,
  toUIMessageStream,
  type UIMessage,
  validateUIMessages,
} from 'ai';
import { context, trace } from '@opentelemetry/api';
import { getActiveTraceId, updateActiveObservation } from '@langfuse/tracing';
import { langfuseSpanProcessor } from '@/instrumentation.langfuse';
import { deferSpanEndToStream } from '@/lib/chat/observe-chat-route';
import { MODELS } from '@/lib/models';
import { resolveTimeZone } from '@/lib/dates';

export type ParsedChatRequest = {
  messages: UIMessage[];
  timezone: string;
};

export type ChatSource = {
  sourceId: string;
  url: string;
  title: string;
};

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

const STREAM_ERROR = 'The assistant hit an error answering. Try asking again.';

export async function streamChatResponse(
  system: string,
  messages: UIMessage[],
  sources: ChatSource[] = [],
): Promise<Response> {
  const traceId = getActiveTraceId();
  const generateTraceMessageId = traceId ? () => traceId : undefined;
  const rootSpan = trace.getActiveSpan();

  let ended = false;
  const setTraceOutput = (output: string) => {
    if (!rootSpan || ended) return;
    ended = true;
    context.with(trace.setSpan(context.active(), rootSpan), () => updateActiveObservation({ output }));
    rootSpan.end();
    void langfuseSpanProcessor.forceFlush();
  };

  const recentMessages = messages.length > 10 ? messages.slice(-10) : messages;
  const prunedMessages = pruneMessages({
    messages: await convertToModelMessages(recentMessages),
    emptyMessages: 'remove',
    reasoning: 'all',
  });

  const result = streamText({
    model: MODELS.chat,
    system,
    messages: prunedMessages,
    telemetry: { functionId: 'chat-response' },
    experimental_transform: smoothStream({
      delayInMs: 20,
      chunking: 'word',
    }),
    onFinish: ({ text }) => setTraceOutput(text),
    onError: () => setTraceOutput(STREAM_ERROR),
    onAbort: ({ steps }) => setTraceOutput(steps.map(step => step.text).join('')),
  });

  const stream = createUIMessageStream({
    generateId: generateTraceMessageId,
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
          generateMessageId: generateTraceMessageId,
        }),
      );
    },
    onError: () => STREAM_ERROR,
  });

  if (rootSpan) deferSpanEndToStream(rootSpan);

  return createUIMessageStreamResponse({ stream });
}
