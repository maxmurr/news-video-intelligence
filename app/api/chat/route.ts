import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  smoothStream,
  streamText,
  toUIMessageStream,
  type UIMessage,
  validateUIMessages,
} from 'ai';
import { getInjection } from '@/di/container';
import { isValidUploadFilename } from '@/lib/artifacts';
import { MODELS } from '@/lib/models';
import { formatStoryList } from '@/lib/schemas';
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

export async function POST(req: Request) {
  let rawMessages: unknown;
  let filename: unknown;
  try {
    ({ messages: rawMessages, filename } = (await req.json()) as { messages?: unknown; filename?: unknown });
  } catch {
    return new Response('Invalid request body. Expected JSON with messages.', { status: 400 });
  }

  if (!isValidUploadFilename(filename)) {
    return new Response('Invalid filename. Expected a .mp4 file in uploads.', { status: 400 });
  }

  let messages: UIMessage[];
  try {
    messages = await validateUIMessages({ messages: rawMessages });
  } catch {
    return new Response('Invalid message history.', { status: 400 });
  }

  let transcript: string | null;
  let headlines: { startTime: string; endTime: string; headline: string; summary: string }[];
  try {
    ({ transcript, headlines } = await getInjection('IGetChatContextController')(filename));
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response(`File not found: ${filename}`, { status: 404 });
    }
    throw error;
  }

  if (transcript === null) {
    return new Response('This broadcast is still being transcribed. Try again shortly.', { status: 409 });
  }

  const storyList = headlines.length > 0 ? formatStoryList(headlines, s => s.headline) : null;

  const result = streamText({
    model: MODELS.chat,
    system: broadcastSystemPrompt(transcript, storyList),
    messages: await convertToModelMessages(messages),
    experimental_transform: smoothStream({
      delayInMs: 20,
      chunking: 'word',
    }),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => 'The assistant hit an error answering. Try asking again.',
    }),
  });
}
