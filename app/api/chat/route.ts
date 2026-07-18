import { getInjection } from '@/di/container';
import { latestUserText, parseChatRequest, streamChatResponse } from '@/lib/chat-stream';
import { formatDateTimeContext } from '@/lib/dates';

/**
 * Desk assistant: a general assistant that can also search the user's whole
 * library of analyzed broadcasts. Broadcast-scoped Q&A over a single video lives
 * at /api/chat/[fileId].
 */
const GENERAL_SYSTEM_PROMPT = [
  'You are a helpful, concise assistant for a news video desk.',
  'Answer plainly in a few sentences unless the user asks for more detail.',
  'Reply in the same language the user wrote their message in, unless they ask you to use another language.',
  'If you are unsure about something, say so instead of guessing.',
].join('\n');

interface LibraryHit {
  broadcastId: string;
  startTime: string;
  content: string;
}

/**
 * Adds the retrieved library moments to the prompt and tells the model to ground
 * library answers in them, citing the broadcast and timestamp and linking the
 * broadcast page so the user can open the footage.
 */
function libraryGrounding(hits: LibraryHit[], titles: Map<string, string>): string[] {
  const moments = hits.map(hit => {
    const title = titles.get(hit.broadcastId) ?? 'Untitled broadcast';
    return `- "${title}" [${hit.startTime}] (/v/${hit.broadcastId}): ${hit.content}`;
  });

  return [
    'The user has a library of analyzed news broadcasts. These are the moments across it most relevant to the question:',
    ...moments,
    '',
    'When the question is about the library, ground your answer ONLY in these moments. Cite each fact as the' +
      ' broadcast title followed by its [mm:ss] timestamp, and link the broadcast page as a markdown link when it' +
      ' helps the user open the footage, e.g. [Watch](/v/ID). If none of the moments are relevant, say the library' +
      ' does not appear to cover it. Answer general (non-library) questions normally.',
  ];
}

async function broadcastTitles(broadcastIds: string[]): Promise<Map<string, string>> {
  const rows = await getInjection('IGetBroadcastTitlesController')({ broadcastIds });
  const titles = new Map<string, string>();
  for (const { broadcastId, title } of rows) {
    const trimmed = title.trim();
    if (trimmed.length > 0) titles.set(broadcastId, trimmed);
  }
  return titles;
}

export async function POST(req: Request) {
  const parsed = await parseChatRequest(req);
  if (parsed instanceof Response) return parsed;

  const sections = [GENERAL_SYSTEM_PROMPT];

  // Ground the answer in the most relevant moments across the whole library.
  // No hits (nothing embedded yet) or a retrieval failure leaves the assistant
  // general rather than breaking the chat.
  const query = latestUserText(parsed.messages);
  if (query) {
    try {
      const hits = await getInjection('ISearchLibraryController')({ query });
      if (hits.length > 0) {
        const titles = await broadcastTitles(hits.map(hit => hit.broadcastId));
        sections.push('', ...libraryGrounding(hits, titles));
      }
    } catch {
      // Fall back to the general assistant.
    }
  }

  sections.push('', formatDateTimeContext(new Date(), parsed.timezone));
  return streamChatResponse(sections.join('\n'), parsed.messages);
}
