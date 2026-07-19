import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
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

const STREAM_ERROR = 'The assistant hit an error answering. Try asking again.';

/** Streams a chat completion under the given system prompt as a UI message stream. */
export async function streamChatResponse(
  system: string,
  messages: UIMessage[],
  sources: ChatSource[] = [],
): Promise<Response> {
  // Captured here, inside the observe() context, before the handler returns:
  //  - traceId stamps the assistant message so the client can score this trace.
  //  - rootSpan lets us write the streamed answer back to the root observation
  //    once the stream settles; the handler (and its active context) is long gone
  //    by onFinish, so the trace output would otherwise stay empty. The route's
  //    observe() uses endOnExit:false to keep this span open until we end it here.
  const traceId = getActiveTraceId();
  const generateTraceMessageId = traceId ? () => traceId : undefined;
  const rootSpan = trace.getActiveSpan();

  // Whichever of onFinish/onError/onAbort settles the stream first ends the root
  // span exactly once; the guard also stops a late second callback from ending an
  // already-ended span or clobbering the recorded output.
  let ended = false;
  const setTraceOutput = (output: string) => {
    if (!rootSpan || ended) return;
    ended = true;
    context.with(trace.setSpan(context.active(), rootSpan), () => updateActiveObservation({ output }));
    rootSpan.end();
    // The stream settles after the route's after() flush has already run, so flush
    // again here — otherwise this just-ended root span waits for the next batch.
    void langfuseSpanProcessor.forceFlush();
  };

  const result = streamText({
    model: MODELS.chat,
    system,
    messages: await convertToModelMessages(messages),
    telemetry: { functionId: 'chat-response' },
    experimental_transform: smoothStream({
      delayInMs: 20,
      chunking: 'word',
    }),
    onFinish: ({ text }) => setTraceOutput(text),
    onError: () => setTraceOutput(STREAM_ERROR),
    // A client abort (stop button, navigation) fires neither onFinish nor onError,
    // so without this the root span never ends and the trace is lost. Record any
    // text streamed before the abort.
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

  // Setup succeeded, so a callback is guaranteed to settle the stream and end the
  // span; claim it from the route wrapper (which would otherwise end it on return).
  if (rootSpan) deferSpanEndToStream(rootSpan);

  return createUIMessageStreamResponse({ stream });
}
