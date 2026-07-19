import { observe } from '@langfuse/tracing';
import { trace, type Span } from '@opentelemetry/api';
import { after } from 'next/server';

import { langfuseSpanProcessor } from '@/instrumentation.langfuse';

/**
 * streamChatResponse ends the root span itself once the stream settles — it has
 * to, because the streamed answer becomes the trace output long after the handler
 * has returned. Every other outcome (an early error Response, or a throw) returns
 * with the stream never started. observe(endOnExit:false) never ends the span on
 * any path, so without ending it here those routes would leak the span and never
 * export the trace.
 */
const streamOwnedSpans = new WeakSet<Span>();

/** Called by streamChatResponse to take ownership of ending the active span. */
export function deferSpanEndToStream(span: Span): void {
  streamOwnedSpans.add(span);
}

/**
 * Wraps a chat route handler in a Langfuse observation whose span outlives the
 * handler: the stream ends it after settling, and any non-streaming exit ends it
 * here. Also flushes the isolated provider after the response so serverless
 * freezes don't drop queued spans.
 */
export function observeChatRoute<Args extends unknown[]>(
  name: string,
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return observe(
    async (...args: Args): Promise<Response> => {
      after(() => langfuseSpanProcessor.forceFlush());
      try {
        return await handler(...args);
      } finally {
        const span = trace.getActiveSpan();
        if (span && !streamOwnedSpans.delete(span)) span.end();
      }
    },
    { name, captureInput: false, captureOutput: false, endOnExit: false },
  );
}
