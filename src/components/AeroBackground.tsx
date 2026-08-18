import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { BackgroundEffectCanvas } from '@/components/BackgroundEffectCanvas';

const MAX_PARALLAX_PX = 260;

/**
 * Full-page scenic backdrop for the hidden Frutiger Aero theme - three
 * fixed layers (sky, rolling hills, glass droplets) that scroll at
 * different speeds for a sense of depth, the opposite of the site's base
 * brutalism. Mounted once at the App level (see App.tsx) so it sits behind
 * every route without each page needing to opt in; renders nothing unless
 * the Aero theme is active.
 *
 * Pure CSS/SVG shapes rather than image assets - no external files to
 * fetch, works offline, and stays crisp at any viewport size. Layer speeds
 * are capped (MAX_PARALLAX_PX) so an unusually tall page can't drag a
 * layer far enough to reveal an edge - each layer's box already extends
 * well past the viewport specifically to absorb that translation.
 */
export const AeroBackground: React.FC = () => {
  const { theme } = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (theme !== 'aero') return;
    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = null;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [theme]);

  if (theme !== 'aero') return null;

  const backY = -Math.min(scrollY * 0.08, MAX_PARALLAX_PX * 0.4);
  const midY = -Math.min(scrollY * 0.2, MAX_PARALLAX_PX * 0.75);
  const frontY = -Math.min(scrollY * 0.35, MAX_PARALLAX_PX);

  return (
    <>
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -5 }} aria-hidden="true">
      {/* Sky - slowest layer */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: -80,
          bottom: -300,
          transform: `translateY(${backY}px)`,
          backgroundImage:
            'radial-gradient(ellipse 240px 80px at 15% 18%, rgba(255,255,255,0.9), transparent 70%),' +
            'radial-gradient(ellipse 280px 90px at 68% 10%, rgba(255,255,255,0.85), transparent 70%),' +
            'radial-gradient(ellipse 200px 70px at 42% 26%, rgba(255,255,255,0.75), transparent 70%),' +
            'linear-gradient(180deg, #8ecbfb 0%, #bfe4ff 35%, #eaf6ff 70%, #ffffff 100%)',
        }}
      />

      {/* Rolling hills - medium layer, two shades for depth within itself */}
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: -120, width: '100%', height: '48vh', transform: `translateY(${midY}px)` }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="aeroHillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8e6a1" />
            <stop offset="100%" stopColor="#5fbf5f" />
          </linearGradient>
          <linearGradient id="aeroHillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fd67f" />
            <stop offset="100%" stopColor="#2f9e44" />
          </linearGradient>
        </defs>
        <path d="M0,200 C220,110 420,260 720,180 C1020,100 1220,230 1440,150 L1440,400 L0,400 Z" fill="url(#aeroHillBack)" opacity="0.85" />
        <path d="M0,260 C260,320 500,190 760,250 C1040,315 1260,210 1440,260 L1440,400 L0,400 Z" fill="url(#aeroHillFront)" />
      </svg>

      {/* Glass droplets - fastest layer, closest to the viewer */}
      <div className="absolute inset-0" style={{ transform: `translateY(${frontY}px)` }}>
        <div className="aero-droplet" style={{ width: 170, height: 170, left: '4%', bottom: '6%' }} />
        <div className="aero-droplet" style={{ width: 95, height: 95, right: '9%', bottom: '20%' }} />
        <div className="aero-droplet" style={{ width: 60, height: 60, left: '34%', bottom: '2%' }} />
        <div className="aero-droplet" style={{ width: 46, height: 46, right: '28%', bottom: '5%' }} />
      </div>

      {/* Ambient floating bubbles - reuses the existing profile background
          particle system (see BackgroundEffectCanvas.tsx) as-is. */}
      <BackgroundEffectCanvas effect="bubbles" />
    </div>

    {/* Gooey cursor-trailing blob - purely CSS, tracks the --mx/--my custom
        properties useCursorSpotlight() (mounted in App.tsx, runs regardless
        of theme) already updates every frame with a lerp-smoothed cursor
        position, so this trails the pointer for free without a second
        mousemove listener or rAF loop. Rendered as its own top-level fixed
        element (NOT nested inside the -5 z-index background wrapper above)
        so its z-index is evaluated against the whole page instead of being
        trapped inside that wrapper's own stacking context. */}
    <div className="aero-cursor-blob" aria-hidden="true" />
    </>
  );
};
