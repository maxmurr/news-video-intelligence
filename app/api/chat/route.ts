import { parseChatRequest, streamChatResponse } from '@/lib/chat-stream';
import { formatDateTimeContext } from '@/lib/dates';

/**
 * General-purpose assistant with no broadcast grounding. Broadcast-scoped
 * Q&A lives at /api/chat/[fileId].
 */
const GENERAL_SYSTEM_PROMPT = [
  'You are a helpful, concise assistant.',
  'Answer plainly in a few sentences unless the user asks for more detail.',
  'If you are unsure about something, say so instead of guessing.',
].join('\n');

export async function POST(req: Request) {
  const parsed = await parseChatRequest(req);
  if (parsed instanceof Response) return parsed;

  const system = `${GENERAL_SYSTEM_PROMPT}\n\n${formatDateTimeContext(new Date(), parsed.timezone)}`;
  return streamChatResponse(system, parsed.messages);
}
