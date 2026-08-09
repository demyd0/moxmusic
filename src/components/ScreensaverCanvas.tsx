import React, { useEffect, useRef } from 'react';
import type { ScreensaverPreset } from '@/lib/screensaverPresets';

const PALETTE = ['#ff004c', '#ff9900', '#fff200', '#22ff00', '#00e5ff', '#7000ff'];

interface Star { x: number; y: number; z: number; }
interface PipeSegment { x: number; y: number; }
interface Bar { height: number; target: number; }

/** The canvas content of the screensaver easter-egg window - a handful of
 *  classic demoscene/screensaver-style presets (no real audio hookup, just
 *  animation for the Winamp-visualizer vibe). Purely generated, no user
 *  input reaches the canvas, so there's no injection surface here. */
export const ScreensaverCanvas: React.FC<{ preset: ScreensaverPreset }> = ({ preset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !container || !ctx) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let t = 0;

    const resize = () => {
      width = canvas.width = container.clientWidth;
      height = canvas.height = container.clientHeight;
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Per-preset state, (re)built whenever the preset changes.
    const stars: Star[] = Array.from({ length: 260 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
    }));

    const pipeState = { segments: [] as PipeSegment[], dir: { x: 1, y: 0 }, color: PALETTE[0] };

    const bounceState = {
      x: Math.random() * 200,
      y: Math.random() * 200,
      vx: 2.4,
      vy: 1.8,
      colorIndex: 0,
    };

    const bars: Bar[] = Array.from({ length: 32 }, () => ({ height: 0, target: 0 }));

    const plasmaOffscreen = document.createElement('canvas');
    const plasmaCtx = plasmaOffscreen.getContext('2d')!;

    function drawStarfield() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      ctx!.fillStyle = '#fff';
      for (const s of stars) {
        s.z -= 0.006;
        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
        }
        const px = cx + (s.x / s.z) * cx;
        const py = cy + (s.y / s.z) * cy;
        if (px < 0 || px > width || py < 0 || py > height) continue;
        const r = (1 - s.z) * 2.5;
        ctx!.globalAlpha = 1 - s.z;
        ctx!.beginPath();
        ctx!.arc(px, py, Math.max(r, 0.5), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function drawPlasma() {
      const scale = 0.06;
      // Downsample for performance, upscale via imageSmoothing.
      const w = Math.max(1, Math.floor(width / 4));
      const h = Math.max(1, Math.floor(height / 4));
      const img = ctx!.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const v =
            Math.sin(x * scale + t) +
            Math.sin(y * scale + t * 1.3) +
            Math.sin((x + y) * scale + t * 0.7) +
            Math.sin(Math.sqrt(x * x + y * y) * scale + t * 1.5);
          const hue = ((v + 4) / 8) * 360;
          const [r, g, b] = hslToRgb(hue / 360, 0.65, 0.5);
          const i = (y * w + x) * 4;
          img.data[i] = r;
          img.data[i + 1] = g;
          img.data[i + 2] = b;
          img.data[i + 3] = 255;
        }
      }
      ctx!.imageSmoothingEnabled = true;
      plasmaOffscreen.width = w;
      plasmaOffscreen.height = h;
      plasmaCtx.putImageData(img, 0, 0);
      ctx!.drawImage(plasmaOffscreen, 0, 0, w, h, 0, 0, width, height);
    }

    function drawPipes() {
      if (pipeState.segments.length === 0) {
        pipeState.segments.push({ x: width / 2, y: height / 2 });
      }
      if (t % 0.05 < 0.02) {
        ctx!.fillStyle = 'rgba(0,0,0,0.02)';
        ctx!.fillRect(0, 0, width, height);
      }
      const last = pipeState.segments[pipeState.segments.length - 1];
      if (Math.random() < 0.04) {
        const dirs = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];
        pipeState.dir = dirs[Math.floor(Math.random() * dirs.length)];
        pipeState.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      }
      const step = 6;
      let nx = last.x + pipeState.dir.x * step;
      let ny = last.y + pipeState.dir.y * step;
      if (nx < 0 || nx > width || ny < 0 || ny > height) {
        pipeState.segments = [{ x: width / 2, y: height / 2 }];
        nx = width / 2;
        ny = height / 2;
        ctx!.fillStyle = '#000';
        ctx!.fillRect(0, 0, width, height);
      }
      ctx!.strokeStyle = pipeState.color;
      ctx!.lineWidth = 4;
      ctx!.beginPath();
      ctx!.moveTo(last.x, last.y);
      ctx!.lineTo(nx, ny);
      ctx!.stroke();
      pipeState.segments.push({ x: nx, y: ny });
      if (pipeState.segments.length > 4000) pipeState.segments.shift();
    }

    function drawBounce() {
      ctx!.fillStyle = 'rgba(0,0,0,0.15)';
      ctx!.fillRect(0, 0, width, height);
      const size = 46;
      bounceState.x += bounceState.vx;
      bounceState.y += bounceState.vy;
      let bounced = false;
      if (bounceState.x <= 0 || bounceState.x + size >= width) {
        bounceState.vx *= -1;
        bounced = true;
      }
      if (bounceState.y <= 0 || bounceState.y + size >= height) {
        bounceState.vy *= -1;
        bounced = true;
      }
      if (bounced) bounceState.colorIndex = (bounceState.colorIndex + 1) % PALETTE.length;
      ctx!.fillStyle = PALETTE[bounceState.colorIndex];
      ctx!.fillRect(bounceState.x, bounceState.y, size, size);
    }

    function drawBars() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, width, height);
      const barWidth = width / bars.length;
      bars.forEach((bar, i) => {
        if (Math.random() < 0.08) bar.target = Math.random() * height * 0.85;
        bar.height += (bar.target - bar.height) * 0.15;
        const hue = (i / bars.length) * 300;
        const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.55);
        ctx!.fillStyle = `rgb(${r},${g},${b})`;
        ctx!.fillRect(i * barWidth + 1, height - bar.height, barWidth - 2, bar.height);
      });
    }

    function tick() {
      t += 0.02;
      switch (preset) {
        case 'starfield':
          drawStarfield();
          break;
        case 'plasma':
          drawPlasma();
          break;
        case 'pipes':
          drawPipes();
          break;
        case 'bounce':
          drawBounce();
          break;
        case 'bars':
          drawBars();
          break;
      }
      raf = requestAnimationFrame(tick);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, [preset]);

  return (
    <div ref={containerRef} className="h-full w-full bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, tt: number) => {
      let x = tt;
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
