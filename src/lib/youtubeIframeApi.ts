let ytApiPromise: Promise<void> | null = null;

/** Loads the YouTube IFrame Player API script once (shared across every
 *  YT.Player consumer on the page - ProfileTrackPlayer, PlayerContext) and
 *  resolves once window.YT is ready. */
export function loadYoutubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return ytApiPromise;
}
