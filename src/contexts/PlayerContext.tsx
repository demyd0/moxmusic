import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { loadYoutubeIframeApi } from '@/lib/youtubeIframeApi';
import { resolveTrackVideo, setCachedTrackVideo, type ResolvedVideo } from '@/services/trackVideoMatchService';
import { useAudioEngine } from '@/contexts/AudioEngineContext';

// The IFrame API replaces its target element with a real <iframe> sized
// via these HTML width/height attributes - it does NOT inherit the
// replaced element's CSS classes, so PlayerBar's video container must be
// sized to exactly this, in pixels, or the two drift out of sync.
export const PLAYER_VIDEO_WIDTH = 96;
export const PLAYER_VIDEO_HEIGHT = 56;

export interface PlayerTrack {
  /** Caller-supplied identity for this queue slot - track.id when the
   *  source API gave us one, otherwise a synthetic key the caller makes
   *  up (e.g. `${albumId}-${trackNumber}`). Only used for React keys /
   *  queue bookkeeping, never sent anywhere. */
  id: string;
  title: string;
  artist: string;
  albumTitle?: string;
  coverUrl?: string;
  durationMs?: number;
}

interface PlayerContextValue {
  queue: PlayerTrack[];
  currentIndex: number;
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  alternates: ResolvedVideo[];
  hasNext: boolean;
  hasPrev: boolean;
  playQueue: (tracks: PlayerTrack[], startIndex: number) => void;
  togglePlayPause: () => void;
  next: () => void;
  prev: () => void;
  jumpTo: (index: number) => void;
  seekTo: (seconds: number) => void;
  pickAlternate: (video: ResolvedVideo) => void;
  closePlayer: () => void;
  /** PlayerBar calls this with the DOM node it wants the YouTube iframe
   *  mounted into - see the file doc comment for why this indirection
   *  exists instead of the context rendering its own portal. */
  registerVideoContainer: (el: HTMLDivElement | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

/**
 * Site-wide persistent player, mounted once at the app root (see App.tsx)
 * alongside ChatPanel/AudioEngineProvider so playback survives page
 * navigation. Drives a single reused YT.Player instance (loadVideoById
 * between tracks rather than destroying/recreating) targeting whatever DOM
 * node PlayerBar registers - the context owns playback state and the
 * YT.Player lifecycle, PlayerBar owns the visible layout, so the two can't
 * fight over positioning.
 */
export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { volume } = useAudioEngine();
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [alternates, setAlternates] = useState<ResolvedVideo[]>([]);

  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const queueRef = useRef<PlayerTrack[]>([]);
  const indexRef = useRef(0);
  const loadTokenRef = useRef(0);
  const volumeRef = useRef(volume);

  queueRef.current = queue;
  indexRef.current = currentIndex;
  volumeRef.current = volume;

  const currentTrack = queue[currentIndex] || null;

  const applyVolume = useCallback(() => {
    playerRef.current?.setVolume(Math.round(volume * 100));
  }, [volume]);

  useEffect(() => {
    applyVolume();
  }, [applyVolume]);

  const loadCurrentTrack = useCallback(async () => {
    const track = queueRef.current[indexRef.current];
    if (!track) return;
    const token = ++loadTokenRef.current;
    setIsLoading(true);
    setAlternates([]);
    setCurrentTime(0);
    setDuration(0);

    const resolution = await resolveTrackVideo(track.artist, track.title, track.durationMs);
    if (token !== loadTokenRef.current) return; // a newer track was requested meanwhile

    setIsLoading(false);
    setAlternates(resolution.alternates);
    if (!resolution.videoId) {
      // Nothing playable found - skip ahead rather than sit there stuck.
      if (indexRef.current < queueRef.current.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setIsPlaying(false);
      }
      return;
    }

    const player = playerRef.current;
    if (player) {
      player.loadVideoById(resolution.videoId);
      applyVolume();
    }
  }, [applyVolume]);

  // Creates the shared YT.Player once a container is registered and at
  // least one track has been requested - reused for every subsequent
  // track via loadVideoById instead of tearing down/rebuilding the iframe.
  const ensurePlayer = useCallback(
    async (initialVideoId: string) => {
      if (playerRef.current || !containerRef.current) return;
      await loadYoutubeIframeApi();
      if (!containerRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: initialVideoId,
        width: PLAYER_VIDEO_WIDTH,
        height: PLAYER_VIDEO_HEIGHT,
        playerVars: { autoplay: 1, playsinline: 1 },
        events: {
          onReady: (e) => {
            e.target.setVolume(Math.round(volumeRef.current * 100));
            e.target.playVideo();
          },
          onStateChange: (e) => {
            if (!window.YT) return;
            const { PLAYING, PAUSED, ENDED } = window.YT.PlayerState;
            if (e.data === PLAYING) {
              setIsPlaying(true);
              setDuration(playerRef.current?.getDuration?.() || 0);
            } else if (e.data === PAUSED) {
              setIsPlaying(false);
            } else if (e.data === ENDED) {
              if (indexRef.current < queueRef.current.length - 1) {
                setCurrentIndex((i) => i + 1);
              } else {
                setIsPlaying(false);
              }
            }
          },
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );

  const playQueue = useCallback(
    (tracks: PlayerTrack[], startIndex: number) => {
      if (tracks.length === 0) return;
      const clampedIndex = Math.min(Math.max(0, startIndex), tracks.length - 1);
      setQueue(tracks);
      setCurrentIndex(clampedIndex);
      queueRef.current = tracks;
      indexRef.current = clampedIndex;

      const track = tracks[clampedIndex];
      setIsLoading(true);
      resolveTrackVideo(track.artist, track.title, track.durationMs).then((resolution) => {
        setIsLoading(false);
        setAlternates(resolution.alternates);
        if (!resolution.videoId) return;
        if (!playerRef.current) {
          void ensurePlayer(resolution.videoId);
        } else {
          playerRef.current.loadVideoById(resolution.videoId);
          applyVolume();
        }
      });
    },
    [ensurePlayer, applyVolume]
  );

  // Track index changed (next/prev/auto-advance) after the queue was
  // already established - load whatever's now current into the existing
  // player.
  const isFirstLoadRef = useRef(true);
  useEffect(() => {
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }
    if (queue.length === 0) return;
    void loadCurrentTrack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const t = playerRef.current?.getCurrentTime?.();
      if (typeof t === 'number') setCurrentTime(t);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  }, [isPlaying]);

  const next = useCallback(() => {
    if (indexRef.current < queueRef.current.length - 1) setCurrentIndex((i) => i + 1);
  }, []);

  const prev = useCallback(() => {
    if (indexRef.current > 0) setCurrentIndex((i) => i - 1);
  }, []);

  const jumpTo = useCallback((index: number) => {
    if (index < 0 || index >= queueRef.current.length || index === indexRef.current) return;
    setCurrentIndex(index);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo?.(seconds, true);
    setCurrentTime(seconds);
  }, []);

  const pickAlternate = useCallback(
    (video: ResolvedVideo) => {
      const track = queueRef.current[indexRef.current];
      if (!track || !playerRef.current) return;
      playerRef.current.loadVideoById(video.videoId);
      applyVolume();
      setAlternates((prevAlts) => prevAlts.filter((v) => v.videoId !== video.videoId));
      void setCachedTrackVideo(track.artist, track.title, video.videoId);
    },
    [applyVolume]
  );

  const closePlayer = useCallback(() => {
    playerRef.current?.pauseVideo?.();
    setQueue([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, []);

  const registerVideoContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
  }, []);

  const value: PlayerContextValue = {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    alternates,
    hasNext: currentIndex < queue.length - 1,
    hasPrev: currentIndex > 0,
    playQueue,
    togglePlayPause,
    next,
    prev,
    jumpTo,
    seekTo,
    pickAlternate,
    closePlayer,
    registerVideoContainer,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
