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
  MediaPlayerPlaybackSpeed,
  MediaPlayerSeek,
  MediaPlayerSeekBackward,
  MediaPlayerSeekForward,
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from '@/components/ui/media-player';

function clampToPlayable(media: HTMLVideoElement, seconds: number): number {
  if (!Number.isFinite(media.duration)) return seconds;
  return Math.max(0, Math.min(seconds, media.duration - 0.5));
}

export function BroadcastPlayer({
  src,
  videoRef,
  autoplaySeekSeconds = null,
}: {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  autoplaySeekSeconds?: number | null;
}) {
  const seekAppliedFor = React.useRef<string | null>(null);
  const shouldAutoplay = autoplaySeekSeconds !== null;

  function applyDeepLinkSeek(video: HTMLVideoElement) {
    if (autoplaySeekSeconds === null) return;
    const key = `${src}:${autoplaySeekSeconds}`;
    if (seekAppliedFor.current === key) return;
    seekAppliedFor.current = key;
    video.currentTime = clampToPlayable(video, autoplaySeekSeconds);
  }

  React.useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (!video) return;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [videoRef]);

  return (
    <MediaPlayer autoHide className="w-full overflow-hidden rounded-xl border">
      <MediaPlayerVideo
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        autoPlay={shouldAutoplay}
        onLoadedMetadata={event => {
          if (shouldAutoplay) event.currentTarget.muted = true;
          applyDeepLinkSeek(event.currentTarget);
        }}
        className="aspect-video w-full bg-black object-contain"
      />
      <MediaPlayerLoading />
      <MediaPlayerError />
      <MediaPlayerControls className="flex-col items-stretch gap-1.5">
        <MediaPlayerControlsOverlay />
        <MediaPlayerSeek />
        <div className="flex w-full items-center gap-2">
          <div className="flex flex-1 items-center gap-2">
            <MediaPlayerPlay />
            <MediaPlayerSeekBackward />
            <MediaPlayerSeekForward />
            <MediaPlayerVolume expandable />
            <MediaPlayerTime />
          </div>
          <div className="flex items-center gap-2">
            <MediaPlayerPlaybackSpeed />
            <MediaPlayerFullscreen />
          </div>
        </div>
      </MediaPlayerControls>
    </MediaPlayer>
  );
}
