'use client';

import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import type { StoryCard } from '@/lib/broadcast-types';
import { timestampToSeconds } from '@/lib/timestamps';
import { cn } from '@/lib/utils';

function storyContainsTime(story: StoryCard, seconds: number, isLast: boolean): boolean {
  const start = timestampToSeconds(story.startTime);
  const end = timestampToSeconds(story.endTime);
  if (isLast) return seconds >= start && seconds <= end;
  return seconds >= start && seconds < end;
}

/** Index of the story covering `activeSeconds`, or the latest story that has started. */
export function activeStoryIndex(stories: StoryCard[], activeSeconds: number | null): number | null {
  if (activeSeconds === null || stories.length === 0) return null;

  for (let i = 0; i < stories.length; i++) {
    if (storyContainsTime(stories[i], activeSeconds, i === stories.length - 1)) return i;
  }

  let best: number | null = null;
  for (let i = 0; i < stories.length; i++) {
    if (timestampToSeconds(stories[i].startTime) <= activeSeconds) best = i;
  }
  return best;
}

function headlinesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function StoryRow({
  story,
  onSeek,
  priority = false,
  active = false,
  isLead = false,
}: {
  story: StoryCard;
  onSeek: (seconds: number) => void;
  priority?: boolean;
  active?: boolean;
  /** True when this row restates the page lead — show segment copy, not a second title. */
  isLead?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSeek(timestampToSeconds(story.startTime))}
        aria-label={
          isLead
            ? `Play lead segment from ${story.startTime} to ${story.endTime}: ${story.headline}`
            : `Play from ${story.startTime} to ${story.endTime}: ${story.headline}`
        }
        aria-current={active ? 'true' : undefined}
        className={cn(
          'bg-card hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 grid w-full cursor-pointer grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 rounded-lg border p-2 text-left transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:outline-none sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4',
          active && 'border-primary bg-muted/40 ring-primary/15 ring-1',
        )}
      >
        <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-md">
          {story.frameUrl ? (
            <Image
              src={story.frameUrl}
              alt={story.frameReason ?? story.headline}
              fill
              priority={priority}
              sizes="(max-width: 640px) 6rem, 8rem"
              className="object-cover"
              unoptimized
            />
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
          {active && (
            <span className="absolute top-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
              Now playing
            </span>
          )}
          <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-xs font-medium text-white tabular-nums">
            {story.startTime}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
          {isLead ? (
            <>
              <span className="text-muted-foreground text-xs leading-none font-medium">Lead segment</span>
              <p className="text-muted-foreground line-clamp-2 max-w-[56ch] text-xs leading-snug wrap-break-word">
                {story.summary}
              </p>
            </>
          ) : (
            <>
              <span className="font-heading block text-base leading-snug font-semibold tracking-[-0.015em] text-balance wrap-break-word">
                {story.headline}
              </span>
              <p className="text-muted-foreground line-clamp-2 max-w-[56ch] text-sm leading-normal wrap-break-word">
                {story.summary}
              </p>
            </>
          )}
        </div>
      </button>
    </li>
  );
}

function StoryRowSkeleton() {
  return (
    <li className="grid grid-cols-[6rem_minmax(0,1fr)] items-start gap-3 rounded-lg border p-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <Skeleton className="aspect-video w-full rounded-md" />
      <div className="flex flex-col gap-1.5 py-0.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </li>
  );
}

export function StoryGrid({
  stories,
  pending,
  onSeekAction,
  activeSeconds = null,
  leadHeadline = null,
}: {
  stories: StoryCard[];
  /** True while headlines/frames are still being generated. */
  pending: boolean;
  /** Jump the broadcast player to a story’s start. */
  onSeekAction: (seconds: number) => void;
  /** Current playback / last seek time in seconds — drives “Now playing”. */
  activeSeconds?: number | null;
  /** Page lead headline — matching row omits a duplicate title. */
  leadHeadline?: string | null;
}) {
  if (stories.length === 0 && pending) {
    return (
      <section className="flex flex-col gap-3" aria-busy="true" aria-labelledby="stories-heading">
        <h2 id="stories-heading" className="text-base font-medium">
          Stories
        </h2>
        <ul className="flex flex-col gap-2" aria-label="Stories loading">
          <StoryRowSkeleton />
          <StoryRowSkeleton />
          <StoryRowSkeleton />
        </ul>
      </section>
    );
  }

  if (stories.length === 0) {
    return (
      <section className="flex flex-col gap-3" aria-labelledby="stories-heading">
        <h2 id="stories-heading" className="text-base font-medium">
          Stories
        </h2>
        <p className="text-muted-foreground text-sm" role="status">
          We found no stories in this broadcast.
        </p>
      </section>
    );
  }

  const activeIndex = activeStoryIndex(stories, activeSeconds);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="stories-heading">
      <h2 id="stories-heading" className="text-base font-medium">
        Stories
      </h2>
      <ul className="flex flex-col gap-2">
        {stories.map((story, i) => {
          const isLead = leadHeadline != null && headlinesMatch(story.headline, leadHeadline);
          return (
            <StoryRow
              key={`${story.startTime}-${i}`}
              story={story}
              onSeek={onSeekAction}
              priority={i === 0}
              active={i === activeIndex}
              isLead={isLead}
            />
          );
        })}
      </ul>
    </section>
  );
}
