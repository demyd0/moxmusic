import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { BackgroundEffectCanvas } from '@/components/BackgroundEffectCanvas';

const MAX_PARALLAX_PX = 260;

type AeroScene = 'hills' | 'ocean' | 'beam' | 'ribbon' | 'ripple';
const AERO_SCENES: AeroScene[] = ['hills', 'ocean', 'beam', 'ribbon', 'ripple'];

/** A leaping-dolphin-ish silhouette built from a handful of quadratic
 *  curves - deliberately abstract/simple rather than a detailed
 *  illustration (same "curated shape, not real artwork" reasoning as the
 *  hills/droplets), so it stays legible and cheap at small blurred sizes. */
function DolphinSilhouette({ x, y, scale, flip, opacity }: { x: number; y: number; scale: number; flip?: boolean; opacity: number }) {
  return (
    <path
      d="M10,80 Q40,20 90,10 Q100,8 98,18 Q80,22 65,35 Q85,32 95,45 Q78,48 68,58 Q82,60 88,72 Q65,68 50,75 Q30,82 10,80 Z"
      fill="#eef7ff"
      opacity={opacity}
      transform={`translate(${x} ${y}) scale(${scale * (flip ? -1 : 1)} ${scale})`}
    />
  );
}

function SceneBack({ scene, backY }: { scene: AeroScene; backY: number }) {
  const common = { className: 'absolute left-0 right-0', style: { top: -80, bottom: -300, transform: `translateY(${backY}px)` } };

  if (scene === 'ocean') {
    return (
      <div
        {...common}
        style={{
          ...common.style,
          backgroundImage:
            'radial-gradient(ellipse 1500px 70px at 50% 42%, rgba(255,255,255,0.85), transparent 70%),' +
            'linear-gradient(180deg, #145a9e 0%, #2f8fd4 28%, #6cc4ee 42%, #bdeaff 52%, #eaf6ff 62%, #d6f2ff 100%)',
        }}
      />
    );
  }

  if (scene === 'beam') {
    return (
      <div
        {...common}
        style={{
          ...common.style,
          backgroundImage:
            'radial-gradient(circle 460px at 50% 42%, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 32%, transparent 68%),' +
            'linear-gradient(180deg, #2f6fc4 0%, #5fa2e6 30%, #9cd2f5 55%, #e4f5ff 82%, #ffffff 100%)',
        }}
      />
    );
  }

  if (scene === 'ribbon') {
    return (
      <div
        {...common}
        style={{
          ...common.style,
          backgroundImage: 'linear-gradient(160deg, #08152e 0%, #123a66 40%, #2f6fae 75%, #5fa2e0 100%)',
        }}
      />
    );
  }

  if (scene === 'ripple') {
    return (
      <div
        {...common}
        style={{
          ...common.style,
          backgroundImage:
            'radial-gradient(ellipse 700px 220px at 30% 20%, rgba(255,255,255,0.6), transparent 70%),' +
            'linear-gradient(180deg, #d3ecff 0%, #eaf6ff 45%, #ffffff 100%)',
        }}
      />
    );
  }

  // hills (default)
  return (
    <div
      {...common}
      style={{
        ...common.style,
        backgroundImage:
          'radial-gradient(ellipse 240px 80px at 15% 18%, rgba(255,255,255,0.9), transparent 70%),' +
          'radial-gradient(ellipse 280px 90px at 68% 10%, rgba(255,255,255,0.85), transparent 70%),' +
          'radial-gradient(ellipse 200px 70px at 42% 26%, rgba(255,255,255,0.75), transparent 70%),' +
          'linear-gradient(180deg, #8ecbfb 0%, #bfe4ff 35%, #eaf6ff 70%, #ffffff 100%)',
      }}
    />
  );
}

function SceneMid({ scene, midY }: { scene: AeroScene; midY: number }) {
  if (scene === 'ocean') {
    return (
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: -120, width: '100%', height: '46vh', transform: `translateY(${midY}px)` }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="aeroWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfeaff" />
            <stop offset="100%" stopColor="#3fa0d8" />
          </linearGradient>
        </defs>
        <rect x="0" y="120" width="1440" height="280" fill="url(#aeroWater)" opacity="0.75" />
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={420 + i * 340} cy={150 + i * 8} rx={70 + i * 30} ry={12 + i * 3} fill="none" stroke="#ffffff" strokeOpacity={0.5 - i * 0.12} strokeWidth={2} />
        ))}
        <DolphinSilhouette x={260} y={70} scale={1.1} opacity={0.9} />
        <DolphinSilhouette x={980} y={110} scale={0.85} flip opacity={0.75} />
      </svg>
    );
  }

  if (scene === 'beam') {
    return (
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: -120, width: '100%', height: '46vh', transform: `translateY(${midY}px)` }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3].map((i) => (
          <ellipse key={i} cx={720} cy={340} rx={90 + i * 90} ry={16 + i * 12} fill="none" stroke="#ffffff" strokeOpacity={0.4 - i * 0.08} strokeWidth={1.5} />
        ))}
      </svg>
    );
  }

  if (scene === 'ribbon') {
    // A handful of thick flowing bezier "ribbons" at different widths/
    // opacities - an original abstract swirl in the same spirit as the
    // era's glossy blue ribbon wallpapers, not a copy of any specific one.
    return (
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: -160, width: '100%', height: '70vh', transform: `translateY(${midY}px)` }}
        viewBox="0 0 1440 700"
        preserveAspectRatio="none"
      >
        <path d="M-50,520 C280,220 560,620 900,300 C1100,120 1300,260 1490,180" stroke="#1a4d8c" strokeWidth={90} fill="none" strokeLinecap="round" opacity={0.5} />
        <path d="M-50,420 C300,600 520,180 860,460 C1080,610 1280,320 1490,420" stroke="#4fc3f7" strokeWidth={60} fill="none" strokeLinecap="round" opacity={0.55} />
        <path d="M0,560 C320,340 600,600 940,340 C1140,190 1320,380 1490,280" stroke="#bfe4ff" strokeWidth={32} fill="none" strokeLinecap="round" opacity={0.75} />
        <path d="M-50,340 C260,180 540,420 880,220 C1080,110 1280,220 1490,150" stroke="#ffffff" strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.85} />
      </svg>
    );
  }

  if (scene === 'ripple') {
    // A cascade of glass-bubble outlines climbing toward one larger bubble
    // with concentric ripple rings inside it, like light refracting through
    // still water.
    return (
      <svg
        className="absolute left-0 right-0"
        style={{ bottom: -120, width: '100%', height: '50vh', transform: `translateY(${midY}px)` }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={220 + i * 200} cy={260 - i * 46} r={34 + i * 20} fill="rgba(200,232,255,0.15)" stroke="#8fd3ff" strokeOpacity={0.55} strokeWidth={2.5} />
        ))}
        <g>
          <circle cx={1080} cy={180} r={110} fill="rgba(200,232,255,0.12)" stroke="#8fd3ff" strokeOpacity={0.6} strokeWidth={3} />
          {[16, 34, 54, 76, 98].map((r, i) => (
            <circle key={r} cx={1080} cy={180} r={r} fill="none" stroke="#ffffff" strokeOpacity={0.55 - i * 0.09} strokeWidth={1.5} />
          ))}
        </g>
      </svg>
    );
  }

  // hills (default)
  return (
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
  );
}

/**
 * Full-page scenic backdrop for the hidden Frutiger Aero theme - three
 * fixed layers (back/mid/front) that scroll at different speeds for a
 * sense of depth, the opposite of the site's base brutalism. One of five
 * original scenes (hills, ocean+dolphins, abstract light-beam, ribbon
 * swirl, glass-bubble ripple) is picked at random each time this mounts,
 * i.e. once per real page load/refresh -
 * client-side route navigation within the SPA won't reroll it, since this
 * stays mounted across those. Mounted once at the App level (see App.tsx)
 * so it sits behind every route without each page needing to opt in;
 * renders nothing unless the Aero theme is active.
 *
 * Pure CSS/SVG shapes rather than image assets - no external files to
 * fetch, works offline, stays crisp at any viewport size, and (unlike a
 * photo pulled off the web) isn't anyone else's copyrighted artwork or
 * trademarked logo. Layer speeds are capped (MAX_PARALLAX_PX) so an
 * unusually tall page can't drag a layer far enough to reveal an edge -
 * each layer's box already extends well past the viewport specifically to
 * absorb that translation.
 */
export const AeroBackground: React.FC = () => {
  const { theme } = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);
  const scene = useMemo(() => AERO_SCENES[Math.floor(Math.random() * AERO_SCENES.length)], []);

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
      <SceneBack scene={scene} backY={backY} />
      <SceneMid scene={scene} midY={midY} />

      {/* Glass droplets - fastest layer, closest to the viewer, shared by
          every scene. */}
      <div className="absolute inset-0" style={{ transform: `translateY(${frontY}px)` }}>
        <div className="aero-droplet" style={{ width: 170, height: 170, left: '4%', bottom: '6%' }} />
        <div className="aero-droplet" style={{ width: 95, height: 95, right: '9%', bottom: '20%' }} />
        <div className="aero-droplet" style={{ width: 60, height: 60, left: '34%', bottom: '2%' }} />
        <div className="aero-droplet" style={{ width: 46, height: 46, right: '28%', bottom: '5%' }} />
        {scene === 'beam' && <div className="aero-droplet" style={{ width: 130, height: 130, left: '46%', bottom: '30%' }} />}
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
