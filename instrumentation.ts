/**
 * Starts the Workflow "Postgres World" in-process on server boot so this
 * long-lived Node server also runs the graphile-worker that drains the pipeline
 * queue. The edge runtime has no worker to start, so it's skipped there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'edge') {
    const { getWorld } = await import('workflow/runtime');
    await getWorld().start?.();
  }
}
