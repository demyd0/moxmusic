import React, { useEffect, useRef } from 'react';
import type { BackgroundEffectType } from '@/types/profile';

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  opacity: number;
  hue?: number;
  rotation?: number;
  rotationSpeed?: number;
}

const PARTICLE_COUNT: Record<Exclude<BackgroundEffectType, 'none'>, number> = {
  snow: 60,
  stars: 90,
  smoke: 16,
  confetti: 50,
  fireflies: 24,
  bubbles: 28,
  sparks: 30,
  petals: 26,
};

/** Effects that render real colors and should NOT use 'difference'
 *  blending (which is only there to keep monochrome effects visible
 *  against any background color). */
const NORMAL_BLEND_EFFECTS = new Set<BackgroundEffectType>(['confetti', 'fireflies', 'bubbles', 'sparks', 'petals']);

function makeParticle(kind: BackgroundEffectType, w: number, h: number): Particle {
  if (kind === 'stars') {
    return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.5, speed: 0, drift: Math.random() * Math.PI * 2, opacity: Math.random() };
  }
  if (kind === 'smoke') {
    return { x: Math.random() * w, y: h + Math.random() * 100, r: Math.random() * 70 + 40, speed: Math.random() * 0.25 + 0.12, drift: (Math.random() - 0.5) * 0.25, opacity: Math.random() * 0.07 + 0.03 };
  }
  if (kind === 'confetti') {
    return {
      x: Math.random() * w,
      y: -20 - Math.random() * h,
      r: Math.random() * 4 + 3,
      speed: Math.random() * 1.6 + 1,
      drift: (Math.random() - 0.5) * 1.4,
      opacity: Math.random() * 0.3 + 0.7,
      hue: Math.random() * 360,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
    };
  }
  if (kind === 'fireflies') {
    return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + 1.5, speed: (Math.random() - 0.5) * 0.3, drift: (Math.random() - 0.5) * 0.3, opacity: Math.random() * 0.5 + 0.3 };
  }
  if (kind === 'bubbles') {
    return { x: Math.random() * w, y: h + Math.random() * 100, r: Math.random() * 9 + 4, speed: Math.random() * 0.55 + 0.25, drift: 0, opacity: Math.random() * 0.5 + 0.3 };
  }
  if (kind === 'sparks') {
    return { x: Math.random() * w, y: h + Math.random() * 60, r: Math.random() * 1.8 + 0.8, speed: Math.random() * 0.9 + 0.5, drift: (Math.random() - 0.5) * 0.6, opacity: Math.random() * 0.5 + 0.5, hue: Math.random() * 30 + 10 };
  }
  if (kind === 'petals') {
    return {
      x: Math.random() * w,
      y: -20 - Math.random() * h,
      r: Math.random() * 3.5 + 3,
      speed: Math.random() * 0.7 + 0.4,
      drift: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.35 + 0.55,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.05,
    };
  }
  return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.5 + 1, speed: Math.random() * 0.8 + 0.4, drift: (Math.random() - 0.5) * 0.5, opacity: Math.random() * 0.5 + 0.4 };
}

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

/**
 * A curated set of preset canvas particle effects (never free-form
 * user-authored canvas/JS) layered over a profile's background.
 * Monochrome effects (snow/stars/smoke) use 'difference' blending to stay
 * visible against any background color; colored effects (confetti/
 * fireflies/bubbles) render normally since inverting their color would
 * defeat the point.
 */
export const BackgroundEffectCanvas: React.FC<{ effect: BackgroundEffectType }> = ({ effect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (effect === 'none') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const count = PARTICLE_COUNT[effect] ?? 40;
    const particles: Particle[] = Array.from({ length: count }, () => makeParticle(effect, width, height));

    let raf = 0;
    let t = 0;
    const normalBlend = NORMAL_BLEND_EFFECTS.has(effect);

    function tick() {
      t += 0.016;
      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = normalBlend ? 'source-over' : 'difference';
      if (!normalBlend) ctx!.fillStyle = '#ffffff';
      ctx!.shadowBlur = 0;

      for (const p of particles) {
        if (effect === 'stars') {
          const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + p.drift);
          ctx!.globalAlpha = p.opacity * twinkle;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (effect === 'smoke') {
          p.y -= p.speed;
          if (p.y < -p.r) {
            p.y = height + p.r;
            p.x = Math.random() * width;
          }
          p.x += p.drift;
          ctx!.globalAlpha = p.opacity;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        } else if (effect === 'confetti') {
          p.y += p.speed;
          p.x += p.drift;
          p.rotation = (p.rotation ?? 0) + (p.rotationSpeed ?? 0);
          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          const [r, g, b] = hslToRgb((p.hue ?? 0) / 360, 0.85, 0.6);
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.rotation);
          ctx!.globalAlpha = p.opacity;
          ctx!.fillStyle = `rgb(${r},${g},${b})`;
          ctx!.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
          ctx!.restore();
        } else if (effect === 'fireflies') {
          p.x += p.drift;
          p.y += p.speed;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
          const pulse = 0.35 + 0.65 * Math.sin(t * 2.5 + p.x * 0.05);
          ctx!.globalAlpha = p.opacity * pulse;
          ctx!.fillStyle = '#ffe066';
          ctx!.shadowColor = '#ffe066';
          ctx!.shadowBlur = 8;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        } else if (effect === 'sparks') {
          p.y -= p.speed;
          p.x += p.drift + Math.sin(t * 3 + p.y * 0.08) * 0.3;
          if (p.y < -p.r) {
            p.y = height + p.r;
            p.x = Math.random() * width;
          }
          const flicker = 0.5 + 0.5 * Math.sin(t * 6 + p.x * 0.1);
          const [r, g, b] = hslToRgb((p.hue ?? 20) / 360, 1, 0.55);
          ctx!.globalAlpha = p.opacity * flicker;
          ctx!.fillStyle = `rgb(${r},${g},${b})`;
          ctx!.shadowColor = `rgb(${r},${g},${b})`;
          ctx!.shadowBlur = 6;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        } else if (effect === 'petals') {
          p.y += p.speed;
          p.x += p.drift + Math.sin(t + p.y * 0.03) * 0.6;
          p.rotation = (p.rotation ?? 0) + (p.rotationSpeed ?? 0);
          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
          ctx!.save();
          ctx!.translate(p.x, p.y);
          ctx!.rotate(p.rotation);
          ctx!.globalAlpha = p.opacity;
          ctx!.fillStyle = '#ffb3d1';
          ctx!.beginPath();
          ctx!.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        } else if (effect === 'bubbles') {
          p.y -= p.speed;
          p.x += Math.sin(t + p.y * 0.05) * 0.4;
          if (p.y < -p.r) {
            p.y = height + p.r;
            p.x = Math.random() * width;
          }
          ctx!.globalAlpha = p.opacity;
          ctx!.fillStyle = 'rgba(255,255,255,0.1)';
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = p.opacity * 1.6;
          ctx!.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx!.lineWidth = 1;
          ctx!.stroke();
        } else {
          // snow
          p.y += p.speed;
          if (p.y > height + p.r) {
            p.y = -p.r;
            p.x = Math.random() * width;
          }
          p.x += p.drift;
          ctx!.globalAlpha = p.opacity;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    tick();

    function handleResize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
    };
  }, [effect]);

  if (effect === 'none') return null;

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" />;
};
