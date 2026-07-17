'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { BroadcastCard } from '@/components/broadcast/broadcast-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BroadcastSummary } from '@/lib/broadcast-types';

const PREVIEW_LIMIT = 5;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayHeading(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00.000Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function groupBroadcastsByDay(broadcasts: BroadcastSummary[]): { day: string; items: BroadcastSummary[] }[] {
  const groups = new Map<string, BroadcastSummary[]>();
  for (const broadcast of broadcasts) {
    const key = dayKey(broadcast.uploadedAt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(broadcast);
    else groups.set(key, [broadcast]);
  }
  return Array.from(groups.entries()).map(([day, items]) => ({ day, items }));
}

function matchesQuery(broadcast: BroadcastSummary, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const headline = broadcast.topHeadline?.toLowerCase() ?? '';
  const filename = broadcast.filename.toLowerCase();
  return headline.includes(q) || filename.includes(q);
}

function broadcastNoun(count: number): string {
  return count === 1 ? 'broadcast' : 'broadcasts';
}

/** Desk status next to search — never a bare numeral. */
function libraryCountLabel({
  total,
  filtered,
  visible,
  isFiltering,
  isPreviewCapped,
}: {
  total: number;
  filtered: number;
  visible: number;
  isFiltering: boolean;
  isPreviewCapped: boolean;
}): string {
  if (isFiltering) {
    if (filtered === 0) return `0 of ${total} match`;
    if (filtered === total) return `${total} ${broadcastNoun(total)}`;
    return `${filtered} of ${total} match`;
  }
  if (isPreviewCapped) return `Showing ${visible} of ${total}`;
  return `${total} ${broadcastNoun(total)}`;
}

export function BroadcastLibrary({ broadcasts }: { broadcasts: BroadcastSummary[] }) {
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const deferredQuery = React.useDeferredValue(query);

  const filtered = React.useMemo(
    () => broadcasts.filter(broadcast => matchesQuery(broadcast, deferredQuery)),
    [broadcasts, deferredQuery],
  );

  const isFiltering = deferredQuery.trim().length > 0;
  const isPreviewCapped = !expanded && !isFiltering && filtered.length > PREVIEW_LIMIT;
  const visible = isPreviewCapped ? filtered.slice(0, PREVIEW_LIMIT) : filtered;
  const overflow = filtered.length - visible.length;
  const groups = groupBroadcastsByDay(visible);
  const countLabel = libraryCountLabel({
    total: broadcasts.length,
    filtered: filtered.length,
    visible: visible.length,
    isFiltering,
    isPreviewCapped,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              if (event.target.value.trim()) setExpanded(true);
            }}
            placeholder="Search by headline or file id"
            aria-label="Search broadcasts"
            className="pl-8"
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums" aria-live="polite">
          {countLabel}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-pretty">
          No broadcasts match “{query.trim()}”. Try another headline or file id.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(group => (
            <div key={group.day} className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-xs font-medium">{formatDayHeading(group.day)}</h3>
              <ul className="flex flex-col gap-2">
                {group.items.map(broadcast => (
                  <li key={broadcast.filename}>
                    <BroadcastCard broadcast={broadcast} timeOnly />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!isFiltering && overflow > 0 ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setExpanded(true)}>
          View all {filtered.length} {broadcastNoun(filtered.length)}
        </Button>
      ) : null}

      {!isFiltering && expanded && filtered.length > PREVIEW_LIMIT ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setExpanded(false)}>
          Show {PREVIEW_LIMIT} most recent
        </Button>
      ) : null}
    </div>
  );
}
