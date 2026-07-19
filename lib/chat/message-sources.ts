import { TIMESTAMP_PATTERN, timestampToSeconds } from '@/lib/timestamps';

export interface ChatMessageSource {
  sourceId: string;
  title: string;
  /** Broadcast detail path without a seek query. */
  href: string;
  timestamps: string[];
}

function broadcastHref(url: string, sourceId: string): string {
  try {
    const parsed = new URL(url, 'http://local.invalid');
    if (parsed.pathname.startsWith('/v/')) return parsed.pathname;
  } catch {
    // Fall through to the canonical path.
  }
  return `/v/${encodeURIComponent(sourceId)}`;
}

function timecodeFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://local.invalid');
    const raw = parsed.searchParams.get('t')?.trim() ?? '';
    return TIMESTAMP_PATTERN.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Groups `source-url` / `source-document` parts by broadcast. Multiple moments
 * from the same footage collapse into one row with a timecode list.
 */
export function collectMessageSources(
  parts: ReadonlyArray<{ type: string; [key: string]: unknown }>,
): ChatMessageSource[] {
  const byId = new Map<string, { title: string; href: string; timestamps: Set<string> }>();

  for (const part of parts) {
    if (part.type !== 'source-url' && part.type !== 'source-document') continue;
    const sourceId = typeof part.sourceId === 'string' ? part.sourceId : null;
    if (!sourceId) continue;

    const title =
      typeof part.title === 'string' && part.title.trim().length > 0 ? part.title.trim() : 'Untitled broadcast';
    const url = typeof part.url === 'string' ? part.url : `/v/${encodeURIComponent(sourceId)}`;
    const href = broadcastHref(url, sourceId);
    const timestamp = part.type === 'source-url' ? timecodeFromUrl(url) : null;

    const existing = byId.get(sourceId);
    if (existing) {
      if (timestamp) existing.timestamps.add(timestamp);
      continue;
    }

    byId.set(sourceId, {
      title,
      href,
      timestamps: new Set(timestamp ? [timestamp] : []),
    });
  }

  return [...byId.entries()].map(([sourceId, value]) => ({
    sourceId,
    title: value.title,
    href: value.href,
    timestamps: [...value.timestamps].sort((a, b) => timestampToSeconds(a) - timestampToSeconds(b)),
  }));
}

export function countMessageSources(parts: ReadonlyArray<{ type: string; [key: string]: unknown }>): number {
  return collectMessageSources(parts).length;
}

export function broadcastSeekHref(sourceId: string, timestamp: string): string {
  const params = new URLSearchParams({ t: timestamp });
  return `/v/${encodeURIComponent(sourceId)}?${params.toString()}`;
}
