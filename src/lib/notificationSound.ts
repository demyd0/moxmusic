let audio: HTMLAudioElement | null = null;

/**
 * Plays the short "new message" chime - lazily creates one shared <audio>
 * element and reuses it (rewinding to 0 and calling .play() again) rather
 * than a fresh Audio() per notification, so a burst of messages doesn't
 * spawn a pile of overlapping instances. Plays fine from a background/
 * unfocused tab (browsers only block *autoplay without any prior user
 * interaction*, not audio playback in a background tab once the page has
 * been interacted with at all).
 */
export function playNotificationSound(): void {
  try {
    if (!audio) {
      audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Can still be blocked in edge cases (zero interaction with the page
      // yet) - silently ignore, this is a nice-to-have, not required.
    });
  } catch {
    // ignore
  }
}
