import React, { useEffect, useRef, useState } from 'react';
import * as butterchurnModule from 'butterchurn';
import type { ButterchurnVisualizer } from 'butterchurn';
import { getPresetByName } from '@/lib/screensaverPresets';
import { useAudioEngine } from '@/contexts/AudioEngineContext';

// This UMD build's CJS/ESM interop ends up wrapped in a different number of
// nested .default layers depending on dev (esbuild pre-bundle) vs. prod
// (rollup) bundling - walk down until the real class with a
// createVisualizer static method is found, instead of hardcoding a depth.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapButterchurn(mod: any): typeof butterchurnModule.default {
  let m = mod;
  for (let i = 0; i < 5 && m && typeof m.createVisualizer !== 'function'; i++) {
    m = m.default;
  }
  return m;
}
const butterchurn = unwrapButterchurn(butterchurnModule);

// Some of the fancier multi-author presets are shader-heavy enough that
// rendering at full devicePixelRatio on a large window overwhelms weaker/
// integrated GPUs - symptom is a partially-black canvas (only a corner of
// the frame actually gets drawn), not a crash, so there's nothing to catch.
// Capping the internal render-target size sidesteps it at a small cost to
// crispness on big high-DPI screensaver windows.
const MAX_RENDER_DIMENSION = 1600;

function safePixelRatio(width: number, height: number): number {
  const raw = window.devicePixelRatio || 1;
  const cap = MAX_RENDER_DIMENSION / Math.max(width, height, 1);
  return Math.max(0.5, Math.min(raw, cap));
}

/** Real Milkdrop visuals via Butterchurn (WebGL port of the actual engine)
 *  instead of the app's own hand-rolled canvas presets. Reacts to whatever
 *  audio is currently registered as "active" site-wide (see
 *  AudioEngineContext) - if nothing is playing it still renders using the
 *  presets' own idle motion, just less lively. */
export const ScreensaverCanvas: React.FC<{ preset: string }> = ({ preset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<ButterchurnVisualizer | null>(null);
  const { getAudioContext, connectVisualizerAudio } = useAudioEngine();
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const audioContext = getAudioContext();

    // Butterchurn tracks its own internal render-target size but never
    // touches the actual <canvas> width/height attributes (the WebGL
    // drawing buffer size) - that's on the caller, or it renders at the
    // browser's default 300x150 stretched via CSS.
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const pixelRatio = safePixelRatio(width, height);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    let visualizer: ButterchurnVisualizer;
    try {
      visualizer = butterchurn.createVisualizer(audioContext, canvas, {
        width,
        height,
        pixelRatio,
        textureRatio: 1,
      });
    } catch (err) {
      console.warn('Butterchurn failed to initialize (likely no WebGL2 support):', err);
      setUnsupported(true);
      return;
    }
    visualizerRef.current = visualizer;

    // Rendering starts immediately with idle motion; audio reactivity (if
    // possible - see connectVisualizerAudio's doc) attaches a moment later
    // without blocking the first frame or risking muting current playback.
    let cancelled = false;
    connectVisualizerAudio().then((node) => {
      if (!cancelled && node) visualizer.connectAudio(node);
    });

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      const ratio = safePixelRatio(w, h);
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      visualizer.setRendererSize(w, h, { pixelRatio: ratio });
    });
    resizeObserver.observe(container);

    let raf = 0;
    const tick = () => {
      visualizer.render();
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visualizerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const visualizer = visualizerRef.current;
    if (!visualizer) return;
    const presetData = getPresetByName(preset);
    if (presetData) visualizer.loadPreset(presetData, 1.0);
  }, [preset]);

  if (unsupported) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-6 text-center font-mono text-xs text-white/70">
        YOUR BROWSER DOESN'T SUPPORT WEBGL2 — MILKDROP VISUALS NEED IT.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};
