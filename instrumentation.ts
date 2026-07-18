import * as Sentry from '@sentry/nextjs';

/**
 * Boots two in-process concerns on server start:
 * - Sentry: the server config on Node, the edge config on the edge runtime.
 * - Workflow "Postgres World": starts the graphile-worker that drains the
 *   pipeline queue. Node only — the edge runtime has no worker to run.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');

    const { getWorld } = await import('workflow/runtime');
    await getWorld().start?.();
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
