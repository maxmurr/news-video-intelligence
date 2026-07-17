import { PipelineError, type StageResult } from './pipeline';

/**
 * Maps a PipelineError to its HTTP response, or returns null when the error is
 * not a PipelineError (the caller should rethrow). Shared by the buffered JSON
 * stages (via stageResponse) and the streaming transcribe route.
 */
export function pipelineErrorResponse(error: unknown): Response | null {
  if (error instanceof PipelineError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/**
 * Shared HTTP adapter for pipeline stages: renders the stage result as JSON
 * with a hit/miss cache header, and a PipelineError as its status + message.
 * Unexpected errors propagate to the framework handler.
 */
export async function stageResponse<T>(cacheHeader: string, run: () => Promise<StageResult<T>>): Promise<Response> {
  try {
    const { data, cached } = await run();
    return Response.json(data, { headers: { [cacheHeader]: cached ? 'hit' : 'miss' } });
  } catch (error) {
    const mapped = pipelineErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
