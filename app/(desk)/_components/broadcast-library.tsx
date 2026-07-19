'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { BroadcastCard } from '@/components/broadcast/broadcast-card';
import { useHydrated } from '@/components/broadcast/use-local-date-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DeskBroadcastRow } from '@/lib/broadcast-types';
import { formatDayHeading, localDayKey, utcDayKey } from '@/lib/dates';

const PREVIEW_LIMIT = 5;

function groupBroadcastsByDay(
  broadcasts: DeskBroadcastRow[],
  useLocalDays: boolean,
): { day: string; items: DeskBroadcastRow[] }[] {
  const keyFor = useLocalDays ? localDayKey : utcDayKey;
  const groups = new Map<string, DeskBroadcastRow[]>();
  for (const broadcast of broadcasts) {
    const key = keyFor(broadcast.uploadedAt) ?? broadcast.uploadedAt.slice(0, 10);
    const bucket = groups.get(key);
    if (bucket) bucket.push(broadcast);
    else groups.set(key, [broadcast]);
  }
  return Array.from(groups.entries()).map(([day, items]) => ({ day, items }));
}

function matchesQuery(broadcast: DeskBroadcastRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const headline = broadcast.topHeadline?.toLowerCase() ?? '';
  const visibleId = broadcast.filename.split('-')[0]?.toLowerCase() ?? '';
  return headline.includes(q) || visibleId.includes(q) || broadcast.id.toLowerCase().startsWith(q);
}

function broadcastNoun(count: number): string {
  return count === 1 ? 'broadcast' : 'broadcasts';
}

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

export function BroadcastLibrary({ broadcasts }: { broadcasts: DeskBroadcastRow[] }) {
  const [query, setQuery] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const deferredQuery = React.useDeferredValue(query);
  const hydrated = useHydrated();

  const filtered = React.useMemo(
    () => broadcasts.filter(broadcast => matchesQuery(broadcast, deferredQuery)),
    [broadcasts, deferredQuery],
  );

  const isFiltering = deferredQuery.trim().length > 0;
  const isPreviewCapped = !expanded && !isFiltering && filtered.length > PREVIEW_LIMIT;
  const visible = isPreviewCapped ? filtered.slice(0, PREVIEW_LIMIT) : filtered;
  const overflow = filtered.length - visible.length;
  const groups = groupBroadcastsByDay(visible, hydrated);
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
              const next = event.target.value;
              setQuery(next);
              if (next.trim()) React.startTransition(() => setExpanded(true));
            }}
            placeholder="Search by headline or file ID"
            aria-label="Search broadcasts"
            className="pl-8"
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums" aria-live="polite">
          {countLabel}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-muted-foreground text-sm text-pretty">Try another headline or file ID.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>
            Clear search
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(group => (
            <div
              key={group.day}
              className="flex flex-col gap-2 [contain-intrinsic-size:auto_12rem] [content-visibility:auto]"
            >
              <h3 className="text-muted-foreground text-xs font-medium">{formatDayHeading(group.day)}</h3>
              <ul className="flex flex-col gap-2">
                {group.items.map(broadcast => (
                  <li key={broadcast.id} className="[contain-intrinsic-size:auto_4.5rem] [content-visibility:auto]">
                    <BroadcastCard broadcast={broadcast} timeOnly />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!isFiltering && overflow > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => React.startTransition(() => setExpanded(true))}
        >
          View all {filtered.length} {broadcastNoun(filtered.length)}
        </Button>
      ) : null}

      {!isFiltering && expanded && filtered.length > PREVIEW_LIMIT ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => React.startTransition(() => setExpanded(false))}
        >
          Show {PREVIEW_LIMIT} most recent
        </Button>
      ) : null}
    </div>
  );
}
