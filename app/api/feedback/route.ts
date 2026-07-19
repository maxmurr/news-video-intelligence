import { isNegativeFeedbackCategory } from '@/lib/chat/chat-feedback-categories';
import { recordChatFeedback } from '@/lib/chat/langfuse-scores';

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/i;
const MAX_COMMENT_LENGTH = 2000;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body.', { status: 400 });
  }

  const { traceId, sentiment, category, comment } = (body ?? {}) as Record<string, unknown>;

  if (typeof traceId !== 'string' || !TRACE_ID_PATTERN.test(traceId)) {
    return new Response('Invalid traceId.', { status: 400 });
  }
  if (sentiment !== 'up' && sentiment !== 'down') {
    return new Response('Invalid sentiment.', { status: 400 });
  }

  try {
    await recordChatFeedback({
      traceId,
      sentiment,
      category: isNegativeFeedbackCategory(category) ? category : undefined,
      comment: typeof comment === 'string' ? comment.slice(0, MAX_COMMENT_LENGTH) : undefined,
    });
  } catch {
    return new Response('Failed to record feedback.', { status: 502 });
  }

  return new Response(null, { status: 204 });
}
