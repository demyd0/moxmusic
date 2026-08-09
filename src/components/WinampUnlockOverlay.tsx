import React, { useEffect } from 'react';

const ANIMATION_MS = 1150;

/** Plays once when the Winamp easter-egg theme is unlocked/activated - a
 *  diagonal light sweep across the viewport, self-removing after the CSS
 *  animation finishes. See useTheme.ts / Header.tsx for the trigger. */
export const WinampUnlockOverlay: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="winamp-unlock-overlay">
      <div className="winamp-unlock-band" />
      <div className="winamp-unlock-label">WINAMP MODE</div>
    </div>
  );
};
