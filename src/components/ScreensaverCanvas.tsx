import React, { useEffect, useRef } from 'react';
import type { ScreensaverPreset } from '@/lib/screensaverPresets';

const PALETTE = ['#ff004c', '#ff9900', '#fff200', '#22ff00', '#00e5ff', '#7000ff'];
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface Star { x: number; y: number; z: number; hue: number; }
interface PipeSegment { x: number; y: number; }
interface MystifyPoint { x: number; y: number; vx: number; vy: number; }
interface MystifyShape { hue: number; points: MystifyPoint[]; }
interface Bar { height: number; target: number; }
interface Rocket { x: number; y: number; vx: number; vy: number; hue: number; exploded: boolean; }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; hue: number; }
interface Metaball { x: number; y: number; vx: number; vy: number; r: number; }
interface KPoint { angle: number; radius: number; speed: number; wobble: number; hue: number; }

/** The canvas content of the screensaver easter-egg window - a set of
 *  classic demoscene/screensaver-style presets (no real audio hookup, just
 *  generative animation for the retro-visualizer vibe). Purely generated,
 *  no user input reaches the canvas, so there's no injection surface here. */
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

    // Shared low-res offscreen buffer for the per-pixel presets (plasma,
    // metaballs, tunnel) - only one of these ever runs at a time, so one
    // buffer reused across them avoids allocating three.
    const lowResCanvas = document.createElement('canvas');
    const lowResCtx = lowResCanvas.getContext('2d')!;
    const drawLowRes = (divisor: number, fill: (x: number, y: number) => [number, number, number]) => {
      const w = Math.max(1, Math.floor(width / divisor));
      const h = Math.max(1, Math.floor(height / divisor));
      const img = ctx!.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const [r, g, b] = fill(x, y);
          const i = (y * w + x) * 4;
          img.data[i] = r;
          img.data[i + 1] = g;
          img.data[i + 2] = b;
          img.data[i + 3] = 255;
        }
      }
      lowResCanvas.width = w;
      lowResCanvas.height = h;
      lowResCtx.putImageData(img, 0, 0);
      ctx!.imageSmoothingEnabled = true;
      ctx!.drawImage(lowResCanvas, 0, 0, w, h, 0, 0, width, height);
    };

    // ---- per-preset state, rebuilt whenever the preset changes ----
    const stars: Star[] = Array.from({ length: 260 }, () => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random(),
      hue: Math.random() * 360,
    }));

    const pipeState = { segments: [{ x: 0, y: 0 }] as PipeSegment[], dir: { x: 1, y: 0 }, color: PALETTE[0] };

    const mystifyShapes: MystifyShape[] = Array.from({ length: 3 }, (_, i) => ({
      hue: i * 120,
      points: Array.from({ length: 4 }, () => ({
        x: Math.random() * 400,
        y: Math.random() * 300,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
      })),
    }));

    const bars: Bar[] = Array.from({ length: 32 }, () => ({ height: 0, target: 0 }));

    const matrixDrops: number[] = [];

    let rockets: Rocket[] = [];
    let sparks: Spark[] = [];

    const metaballs: Metaball[] = Array.from({ length: 6 }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 300,
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 1.6,
      r: 26 + Math.random() * 34,
    }));

    const kPoints: KPoint[] = Array.from({ length: 5 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 20 + Math.random() * 70,
      speed: 0.008 + Math.random() * 0.018,
      wobble: 1 + Math.random() * 0.8,
      hue: Math.random() * 360,
    }));
    const KALEIDOSCOPE_SEGMENTS = 8;

    function drawStarfield() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      for (const s of stars) {
        s.z -= 0.006;
        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * 2;
          s.y = (Math.random() - 0.5) * 2;
          s.z = 1;
          s.hue = Math.random() * 360;
        }
        const px = cx + (s.x / s.z) * cx;
        const py = cy + (s.y / s.z) * cy;
        if (px < 0 || px > width || py < 0 || py > height) continue;
        const r = (1 - s.z) * 2.5;
        const [cr, cg, cb] = hslToRgb(s.hue / 360, 0.6, 0.75);
        ctx!.globalAlpha = 1 - s.z;
        ctx!.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx!.beginPath();
        ctx!.arc(px, py, Math.max(r, 0.5), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    function drawPlasma() {
      drawLowRes(4, (x, y) => {
        const scale = 0.06;
        const v =
          Math.sin(x * scale + t) +
          Math.sin(y * scale + t * 1.3) +
          Math.sin((x + y) * scale + t * 0.7) +
          Math.sin(Math.sqrt(x * x + y * y) * scale + t * 1.5);
        return hslToRgb(((v + 4) / 8), 0.65, 0.5);
      });
    }

    function drawPipes() {
      if (t < 0.05) {
        ctx!.fillStyle = '#000';
        ctx!.fillRect(0, 0, width, height);
        pipeState.segments = [{ x: width / 2, y: height / 2 }];
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
        ctx!.fillStyle = '#000';
        ctx!.fillRect(0, 0, width, height);
        pipeState.segments = [{ x: width / 2, y: height / 2 }];
        nx = width / 2;
        ny = height / 2;
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

    function drawMystify() {
      ctx!.fillStyle = 'rgba(0,0,0,0.08)';
      ctx!.fillRect(0, 0, width, height);
      for (const shape of mystifyShapes) {
        shape.hue = (shape.hue + 0.3) % 360;
        for (const p of shape.points) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x <= 0 || p.x >= width) p.vx *= -1;
          if (p.y <= 0 || p.y >= height) p.vy *= -1;
          p.x = Math.min(Math.max(p.x, 0), width);
          p.y = Math.min(Math.max(p.y, 0), height);
        }
        const [r, g, b] = hslToRgb(shape.hue / 360, 0.8, 0.6);
        ctx!.strokeStyle = `rgb(${r},${g},${b})`;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        shape.points.forEach((p, i) => (i === 0 ? ctx!.moveTo(p.x, p.y) : ctx!.lineTo(p.x, p.y)));
        ctx!.closePath();
        ctx!.stroke();
      }
    }

    function drawBars() {
      ctx!.fillStyle = '#000';
      ctx!.fillRect(0, 0, width, height);
      const barWidth = width / bars.length;
      bars.forEach((bar, i) => {
        if (Math.random() < 0.08) bar.target = Math.random() * height * 0.8;
        bar.height += (bar.target - bar.height) * 0.15;
        const hue = (i / bars.length) * 300;
        const [r, g, b] = hslToRgb(hue / 360, 0.7, 0.55);
        const x = i * barWidth + 1;
        const barH = bar.height;
        const grad = ctx!.createLinearGradient(0, height - barH, 0, height);
        grad.addColorStop(0, `rgb(${r},${g},${b})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0.4)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(x, height - barH, barWidth - 2, barH);
        // faint reflection
        ctx!.globalAlpha = 0.15;
        ctx!.fillRect(x, height, barWidth - 2, barH * 0.25);
        ctx!.globalAlpha = 1;
      });
    }

    function drawMatrix() {
      const fontSize = 14;
      const columns = Math.max(1, Math.floor(width / fontSize));
      while (matrixDrops.length < columns) matrixDrops.push(Math.random() * -40);

      ctx!.fillStyle = 'rgba(0,0,0,0.1)';
      ctx!.fillRect(0, 0, width, height);
      ctx!.font = `${fontSize}px monospace`;
      ctx!.textBaseline = 'top';
      for (let i = 0; i < columns; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * fontSize;
        const y = matrixDrops[i] * fontSize;
        ctx!.fillStyle = '#c8ffc8';
        ctx!.fillText(char, x, y);
        ctx!.fillStyle = '#00c832';
        ctx!.fillText(MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)], x, y - fontSize);
        if (y > height && Math.random() > 0.975) matrixDrops[i] = 0;
        matrixDrops[i]++;
      }
    }

    function drawFireworks() {
      ctx!.fillStyle = 'rgba(0,0,0,0.18)';
      ctx!.fillRect(0, 0, width, height);

      if (Math.random() < 0.035) {
        rockets.push({
          x: 40 + Math.random() * (width - 80),
          y: height,
          vx: (Math.random() - 0.5) * 1,
          vy: -(6 + Math.random() * 3),
          hue: Math.random() * 360,
          exploded: false,
        });
      }

      for (const r of rockets) {
        if (r.exploded) continue;
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.05;
        const [rr, gg, bb] = hslToRgb(r.hue / 360, 0.9, 0.6);
        ctx!.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx!.fill();
        if (r.vy >= -0.5) {
          r.exploded = true;
          const count = 40 + Math.floor(Math.random() * 30);
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = 2 + Math.random() * 3;
            sparks.push({
              x: r.x,
              y: r.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 1,
              hue: r.hue + (Math.random() - 0.5) * 40,
            });
          }
        }
      }
      rockets = rockets.filter((r) => !r.exploded);

      for (const s of sparks) {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.04;
        s.vx *= 0.98;
        s.vy *= 0.98;
        s.life -= 0.015;
        const [rr, gg, bb] = hslToRgb(((s.hue % 360) + 360) % 360 / 360, 0.9, 0.6);
        ctx!.globalAlpha = Math.max(s.life, 0);
        ctx!.fillStyle = `rgb(${rr},${gg},${bb})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      sparks = sparks.filter((s) => s.life > 0);
    }

    function drawMetaballs() {
      for (const b of metaballs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0 || b.x > width) b.vx *= -1;
        if (b.y < 0 || b.y > height) b.vy *= -1;
        b.x = Math.min(Math.max(b.x, 0), width);
        b.y = Math.min(Math.max(b.y, 0), height);
      }
      drawLowRes(5, (x, y) => {
        const px = x * 5;
        const py = y * 5;
        let sum = 0;
        for (const b of metaballs) {
          const dx = px - b.x;
          const dy = py - b.y;
          sum += (b.r * b.r) / (dx * dx + dy * dy + 1);
        }
        if (sum < 0.9) return [4, 4, 12];
        const hue = ((t * 20 + sum * 90) % 360) / 360;
        return hslToRgb(hue, 0.75, Math.min(0.35 + sum * 0.15, 0.65));
      });
    }

    function drawTunnel() {
      drawLowRes(4, (x, y) => {
        const cx = width / 4 / 2;
        const cy = height / 4 / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const angle = Math.atan2(dy, dx);
        const depth = 26 / dist + t * 3;
        const stripe = (Math.sin(depth) + Math.sin(angle * 6 + t)) * 0.5;
        const hue = (((stripe * 180 + t * 30) % 360) + 360) % 360;
        const bright = Math.max(0.08, Math.min(0.65, 0.32 + 0.3 * stripe));
        return hslToRgb(hue / 360, 0.7, bright);
      });
    }

    function drawKaleidoscope() {
      ctx!.fillStyle = 'rgba(0,0,0,0.06)';
      ctx!.fillRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      for (const p of kPoints) {
        p.angle += p.speed;
        p.hue = (p.hue + 0.5) % 360;
        const localX = Math.cos(p.angle) * p.radius;
        const localY = Math.sin(p.angle * p.wobble) * p.radius;
        const [r, g, b] = hslToRgb(p.hue / 360, 0.85, 0.6);
        ctx!.fillStyle = `rgb(${r},${g},${b})`;
        for (let s = 0; s < KALEIDOSCOPE_SEGMENTS; s++) {
          const segAngle = (Math.PI * 2 * s) / KALEIDOSCOPE_SEGMENTS;
          const cos = Math.cos(segAngle);
          const sin = Math.sin(segAngle);
          const rx = localX * cos - localY * sin;
          const ry = localX * sin + localY * cos;
          ctx!.beginPath();
          ctx!.arc(cx + rx, cy + ry, 4, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.beginPath();
          ctx!.arc(cx - rx, cy - ry, 4, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
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
        case 'mystify':
          drawMystify();
          break;
        case 'bars':
          drawBars();
          break;
        case 'matrix':
          drawMatrix();
          break;
        case 'fireworks':
          drawFireworks();
          break;
        case 'metaballs':
          drawMetaballs();
          break;
        case 'tunnel':
          drawTunnel();
          break;
        case 'kaleidoscope':
          drawKaleidoscope();
          break;
      }
      raf = requestAnimationFrame(tick);
    }

    ctx!.fillStyle = '#000';
    ctx!.fillRect(0, 0, width, height);
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
