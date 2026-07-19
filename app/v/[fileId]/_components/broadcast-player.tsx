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
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from '@/components/ui/media-player';

/** Desk-quiet player: scrub + play are primary; volume and fullscreen only. */
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
          <MediaPlayerFullscreen />
        </div>
      </MediaPlayerControls>
    </MediaPlayer>
  );
}
