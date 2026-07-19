'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, ChevronUp, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalDateLabel } from '@/components/broadcast/use-local-date-label';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BroadcastPageInitial } from '@/lib/broadcast-types';
import { BroadcastProvider, useActiveStory, useBroadcast, usePlayback } from './broadcast-context';
import { BroadcastPlayer } from './broadcast-player';
import { ChatHalted, ChatPanelFallback, ChatWaiting } from './chat-status';
import { StageProgress, StageProgressConcern, StageProgressRetry } from './stage-progress';
import { StoryGrid } from './story-grid';
import { TranscriptEmpty, TranscriptLoading, TranscriptPanel } from './transcript-panel';

const ChatPanelInterface = dynamic(() => import('./chat-panel-interface').then(mod => mod.ChatPanelInterface), {
  loading: () => <ChatPanelFallback />,
});

/**
 * Client orchestrator for one broadcast: provider owns pipeline/seek/ask state;
 * compound pieces below compose the desk layout.
 */
export function BroadcastView({ initial }: { initial: BroadcastPageInitial }) {
  return (
    <BroadcastProvider initial={initial}>
      <Broadcast.Frame>
        <Broadcast.Header />
        <Broadcast.AskScrim />
        <div className="grid min-h-0 grid-cols-1 gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <Broadcast.Player />
            <Broadcast.Analysis />
            <Broadcast.ContentTabs />
          </div>
          <Broadcast.AskDock />
        </div>
      </Broadcast.Frame>
    </BroadcastProvider>
  );
}

function BroadcastFrame({ children }: { children: ReactNode }) {
  const {
    state: { askDockOpen, seekAnnouncement },
  } = useBroadcast();

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:pb-0',
        // Closed Ask sheet peeks; open sheet needs a taller spacer so last rows stay reachable.
        askDockOpen ? 'pb-[min(48dvh,26rem)] lg:pb-0' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0',
      )}
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {seekAnnouncement}
      </p>
      {children}
    </div>
  );
}

function BroadcastHeader() {
  const {
    state: { broadcast, title, leadHeadline },
    actions: { shareBroadcast },
    meta: { headerRef },
  } = useBroadcast();
  const uploadedLabel = useLocalDateLabel(broadcast.uploadedAt, 'date');

  return (
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
          {leadHeadline ? (
            <>
              <span>Lead</span>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
            </>
          ) : null}
          <time dateTime={broadcast.uploadedAt}>{uploadedLabel}</time>
          {broadcast.storyCount !== null ? (
            <>
              <span aria-hidden className="mx-1.5">
                ·
              </span>
              <span className="tabular-nums">
                {broadcast.storyCount} {broadcast.storyCount === 1 ? 'story' : 'stories'}
              </span>
            </>
          ) : null}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Share broadcast" onClick={shareBroadcast}>
        <Share2 aria-hidden />
      </Button>
    </header>
  );
}

function BroadcastAskScrim() {
  const {
    state: { askDockOpen },
    actions: { closeAskDock },
  } = useBroadcast();

  if (!askDockOpen) return null;

  return (
    <button
      type="button"
      aria-label="Dismiss ask panel"
      className="fixed inset-0 z-30 bg-black/10 lg:hidden"
      onClick={closeAskDock}
    />
  );
}

function BroadcastPlayerSlot() {
  const {
    state: { broadcast, deepLinkSeekSeconds },
    meta: { videoRef },
  } = useBroadcast();

  return <BroadcastPlayer src={broadcast.url} videoRef={videoRef} autoplaySeekSeconds={deepLinkSeekSeconds} />;
}

function BroadcastAnalysis() {
  const {
    state: { broadcast, processing, concern, retrying },
    actions: { retryAnalysis },
  } = useBroadcast();

  if (!processing) return null;

  if (concern) {
    return (
      <StageProgressConcern stages={broadcast.stages} concern={concern}>
        <StageProgressRetry onRetry={retryAnalysis} retrying={retrying} />
        <Button type="button" size="sm" variant="outline" nativeButton={false} render={<Link href="/" />}>
          Back to all broadcasts
        </Button>
      </StageProgressConcern>
    );
  }

  return <StageProgress stages={broadcast.stages} startedAt={broadcast.run.startedAt} />;
}

function BroadcastStoriesPanel() {
  const {
    state: { broadcast, processing, leadHeadline },
    actions: { seekTo },
  } = useBroadcast();
  const { activeSeconds } = usePlayback();

  if (broadcast.stories.length === 0 && processing) return <StoryGrid.Loading />;
  if (broadcast.stories.length === 0) return <StoryGrid.Empty />;
  return (
    <StoryGrid
      stories={broadcast.stories}
      onSeekAction={seekTo}
      activeSeconds={activeSeconds}
      leadHeadline={leadHeadline}
    />
  );
}

function BroadcastTranscriptPanel() {
  const {
    state: { transcriptReady, transcript, transcriptLoading, transcriptLoaded },
    actions: { seekFromTranscript },
  } = useBroadcast();
  const { activeSeconds } = usePlayback();

  if (!transcriptReady) return <TranscriptLoading />;
  if (transcriptLoading || !transcriptLoaded) return <TranscriptLoading message="Loading transcript…" />;
  if (!transcript) return <TranscriptEmpty />;
  return <TranscriptPanel transcript={transcript} onSeekAction={seekFromTranscript} activeSeconds={activeSeconds} />;
}

function BroadcastContentTabs() {
  const {
    state: { broadcast, tab, transcriptLineCount },
    actions: { setTab },
  } = useBroadcast();

  return (
    <Tabs
      value={tab}
      onValueChange={value => {
        if (value === 'stories' || value === 'transcript') setTab(value);
      }}
      className="gap-0"
    >
      <div className="bg-background sticky top-0 z-20">
        <TabsList
          variant="line"
          className="w-full justify-start gap-0 border-b group-data-horizontal/tabs:h-10"
          aria-label="Broadcast content"
        >
          <TabsTrigger
            value="stories"
            className="data-active:text-foreground min-h-9 flex-1 gap-1.5 sm:flex-none sm:px-3"
          >
            Stories
            {broadcast.storyCount !== null ? (
              <span className="font-normal tabular-nums opacity-70">{broadcast.storyCount}</span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="transcript" className="text-muted-foreground min-h-9 flex-1 gap-1.5 sm:flex-none sm:px-3">
            Transcript
            {transcriptLineCount !== null ? (
              <span className="font-normal tabular-nums opacity-70">{transcriptLineCount}</span>
            ) : null}
          </TabsTrigger>
          <TabsIndicator />
        </TabsList>
      </div>
      <TabsContent value="stories" className="pt-2 outline-none">
        <BroadcastStoriesPanel />
      </TabsContent>
      <TabsContent value="transcript" className="outline-none">
        <BroadcastTranscriptPanel />
      </TabsContent>
    </Tabs>
  );
}

function AskDockNowPlaying() {
  const {
    state: { askDockOpen, leadHeadline },
    meta: { formatSeekClock },
  } = useBroadcast();
  const { activeSeconds } = usePlayback();
  const { activeStory } = useActiveStory();

  if (!askDockOpen || !activeStory) return null;

  return (
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
  );
}

function AskDockChat() {
  const {
    state: { broadcast, askPrompt, transcriptReady, concern },
    actions: { clearAskPrompt, seekTo },
  } = useBroadcast();
  const { activeStory } = useActiveStory();

  if (!transcriptReady) {
    return concern ? <ChatHalted /> : <ChatWaiting />;
  }

  return (
    <ChatPanelInterface
      fileId={broadcast.id}
      filename={broadcast.filename}
      stories={broadcast.stories}
      activeStory={activeStory}
      initialPrompt={askPrompt}
      onInitialPromptConsumedAction={clearAskPrompt}
      onSeekAction={seekTo}
    />
  );
}

function BroadcastAskDock() {
  const {
    state: { askDockOpen, transcriptReady },
    actions: { toggleAskDock },
  } = useBroadcast();

  return (
    <aside
      className={cn(
        'bg-card flex flex-col border',
        'fixed inset-x-0 bottom-0 z-40 h-[min(48dvh,26rem)] rounded-t-xl border-x-0 border-b-0 shadow-lg',
        // Slide instead of resizing so the sheet animates on the compositor,
        // never re-laying-out the page. Closed leaves the 3.5rem toggle row peeking.
        'transition-transform duration-200 ease-out motion-reduce:transition-none',
        askDockOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem-env(safe-area-inset-bottom))]',
        'lg:static lg:sticky lg:top-6 lg:z-auto lg:h-[calc(100dvh-6rem)] lg:translate-y-0 lg:rounded-xl lg:border lg:shadow-none',
      )}
    >
      <button
        type="button"
        className="focus-visible:ring-ring/50 flex min-h-14 w-full shrink-0 items-center justify-between gap-3 px-4 py-3 text-left focus-visible:ring-3 focus-visible:outline-none lg:hidden"
        aria-expanded={askDockOpen}
        aria-controls="broadcast-ask-panel"
        onClick={toggleAskDock}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">Ask the broadcast</span>
          <span className="text-muted-foreground text-xs">
            {!transcriptReady
              ? 'Unlocks after transcription'
              : askDockOpen
                ? 'Ask, then jump to the cited moment'
                : 'Tap to ask and verify'}
          </span>
        </span>
        <ChevronUp
          aria-hidden
          className={cn(
            'text-muted-foreground size-5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
            !askDockOpen && 'rotate-180',
          )}
        />
      </button>

      <AskDockNowPlaying />

      <div
        id="broadcast-ask-panel"
        className={cn('min-h-0 flex-1 flex-col', askDockOpen ? 'flex' : 'hidden', 'lg:flex')}
      >
        <AskDockChat />
      </div>
    </aside>
  );
}

const Broadcast = {
  Frame: BroadcastFrame,
  Header: BroadcastHeader,
  AskScrim: BroadcastAskScrim,
  Player: BroadcastPlayerSlot,
  Analysis: BroadcastAnalysis,
  ContentTabs: BroadcastContentTabs,
  AskDock: BroadcastAskDock,
};
