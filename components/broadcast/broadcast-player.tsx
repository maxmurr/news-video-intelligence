'use client';

import * as React from 'react';
import {
  MediaPlayer,
  MediaPlayerControls,
  MediaPlayerControlsOverlay,
  MediaPlayerError,
  MediaPlayerFullscreen,
  MediaPlayerLoading,
  MediaPlayerPlay,
  MediaPlayerSeek,
  MediaPlayerSettings,
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from '@/components/ui/media-player';

/**
 * Desk-quiet player: scrub + play are primary. Speed and other secondary
 * controls live under Settings so the bar doesn’t compete with the story list.
 */
export function BroadcastPlayer({
  src,
  videoRef,
}: {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  return (
    <MediaPlayer autoHide className="w-full overflow-hidden rounded-xl border">
      <MediaPlayerVideo
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        className="aspect-video w-full bg-black object-contain"
      />
      <MediaPlayerLoading />
      <MediaPlayerError />
      <MediaPlayerControlsOverlay />
      <MediaPlayerControls className="flex-col items-stretch gap-1.5">
        <MediaPlayerSeek />
        <div className="flex w-full items-center gap-1.5">
          <MediaPlayerPlay />
          <MediaPlayerTime />
          <div className="flex-1" />
          <MediaPlayerVolume />
          <MediaPlayerSettings />
          <MediaPlayerFullscreen />
        </div>
      </MediaPlayerControls>
    </MediaPlayer>
  );
}
