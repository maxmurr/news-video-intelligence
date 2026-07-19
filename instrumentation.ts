import * as Sentry from '@sentry/nextjs';

/**
 * Boots three in-process concerns on server start:
 * - Sentry: the server config on Node, the edge config on the edge runtime.
 * - Langfuse: an isolated OpenTelemetry provider that captures AI SDK spans.
 *   Node only — it uses the Node tracer SDK.
 * - Workflow "Postgres World": starts the graphile-worker that drains the
 *   pipeline queue. Node only — the edge runtime has no worker to run.
 *   Skipped when WORKFLOW_WORKER=0 so a dev server can run without draining
 *   the queue; enqueued jobs wait until a worker-enabled process picks them up.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');

    const { setupLangfuseTelemetry } = await import('./instrumentation.langfuse');
    setupLangfuseTelemetry();

    if (process.env.WORKFLOW_WORKER !== '0') {
      const { getWorld } = await import('workflow/runtime');
      await getWorld().start?.();
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
