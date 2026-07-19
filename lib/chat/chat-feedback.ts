export interface ChatFeedbackInput {
  sentiment: 'up' | 'down';
  category?: string;
  comment?: string;
}

/**
 * Posts a thumbs rating to the scoring endpoint. Best-effort: feedback must never
 * break the chat, so failures (including a stale message id from before tracing
 * was wired) resolve to `false` rather than throw.
 */
export async function submitChatFeedback(traceId: string, input: ChatFeedbackInput): Promise<boolean> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ traceId, ...input }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
