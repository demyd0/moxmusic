import React, { useEffect, useRef, useState } from 'react';
import type { ProfileTrack } from '@/types/profile';
import { useAudioEngine } from '@/contexts/AudioEngineContext';
import { loadYoutubeIframeApi } from '@/lib/youtubeIframeApi';
import { Music, Play, Pause } from 'lucide-react';

interface ProfileTrackPlayerProps {
  track: ProfileTrack;
  accentColor: string;
}

/** Starts playing as soon as the profile loads, like the visitor already
 *  hit play - browsers may still block autoplay-with-sound without a prior
 *  gesture, in which case the play/pause button lets the visitor start it
 *  manually. The YouTube variant renders no visible video: it drives the
 *  IFrame Player API against an off-screen 1px iframe and exposes only a
 *  play/pause button + the site's volume slider, since nobody wants a tiny
 *  video window cluttering a profile page. */
export const ProfileTrackPlayer: React.FC<ProfileTrackPlayerProps> = ({ track, accentColor }) => {
  const { volume, setActiveElement } = useAudioEngine();
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<YTPlayer | null>(null);
  const [isYoutubePlaying, setIsYoutubePlaying] = useState(false);
  const [isYoutubeReady, setIsYoutubeReady] = useState(false);

  useEffect(() => {
    if (track.type !== 'upload') return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume, track.type]);

  useEffect(() => {
    if (track.type !== 'upload') return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.play().catch(() => {
      // Autoplay-with-sound blocked by the browser - the visible native
      // controls let the visitor start it manually instead.
    });
    return () => setActiveElement(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.type, track.value]);

  useEffect(() => {
    if (track.type !== 'youtube') return;
    let cancelled = false;
    setIsYoutubeReady(false);
    loadYoutubeIframeApi().then(() => {
      if (cancelled || !youtubeContainerRef.current || !window.YT) return;
      const player = window.YT.Player;
      youtubePlayerRef.current = new player(youtubeContainerRef.current, {
        videoId: track.value,
        width: 1,
        height: 1,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            e.target.setVolume(Math.round(volume * 100));
            e.target.playVideo();
            setIsYoutubeReady(true);
          },
          onStateChange: (e) => {
            if (cancelled || !window.YT) return;
            setIsYoutubePlaying(e.data === window.YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
      setIsYoutubeReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.type, track.value]);

  useEffect(() => {
    if (track.type !== 'youtube' || !isYoutubeReady) return;
    youtubePlayerRef.current?.setVolume(Math.round(volume * 100));
  }, [volume, track.type, isYoutubeReady]);

  const toggleYoutubePlayback = () => {
    const player = youtubePlayerRef.current;
    if (!player) return;
    if (isYoutubePlaying) player.pauseVideo();
    else player.playVideo();
  };

  if (track.type === 'upload') {
    return (
      <div className="flex items-center gap-2.5 border-2 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 hard-shadow-sm" style={{ borderColor: accentColor }}>
        <Music className="h-4 w-4 shrink-0 text-black" />
        <audio
          ref={audioRef}
          controls
          src={track.value}
          className="h-8 flex-1 min-w-0"
          onPlay={(e) => setActiveElement(e.currentTarget)}
          onPause={() => setActiveElement(null)}
          onEnded={() => setActiveElement(null)}
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2.5 border-2 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 hard-shadow-sm" style={{ borderColor: accentColor }}>
      <button
        type="button"
        onClick={toggleYoutubePlayback}
        disabled={!isYoutubeReady}
        title={isYoutubePlaying ? 'Pause' : 'Play'}
        className="flex h-7 w-7 shrink-0 items-center justify-center border-2 text-black transition-opacity disabled:opacity-40"
        style={{ borderColor: accentColor }}
      >
        {isYoutubePlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
      </button>
      <span className="min-w-0 truncate font-mono text-xs font-bold uppercase tracking-wider text-black">
        {track.title || 'PROFILE TRACK'}
      </span>
      {/* Off-screen - the IFrame API replaces this div with a 1x1 iframe,
          audio-only, no video chrome shown to visitors. */}
      <div ref={youtubeContainerRef} className="absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true" />
    </div>
  );
};
