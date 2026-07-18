'use client';

import Link from 'next/link';
import * as React from 'react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { ArrowLeft, ChevronUp, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPipelineComplete, type BroadcastDetail, type BroadcastStages } from '@/lib/broadcast-types';
import { broadcastShareUrl, shareOrCopyUrl } from '@/lib/clipboard-share';
import { useLocalDateLabel } from './use-local-date-label';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseTranscriptLines } from '@/lib/timestamps';
import { BroadcastPlayer } from './broadcast-player';
import { ChatPanel } from './chat-panel';
import { analysisConcern, StageProgress } from './stage-progress';
import { activeStoryIndex, StoryGrid } from './story-grid';
import { TranscriptPanel } from './transcript-panel';

const BROADCAST_TABS = ['stories', 'transcript'] as const;
const broadcastTabParser = parseAsStringLiteral(BROADCAST_TABS)
  .withDefault('stories')
  .withOptions({ history: 'replace', shallow: true });

const POLL_INTERVAL_MS = 4000;
/**
 * Fallback stall thresholds, used only when the workflow engine can't report
 * run health (`run.status === 'unknown'`). Transcription of a 30–60 minute
 * broadcast legitimately sits in one stage for many minutes, so its window is
 * much wider than the later, faster stages.
 */
const STALL_AFTER_MS = { transcript: 12 * 60 * 1000, later: 5 * 60 * 1000 } as const;

function stallThreshold(stages: BroadcastStages): number {
  return stages.transcript ? STALL_AFTER_MS.later : STALL_AFTER_MS.transcript;
}

function stagesKey(stages: BroadcastStages): string {
  return `${stages.transcript}-${stages.stories}-${stages.headlines}-${stages.frames}`;
}

function formatSeekClock(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(clamped / 60);
  const rest = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Pipeline timestamps can drift past the real video length; an unclamped seek
 * lands the player in the ended state and plays nothing. Stop half a second
 * short of the end so the cited moment still renders and plays.
 */
function clampToPlayable(media: HTMLVideoElement, seconds: number): number {
  if (!Number.isFinite(media.duration)) return seconds;
  return Math.max(0, Math.min(seconds, media.duration - 0.5));
}

/** Where to scroll after a seek — proof surfaces keep their source in view. */
export type SeekScroll = 'player' | 'none';

export interface SeekOptions {
  scroll?: SeekScroll;
}

/**
 * Client orchestrator for one broadcast: polls pipeline progress until every
 * stage lands, owns the single video element, and routes every "jump to
 * moment" interaction (story cards, chat citations) through one seek handler.
 */
export function BroadcastView({ initial }: { initial: BroadcastDetail }) {
  const [broadcast, setBroadcast] = React.useState(initial);
  const [askOpen, setAskOpen] = React.useState(false);
  const [seekAnnouncement, setSeekAnnouncement] = React.useState('');
  const [activeSeconds, setActiveSeconds] = React.useState<number | null>(null);
  const [stalled, setStalled] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [tab, setTab] = useQueryState('tab', broadcastTabParser);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const headerRef = React.useRef<HTMLElement | null>(null);
  const lastProgressKeyRef = React.useRef(stagesKey(initial.stages));
  /** 0 until the first unchanged poll starts the stall clock. */
  const lastProgressAtRef = React.useRef(0);
  const stagesRef = React.useRef(initial.stages);

  const processing = !isPipelineComplete(broadcast.stages);
  const transcriptReady = broadcast.stages.transcript;

  const refreshBroadcast = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/videos?id=${encodeURIComponent(broadcast.id)}`);
      if (!res.ok) return false;
      const next = (await res.json()) as BroadcastDetail;
      const nextKey = stagesKey(next.stages);
      const now = Date.now();
      stagesRef.current = next.stages;
      if (nextKey !== lastProgressKeyRef.current) {
        lastProgressKeyRef.current = nextKey;
        lastProgressAtRef.current = now;
        setStalled(false);
      } else if (lastProgressAtRef.current === 0) {
        lastProgressAtRef.current = now;
      } else if (now - lastProgressAtRef.current >= stallThreshold(next.stages)) {
        setStalled(true);
      }
      setBroadcast(next);
      return true;
    } catch {
      const now = Date.now();
      if (lastProgressAtRef.current === 0) lastProgressAtRef.current = now;
      else if (now - lastProgressAtRef.current >= stallThreshold(stagesRef.current)) setStalled(true);
      return false;
    }
  }, [broadcast.id]);

  const retryAnalysis = React.useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: broadcast.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Restart failed (${res.status}).`);
      }
      lastProgressAtRef.current = 0;
      setStalled(false);
      toast.success('Analysis restarted', {
        description: 'Finished stages are kept. The pipeline resumes from the first missing one.',
      });
      await refreshBroadcast();
    } catch (error) {
      toast.error('Could not restart analysis', {
        description: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    } finally {
      setRetrying(false);
    }
  }, [broadcast.id, refreshBroadcast]);

  React.useEffect(() => {
    if (!processing) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refreshBroadcast();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [processing, refreshBroadcast]);

  React.useEffect(() => {
    if (!askOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAskOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [askOpen]);

  React.useEffect(() => {
    let attached: HTMLVideoElement | null = null;

    function syncActiveTime() {
      if (!attached) return;
      const time = attached.currentTime;
      setActiveSeconds(previous => {
        if (previous !== null && Math.abs(previous - time) < 0.35) return previous;
        return time;
      });
    }

    function attach(media: HTMLVideoElement) {
      attached = media;
      media.addEventListener('timeupdate', syncActiveTime);
      media.addEventListener('seeked', syncActiveTime);
    }

    const media = videoRef.current;
    if (media) {
      attach(media);
      return () => {
        media.removeEventListener('timeupdate', syncActiveTime);
        media.removeEventListener('seeked', syncActiveTime);
      };
    }

    // Video ref attaches after BroadcastPlayer mounts.
    const retryId = window.setInterval(() => {
      const el = videoRef.current;
      if (!el) return;
      window.clearInterval(retryId);
      attach(el);
    }, 100);

    return () => {
      window.clearInterval(retryId);
      attached?.removeEventListener('timeupdate', syncActiveTime);
      attached?.removeEventListener('seeked', syncActiveTime);
    };
  }, [broadcast.id, broadcast.url]);

  const seekTo = React.useCallback(
    (seconds: number, options?: SeekOptions) => {
      const video = videoRef.current;
      if (!video) return;
      // The highlight and announcement must reflect where playback actually
      // lands, so both derive from the same clamped target as the seek itself.
      const commit = (target: number) => {
        video.currentTime = target;
        setActiveSeconds(target);
        const index = activeStoryIndex(broadcast.stories, target);
        const story = index !== null ? broadcast.stories[index] : undefined;
        const clock = formatSeekClock(target);
        setSeekAnnouncement(story ? `Now playing: ${story.headline} at ${clock}` : `Playing at ${clock}`);
      };
      // Seeking before metadata loads gets clamped to 0 on Safari/iOS.
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        commit(clampToPlayable(video, seconds));
      } else {
        video.addEventListener('loadedmetadata', () => commit(clampToPlayable(video, seconds)), { once: true });
      }
      void video.play().catch(() => {
        // Autoplay can be blocked; the frame is still shown at the right moment.
      });
      // Stories/chat jump to the player. Transcript keeps the clicked line —
      // scrolling the header would yank the proof text out of view.
      if ((options?.scroll ?? 'player') === 'none') return;
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      (headerRef.current ?? video).scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    },
    [broadcast.stories],
  );

  const seekFromTranscript = React.useCallback((seconds: number) => seekTo(seconds, { scroll: 'none' }), [seekTo]);

  const leadHeadline = broadcast.topHeadline?.trim() || null;
  const title = leadHeadline || (processing ? 'Processing…' : 'Untitled broadcast');
  const uploadedLabel = useLocalDateLabel(broadcast.uploadedAt, 'date');
  const activeIndex = activeStoryIndex(broadcast.stories, activeSeconds);
  const activeStory = activeIndex !== null ? broadcast.stories[activeIndex] : null;
  const concern = analysisConcern(broadcast.run, stalled);
  const transcriptLineCount = React.useMemo(() => {
    if (!broadcast.transcript) return null;
    return parseTranscriptLines(broadcast.transcript).filter(line => line.seconds !== null).length;
  }, [broadcast.transcript]);

  const shareBroadcast = React.useCallback(async () => {
    try {
      const result = await shareOrCopyUrl({
        title,
        url: broadcastShareUrl(broadcast.id),
        text: `Watch: ${title}`,
      });
      if (result === 'copied') toast.success('Link copied', { description: 'Share it anywhere.' });
      else if (result === 'shared') toast.success('Shared');
    } catch {
      toast.error('Could not share', { description: 'Copy the URL from the address bar instead.' });
    }
  }, [broadcast.id, title]);

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:pb-0',
        // Closed Ask sheet peeks; open sheet needs a taller spacer so last rows stay reachable.
        askOpen ? 'pb-[min(48dvh,26rem)] lg:pb-0' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0',
      )}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {seekAnnouncement}
      </p>
      <header ref={headerRef} className="flex items-center gap-3 border-b py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to all broadcasts"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h1 className="truncate text-base font-medium">{title}</h1>
          <p className="text-muted-foreground truncate text-xs">
            {leadHeadline && (
              <>
                <span>Lead</span>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              </>
            )}
            <time dateTime={broadcast.uploadedAt}>{uploadedLabel}</time>
            {broadcast.storyCount !== null && (
              <>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
                <span className="tabular-nums">
                  {broadcast.storyCount} {broadcast.storyCount === 1 ? 'story' : 'stories'}
                </span>
              </>
            )}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Share broadcast" onClick={shareBroadcast}>
          <Share2 aria-hidden />
        </Button>
      </header>

      {askOpen && (
        <button
          type="button"
          aria-label="Dismiss ask panel"
          className="fixed inset-0 z-30 bg-black/10 lg:hidden"
          onClick={() => setAskOpen(false)}
        />
      )}

      <div className="grid min-h-0 grid-cols-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <BroadcastPlayer src={broadcast.url} videoRef={videoRef} />

          {processing && (
            <StageProgress
              stages={broadcast.stages}
              concern={concern}
              startedAt={broadcast.run.startedAt}
              onRetry={retryAnalysis}
              retrying={retrying}
            />
          )}

          <Tabs
            value={tab}
            onValueChange={value => {
              if (value === 'stories' || value === 'transcript') void setTab(value);
            }}
            className="gap-0"
          >
            <div className="bg-background sticky top-0 z-20">
              <TabsList
                variant="line"
                className="h-10 w-full justify-start gap-0 border-b group-data-horizontal/tabs:h-10"
                aria-label="Broadcast content"
              >
                <TabsTrigger
                  value="stories"
                  className="text-muted-foreground data-active:text-foreground min-h-9 flex-1 gap-1.5 sm:flex-none sm:px-3"
                >
                  Stories
                  {broadcast.storyCount !== null && (
                    <span className="font-normal tabular-nums opacity-70">{broadcast.storyCount}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="transcript"
                  className="text-muted-foreground data-active:text-foreground min-h-9 flex-1 gap-1.5 sm:flex-none sm:px-3"
                >
                  Transcript
                  {transcriptLineCount !== null && (
                    <span className="font-normal tabular-nums opacity-70">{transcriptLineCount}</span>
                  )}
                </TabsTrigger>
                <TabsIndicator />
              </TabsList>
            </div>
            <TabsContent value="stories" className="pt-2 outline-none">
              <StoryGrid
                stories={broadcast.stories}
                pending={processing}
                onSeekAction={seekTo}
                activeSeconds={activeSeconds}
                leadHeadline={leadHeadline}
                showHeading={false}
              />
            </TabsContent>
            <TabsContent value="transcript" className="outline-none">
              <TranscriptPanel
                transcript={broadcast.transcript}
                pending={!transcriptReady}
                onSeekAction={seekFromTranscript}
                activeSeconds={activeSeconds}
              />
            </TabsContent>
          </Tabs>
        </div>

        <aside
          className={cn(
            'bg-card flex flex-col border',
            'fixed inset-x-0 bottom-0 z-40 h-[min(48dvh,26rem)] rounded-t-xl border-x-0 border-b-0 shadow-lg',
            // Slide instead of resizing so the sheet animates on the compositor,
            // never re-laying-out the page. Closed leaves the 3.5rem toggle row peeking.
            'transition-transform duration-200 ease-out motion-reduce:transition-none',
            askOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem-env(safe-area-inset-bottom))]',
            'lg:static lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100dvh-6rem)] lg:translate-y-0 lg:rounded-xl lg:border lg:shadow-none',
          )}
        >
          <button
            type="button"
            className="focus-visible:ring-ring/50 flex min-h-14 w-full shrink-0 items-center justify-between gap-3 px-4 py-3 text-left focus-visible:ring-3 focus-visible:outline-none lg:hidden"
            aria-expanded={askOpen}
            aria-controls="broadcast-ask-panel"
            onClick={() => setAskOpen(open => !open)}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">Ask the broadcast</span>
              <span className="text-muted-foreground text-xs">
                {!transcriptReady
                  ? 'Unlocks after transcription'
                  : askOpen
                    ? 'Ask, then jump to the cited moment'
                    : 'Tap to ask and verify'}
              </span>
            </span>
            <ChevronUp
              aria-hidden
              className={cn(
                'text-muted-foreground size-5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
                !askOpen && 'rotate-180',
              )}
            />
          </button>

          {askOpen && activeStory && (
            <div className="border-b px-4 py-2 lg:hidden" role="status" aria-live="polite" aria-atomic="true">
              <p className="truncate text-xs">
                <span className="font-medium">Now playing</span>
                <span aria-hidden className="text-muted-foreground mx-1.5">
                  ·
                </span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {activeSeconds !== null ? formatSeekClock(activeSeconds) : activeStory.startTime}
                </span>
                <span aria-hidden className="text-muted-foreground mx-1.5">
                  ·
                </span>
                <span className="text-muted-foreground">
                  {leadHeadline && activeStory.headline.trim().toLowerCase() === leadHeadline.toLowerCase()
                    ? 'Lead segment'
                    : activeStory.headline}
                </span>
              </p>
            </div>
          )}

          <div
            id="broadcast-ask-panel"
            className={cn('min-h-0 flex-1 flex-col', askOpen ? 'flex' : 'hidden', 'lg:flex')}
          >
            <ChatPanel
              fileId={broadcast.id}
              filename={broadcast.filename}
              stories={broadcast.stories}
              transcriptReady={transcriptReady}
              halted={concern !== null}
              activeStory={activeStory}
              onSeekAction={seekTo}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
