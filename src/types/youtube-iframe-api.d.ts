/** No official lightweight types ship for the raw `<script src="youtube.com/iframe_api">`
 *  global - loosely typed just enough to cover what ProfileTrackPlayer.tsx and
 *  PlayerContext.tsx use. */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  loadVideoById(videoId: string): void;
  getDuration(): number;
  getCurrentTime(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface YTPlayerEvent {
  target: YTPlayer;
  data: number;
}

interface Window {
  YT?: {
    Player: new (
      element: HTMLElement,
      opts: {
        videoId: string;
        width?: number;
        height?: number;
        playerVars?: Record<string, number>;
        events?: {
          onReady?: (event: YTPlayerEvent) => void;
          onStateChange?: (event: YTPlayerEvent) => void;
        };
      }
    ) => YTPlayer;
    PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
  };
  onYouTubeIframeAPIReady?: () => void;
}
