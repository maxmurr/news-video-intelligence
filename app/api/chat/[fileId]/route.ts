import { getInjection } from '@/di/container';
import { isValidBroadcastId } from '@/lib/artifacts';
import { parseChatRequest, streamChatResponse } from '@/lib/chat-stream';
import { formatStoryList, type HeadlineItem } from '@/lib/schemas';
import { NotFoundError } from '@/src/entities/errors/common';

/**
 * Grounds every answer in the broadcast: the full timestamped transcript plus
 * the detected story list go into the system prompt, and the model must cite
 * transcript timestamps so the client can turn each citation into a
 * jump-to-moment button on the video.
 */
function broadcastSystemPrompt(transcript: string, storyList: string | null): string {
  return [
    'You are a news assistant for one specific news broadcast. You are given its full timestamped transcript' +
      (storyList ? ' and the list of stories detected in it.' : '.'),
    '',
    'Rules:',
    '- Answer using ONLY the transcript. Never use outside knowledge to add facts.',
    '- Cite the supporting moment for every factual claim as a timestamp in square brackets, e.g. [04:32],' +
      ' using timestamps that appear in the transcript. The user can click these to jump to that moment in the video.' +
      ' Put each timestamp in its own brackets ([04:32] [05:10]), never a comma-separated list in one pair.',
    '- When the user asks to see or show a clip, point them to the relevant timestamp citation.',
    '- If the broadcast does not cover what the user asked, say so plainly and do not guess.',
    '- If a topic appears more than once, mention each occurrence with its own timestamp.',
    '- Resolve follow-up questions against the earlier conversation (e.g. "where did it happen?" refers to the story just discussed).',
    '- Keep answers short: a few sentences, plain text. No markdown headings, bullets only when listing multiple stories.',
    '',
    ...(storyList ? ['Detected stories:', storyList, ''] : []),
    'Full timestamped transcript:',
    transcript,
  ].join('\n');
}

export async function POST(req: Request, ctx: RouteContext<'/api/chat/[fileId]'>) {
  const { fileId } = await ctx.params;
  if (!isValidBroadcastId(fileId)) {
    return new Response('Invalid broadcast id.', { status: 400 });
  }

  // Needs only the already-validated id, so it overlaps the body parse and
  // message validation below. The no-op catch keeps an early 400 return from
  // surfacing the lookup as an unhandled rejection.
  const contextPromise = getInjection('IGetChatContextController')(fileId);
  contextPromise.catch(() => {});

  const parsed = await parseChatRequest(req);
  if (parsed instanceof Response) return parsed;

  let transcript: string | null;
  let headlines: HeadlineItem[];
  try {
    ({ transcript, headlines } = await contextPromise);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response(`Broadcast not found: ${fileId}`, { status: 404 });
    }
    throw error;
  }

  if (transcript === null) {
    return new Response('This broadcast is still being transcribed. Try again shortly.', { status: 409 });
  }

  const storyList = headlines.length > 0 ? formatStoryList(headlines, s => s.headline) : null;

  return streamChatResponse(broadcastSystemPrompt(transcript, storyList), parsed);
}
