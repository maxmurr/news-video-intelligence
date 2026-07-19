'use client';

import * as React from 'react';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import {
  isPipelineComplete,
  type BroadcastDetail,
  type BroadcastPageInitial,
  type BroadcastStages,
  type StoryCard,
} from '@/lib/broadcast-types';
import { broadcastShareUrl, shareOrCopyUrl } from '@/lib/clipboard-share';
import { TIMESTAMP_PATTERN, timestampToSeconds } from '@/lib/timestamps';
import { analysisConcern, type AnalysisConcern } from './stage-progress';
import { activeStoryIndex } from './story-grid';

const BROADCAST_TABS = ['stories', 'transcript'] as const;
export type BroadcastTab = (typeof BROADCAST_TABS)[number];

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

function withoutTranscript(detail: BroadcastDetail): BroadcastDetail {
  return detail.transcript === null ? detail : { ...detail, transcript: null };
}

/** Where to scroll after a seek — proof surfaces keep their source in view. */
export type SeekScroll = 'player' | 'none';

export interface SeekOptions {
  scroll?: SeekScroll;
}

/**
 * Start playback at the seek target. In-page clicks usually unlock unmuted play;
 * deep links (`?t=`) run outside a user gesture, so fall back to muted autoplay.
 */
function playAtSeekTarget(video: HTMLVideoElement) {
  void video.play().catch(() => {
    video.muted = true;
    void video.play().catch(() => {
      // Still blocked; the cited frame is already on screen.
    });
  });
}

export interface BroadcastState {
  broadcast: BroadcastDetail;
  askDockOpen: boolean;
  askPrompt: string | null;
  seekAnnouncement: string;
  /** Seconds from `?t=` deep links — drives muted autoplay on the player. */
  deepLinkSeekSeconds: number | null;
  retrying: boolean;
  tab: BroadcastTab;
  processing: boolean;
  transcriptReady: boolean;
  transcript: string | null;
  transcriptLoading: boolean;
  transcriptLoaded: boolean;
  concern: AnalysisConcern;
  title: string;
  leadHeadline: string | null;
  transcriptLineCount: number | null;
}

export interface BroadcastActions {
  seekTo: (seconds: number, options?: SeekOptions) => void;
  seekFromTranscript: (seconds: number) => void;
  retryAnalysis: () => Promise<void>;
  shareBroadcast: () => Promise<void>;
  closeAskDock: () => void;
  clearAskPrompt: () => void;
  openAskDock: () => void;
  toggleAskDock: () => void;
  setTab: (tab: BroadcastTab) => void;
}

export interface BroadcastMeta {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  headerRef: React.RefObject<HTMLElement | null>;
  formatSeekClock: (seconds: number) => string;
}

export interface BroadcastContextValue {
  state: BroadcastState;
  actions: BroadcastActions;
  meta: BroadcastMeta;
}

export interface PlaybackState {
  activeSeconds: number | null;
}

export interface ActiveStoryState {
  activeStory: StoryCard | null;
}

const BroadcastContext = React.createContext<BroadcastContextValue | null>(null);
const PlaybackContext = React.createContext<PlaybackState | null>(null);
const ActiveStoryContext = React.createContext<ActiveStoryState | null>(null);

export function useBroadcast(): BroadcastContextValue {
  const value = React.use(BroadcastContext);
  if (!value) throw new Error('useBroadcast must be used within BroadcastProvider');
  return value;
}

/** Playhead seconds — ticks without re-rendering the desk chrome. */
export function usePlayback(): PlaybackState {
  const value = React.use(PlaybackContext);
  if (!value) throw new Error('usePlayback must be used within BroadcastProvider');
  return value;
}

/** Active story card — updates when the playhead crosses a story boundary. */
export function useActiveStory(): ActiveStoryState {
  const value = React.use(ActiveStoryContext);
  if (!value) throw new Error('useActiveStory must be used within BroadcastProvider');
  return value;
}

export function BroadcastProvider({ initial, children }: { initial: BroadcastPageInitial; children: React.ReactNode }) {
  const [broadcast, setBroadcast] = React.useState<BroadcastDetail>(initial);
  const [transcript, setTranscript] = React.useState<string | null>(null);
  const [transcriptLoading, setTranscriptLoading] = React.useState(false);
  const [transcriptLoaded, setTranscriptLoaded] = React.useState(false);
  const [transcriptLineCount, setTranscriptLineCount] = React.useState(initial.transcriptLineCount);
  const [askOpen, setAskOpen] = React.useState(false);
  const [seekAnnouncement, setSeekAnnouncement] = React.useState('');
  const [activeSeconds, setActiveSeconds] = React.useState<number | null>(null);
  const [stalled, setStalled] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [tab, setTabQuery] = useQueryState('tab', broadcastTabParser);
  const [askPrompt, setAskPrompt] = useQueryState(
    'ask',
    parseAsString.withOptions({ history: 'replace', shallow: true }),
  );
  const [seekTimestamp, setSeekTimestamp] = useQueryState(
    't',
    parseAsString.withOptions({ history: 'replace', shallow: true }),
  );
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const headerRef = React.useRef<HTMLElement | null>(null);
  const lastProgressKeyRef = React.useRef(stagesKey(initial.stages));
  /** 0 until the first unchanged poll starts the stall clock. */
  const lastProgressAtRef = React.useRef(0);
  const stagesRef = React.useRef(initial.stages);
  const storiesRef = React.useRef(initial.stories);
  const transcriptLoadedForIdRef = React.useRef<string | null>(null);
  const transcriptFetchInFlightRef = React.useRef(false);

  const processing = !isPipelineComplete(broadcast.stages);
  const transcriptReady = broadcast.stages.transcript;

  React.useEffect(() => {
    storiesRef.current = broadcast.stories;
  }, [broadcast.stories]);

  const refreshBroadcast = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/videos?id=${encodeURIComponent(broadcast.id)}&omitTranscript=1`);
      if (!res.ok) return false;
      const next = withoutTranscript((await res.json()) as BroadcastDetail);
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
      if (next.transcriptLineCount !== null) setTranscriptLineCount(next.transcriptLineCount);
      return true;
    } catch {
      const now = Date.now();
      if (lastProgressAtRef.current === 0) lastProgressAtRef.current = now;
      else if (now - lastProgressAtRef.current >= stallThreshold(stagesRef.current)) setStalled(true);
      return false;
    }
  }, [broadcast.id]);

  const loadTranscript = React.useCallback(async () => {
    if (!transcriptReady) return;
    if (transcriptLoadedForIdRef.current === broadcast.id || transcriptFetchInFlightRef.current) return;

    transcriptFetchInFlightRef.current = true;
    setTranscriptLoading(true);
    try {
      const res = await fetch(`/api/videos?id=${encodeURIComponent(broadcast.id)}`);
      if (!res.ok) return;
      const next = (await res.json()) as BroadcastDetail;
      setBroadcast(withoutTranscript(next));
      if (next.transcriptLineCount !== null) setTranscriptLineCount(next.transcriptLineCount);
      setTranscript(next.transcript);
      transcriptLoadedForIdRef.current = broadcast.id;
    } catch {
      // Tab keeps its loading/empty affordances; a later open retries.
    } finally {
      transcriptFetchInFlightRef.current = false;
      setTranscriptLoading(false);
      setTranscriptLoaded(true);
    }
  }, [broadcast.id, transcriptReady]);

  React.useEffect(() => {
    transcriptLoadedForIdRef.current = null;
    transcriptFetchInFlightRef.current = false;
    /* eslint-disable react-hooks/set-state-in-effect -- reset transcript state when the broadcast id changes */
    setTranscript(null);
    setTranscriptLoaded(false);
    setTranscriptLineCount(initial.transcriptLineCount);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [broadcast.id, initial.transcriptLineCount]);

  React.useEffect(() => {
    if (tab !== 'transcript' || !transcriptReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches transcript when the tab first opens
    void loadTranscript();
  }, [tab, transcriptReady, loadTranscript]);

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

  const hasAskHandoff = Boolean(askPrompt?.trim());
  const askDockOpen = askOpen || hasAskHandoff;

  const closeAskDock = React.useCallback(() => {
    setAskOpen(false);
    void setAskPrompt(null);
  }, [setAskPrompt]);

  const clearAskPrompt = React.useCallback(() => {
    setAskOpen(true);
    void setAskPrompt(null);
  }, [setAskPrompt]);

  const openAskDock = React.useCallback(() => {
    setAskOpen(true);
  }, []);

  const askDockOpenRef = React.useRef(askDockOpen);
  React.useEffect(() => {
    askDockOpenRef.current = askDockOpen;
  });

  const toggleAskDock = React.useCallback(() => {
    if (askDockOpenRef.current) closeAskDock();
    else setAskOpen(true);
  }, [closeAskDock]);

  React.useEffect(() => {
    if (!askDockOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeAskDock();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [askDockOpen, closeAskDock]);

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

  const seekTo = React.useCallback((seconds: number, options?: SeekOptions) => {
    const video = videoRef.current;
    if (!video) return;

    // The highlight and announcement must reflect where playback actually
    // lands, so both derive from the same clamped target as the seek itself.
    const commit = (target: number) => {
      video.currentTime = target;
      setActiveSeconds(target);
      const stories = storiesRef.current;
      const index = activeStoryIndex(stories, target);
      const story = index !== null ? stories[index] : undefined;
      const clock = formatSeekClock(target);
      setSeekAnnouncement(story ? `Now playing: ${story.headline} at ${clock}` : `Playing at ${clock}`);
      // Set currentTime before play() so playback starts on the cited frame.
      playAtSeekTarget(video);
    };

    // Seeking before metadata loads gets clamped to 0 on Safari/iOS.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      commit(clampToPlayable(video, seconds));
    } else {
      video.addEventListener('loadedmetadata', () => commit(clampToPlayable(video, seconds)), { once: true });
    }

    // Stories/chat jump to the player. Transcript keeps the clicked line —
    // scrolling the header would yank the proof text out of view.
    if ((options?.scroll ?? 'player') === 'none') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (headerRef.current ?? video).scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const seekFromTranscript = React.useCallback((seconds: number) => seekTo(seconds, { scroll: 'none' }), [seekTo]);

  const deepLinkSeekSeconds =
    seekTimestamp && TIMESTAMP_PATTERN.test(seekTimestamp) ? timestampToSeconds(seekTimestamp) : null;

  // Deep-link playback is owned by BroadcastPlayer (muted autoPlay + seek).
  // This effect only syncs desk chrome — calling seekTo here would start a second play().
  React.useEffect(() => {
    if (!seekTimestamp) return;
    if (!TIMESTAMP_PATTERN.test(seekTimestamp)) {
      void setSeekTimestamp(null);
      return;
    }
    if (deepLinkSeekSeconds === null) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs desk chrome to the ?t= deep-link param
    setActiveSeconds(deepLinkSeekSeconds);
    const stories = storiesRef.current;
    const index = activeStoryIndex(stories, deepLinkSeekSeconds);
    const story = index !== null ? stories[index] : undefined;
    const clock = formatSeekClock(deepLinkSeekSeconds);
    setSeekAnnouncement(story ? `Now playing: ${story.headline} at ${clock}` : `Playing at ${clock}`);
  }, [broadcast.id, deepLinkSeekSeconds, seekTimestamp, setSeekTimestamp]);

  const leadHeadline = broadcast.topHeadline?.trim() || null;
  const title = leadHeadline || (processing ? 'Processing…' : 'Untitled broadcast');
  const activeIndex = activeStoryIndex(broadcast.stories, activeSeconds);
  const activeStory = activeIndex !== null ? broadcast.stories[activeIndex] : null;
  const concern = analysisConcern(broadcast.run, stalled);

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

  const setTab = React.useCallback(
    (next: BroadcastTab) => {
      void setTabQuery(next);
    },
    [setTabQuery],
  );

  const value = React.useMemo<BroadcastContextValue>(
    () => ({
      state: {
        broadcast,
        askDockOpen,
        askPrompt,
        seekAnnouncement,
        deepLinkSeekSeconds,
        retrying,
        tab,
        processing,
        transcriptReady,
        transcript,
        transcriptLoading,
        transcriptLoaded,
        concern,
        title,
        leadHeadline,
        transcriptLineCount,
      },
      actions: {
        seekTo,
        seekFromTranscript,
        retryAnalysis,
        shareBroadcast,
        closeAskDock,
        clearAskPrompt,
        openAskDock,
        toggleAskDock,
        setTab,
      },
      meta: {
        videoRef,
        headerRef,
        formatSeekClock,
      },
    }),
    [
      broadcast,
      askDockOpen,
      askPrompt,
      seekAnnouncement,
      deepLinkSeekSeconds,
      retrying,
      tab,
      processing,
      transcriptReady,
      transcript,
      transcriptLoading,
      transcriptLoaded,
      concern,
      title,
      leadHeadline,
      transcriptLineCount,
      seekTo,
      seekFromTranscript,
      retryAnalysis,
      shareBroadcast,
      closeAskDock,
      clearAskPrompt,
      openAskDock,
      toggleAskDock,
      setTab,
    ],
  );

  const playbackValue = React.useMemo<PlaybackState>(() => ({ activeSeconds }), [activeSeconds]);
  const activeStoryValue = React.useMemo<ActiveStoryState>(() => ({ activeStory }), [activeStory]);

  return (
    <BroadcastContext value={value}>
      <PlaybackContext value={playbackValue}>
        <ActiveStoryContext value={activeStoryValue}>{children}</ActiveStoryContext>
      </PlaybackContext>
    </BroadcastContext>
  );
}
