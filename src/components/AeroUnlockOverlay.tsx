import React, { useEffect } from 'react';

const ANIMATION_MS = 1400;

/** Plays once when the Frutiger Aero easter-egg theme is unlocked/activated
 *  - a burst of rising bubbles plus a soft glassy shine sweep, self-removing
 *  after the CSS animation finishes. See useTheme.ts / Header.tsx (the
 *  hidden bubble trigger) for how this gets triggered. */
export const AeroUnlockOverlay: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="aero-unlock-overlay">
      <div className="aero-unlock-shine" />
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="aero-unlock-bubble"
          style={{
            left: `${(i * 7.3) % 100}%`,
            width: `${10 + ((i * 13) % 26)}px`,
            height: `${10 + ((i * 13) % 26)}px`,
            animationDelay: `${(i % 7) * 0.09}s`,
            animationDuration: `${1.1 + (i % 5) * 0.15}s`,
          }}
        />
      ))}
      <div className="aero-unlock-label">FRUTIGER AERO</div>
    </div>
  );
};
