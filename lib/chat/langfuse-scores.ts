import 'server-only';

import { LangfuseClient } from '@langfuse/client';

/**
 * Score names follow the "name the signal, not the hoped-for metric" rule: a
 * thumb tells us the user's reaction, not what was wrong — the reason score and
 * comment carry that. Keep these stable so dashboards can aggregate over time.
 */
const THUMBS_SCORE = 'user-thumbs';
const REASON_SCORE = 'user-thumbs-reason';

const langfuse = new LangfuseClient();

export interface ChatFeedback {
  /** Langfuse trace id — the assistant message id stamped by streamChatResponse. */
  traceId: string;
  sentiment: 'up' | 'down';
  /** Structured reason from the negative-feedback panel (down only). */
  category?: string;
  comment?: string;
}

export async function recordChatFeedback({ traceId, sentiment, category, comment }: ChatFeedback): Promise<void> {
  const scoreComment = comment || undefined;

  langfuse.score.create({
    traceId,
    name: THUMBS_SCORE,
    value: sentiment === 'up' ? 1 : 0,
    dataType: 'BOOLEAN',
    comment: scoreComment,
  });

  if (sentiment === 'down' && category) {
    langfuse.score.create({
      traceId,
      name: REASON_SCORE,
      value: category,
      dataType: 'CATEGORICAL',
      comment: scoreComment,
    });
  }

  await langfuse.flush();
}
