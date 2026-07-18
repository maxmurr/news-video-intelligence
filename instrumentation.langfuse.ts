import { registerTelemetry } from 'ai';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { getLangfuseTracer, setLangfuseTracerProvider } from '@langfuse/tracing';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';

const MAX_TRACED_STRING = 20_000;

/**
 * Redacts oversized string payloads before a span is exported. The transcription
 * and frame-picking stages send base64 audio/video as model input; without this
 * those blobs would bloat every trace and leak media into Langfuse. Model output
 * (transcript, story picks) is small and stays intact.
 */
function redactLargePayloads(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_TRACED_STRING ? `[redacted ${value.length} chars]` : value;
  }
  if (depth >= 8) return value;
  if (Array.isArray(value)) return value.map(item => redactLargePayloads(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactLargePayloads(item, depth + 1)]));
  }
  return value;
}

/**
 * Held at module scope so request handlers can force a flush before a serverless
 * invocation freezes (see the chat route). Credentials and base URL come from the
 * LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL env vars.
 */
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  environment: process.env.NODE_ENV,
  mask: ({ data }) => redactLargePayloads(data),
});

let registered = false;

/**
 * Wires AI SDK telemetry to Langfuse through an isolated tracer provider. Sentry
 * already owns the global OpenTelemetry provider, so Langfuse gets its own: AI
 * spans export to Langfuse without being subject to Sentry's sampling or context
 * propagation, and Sentry's own instrumentation is untouched.
 */
export function setupLangfuseTelemetry(): void {
  if (registered) return;
  registered = true;

  const provider = new NodeTracerProvider({ spanProcessors: [langfuseSpanProcessor] });
  setLangfuseTracerProvider(provider);

  registerTelemetry(new LangfuseVercelAiSdkIntegration({ tracer: getLangfuseTracer() }));
}
