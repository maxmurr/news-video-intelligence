import { updateActiveObservation } from '@langfuse/tracing';

import { getInjection } from '@/di/container';
import { latestUserText, parseChatRequest, streamChatResponse, type ChatSource } from '@/lib/chat/chat-stream';
import { formatDateTimeContext } from '@/lib/dates';
import { observeChatRoute } from '@/lib/chat/observe-chat-route';

const GROUNDED_SYSTEM_PROMPT = [
  'You are the desk assistant for a library of analyzed news broadcasts.',
  'Answer ONLY from the library moments provided below in this prompt.',
  'Never use outside knowledge or your own training data to add facts, and never guess.',
  'If the provided moments do not cover the question, reply that the library does not appear to cover it.',
  'Answer plainly in a few sentences unless the user asks for more detail.',
  'Reply in the same language the user wrote their message in, unless they ask you to use another language.',
].join('\n');

const NO_LIBRARY_CONTEXT =
  'No moments in the library matched this question. Tell the user the library does not appear to cover it,' +
  ' and do not answer from outside knowledge.';

interface LibraryHit {
  broadcastId: string;
  startTime: string;
  content: string;
}

function libraryGrounding(hits: LibraryHit[], titles: Map<string, string>): string[] {
  const moments = hits.map(hit => {
    const title = titles.get(hit.broadcastId) ?? 'Untitled broadcast';
    return `- "${title}" [${hit.startTime}] (/v/${hit.broadcastId}): ${hit.content}`;
  });

  return ['These are the moments across the library most relevant to the question:', ...moments];
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

async function handleChat(req: Request): Promise<Response> {
  const parsed = await parseChatRequest(req);
  if (parsed instanceof Response) return parsed;

  const sections = [GROUNDED_SYSTEM_PROMPT];

  const query = latestUserText(parsed.messages);

  updateActiveObservation({ input: query });

  let grounded = false;
  const sources: ChatSource[] = [];
  if (query) {
    try {
      const hits = await getInjection('ISearchLibraryController')({ query });
      if (hits.length > 0) {
        const titles = await broadcastTitles(hits.map(hit => hit.broadcastId));
        sections.push('', ...libraryGrounding(hits, titles));
        grounded = true;

        // One source-url per (broadcast, startTime). The toolbar groups by broadcast
        // and lists each grounded moment as a jumpable timecode.
        const seen = new Set<string>();
        for (const hit of hits) {
          const key = `${hit.broadcastId}\0${hit.startTime}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const params = new URLSearchParams({ t: hit.startTime });
          sources.push({
            sourceId: hit.broadcastId,
            url: `/v/${hit.broadcastId}?${params.toString()}`,
            title: titles.get(hit.broadcastId) ?? 'Untitled broadcast',
          });
        }
      }
    } catch {
      // Leave the assistant ungrounded; it will decline below.
    }
  }
  if (!grounded) sections.push('', NO_LIBRARY_CONTEXT);

  updateActiveObservation({
    metadata: {
      grounded,
      sourceCount: new Set(sources.map(source => source.sourceId)).size,
      momentCount: sources.length,
    },
  });

  sections.push('', formatDateTimeContext(new Date(), parsed.timezone));

  return streamChatResponse(sections.join('\n'), parsed.messages, sources);
}

export const POST = observeChatRoute('desk-assistant-chat', handleChat);
