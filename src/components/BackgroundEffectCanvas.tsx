import React, { useEffect, useRef } from 'react';
import type { BackgroundEffectType } from '@/types/profile';

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  opacity: number;
}

const PARTICLE_COUNT: Record<Exclude<BackgroundEffectType, 'none'>, number> = {
  snow: 60,
  stars: 90,
  smoke: 16,
};

function makeParticle(kind: BackgroundEffectType, w: number, h: number): Particle {
  if (kind === 'stars') {
    return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.5, speed: 0, drift: Math.random() * Math.PI * 2, opacity: Math.random() };
  }
  if (kind === 'smoke') {
    return { x: Math.random() * w, y: h + Math.random() * 100, r: Math.random() * 70 + 40, speed: Math.random() * 0.25 + 0.12, drift: (Math.random() - 0.5) * 0.25, opacity: Math.random() * 0.07 + 0.03 };
  }
  return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.5 + 1, speed: Math.random() * 0.8 + 0.4, drift: (Math.random() - 0.5) * 0.5, opacity: Math.random() * 0.5 + 0.4 };
}

/**
 * A curated set of preset canvas particle effects (never free-form
 * user-authored canvas/JS) layered over a profile's background. Uses
 * 'difference' blending so particles stay visible against any
 * background color the profile owner picked.
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

    function tick() {
      t += 0.016;
      ctx!.clearRect(0, 0, width, height);
      ctx!.globalCompositeOperation = 'difference';
      ctx!.fillStyle = '#ffffff';

      for (const p of particles) {
        if (effect === 'stars') {
          const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + p.drift);
          ctx!.globalAlpha = p.opacity * twinkle;
        } else {
          if (effect === 'smoke') {
            p.y -= p.speed;
            if (p.y < -p.r) {
              p.y = height + p.r;
              p.x = Math.random() * width;
            }
          } else {
            p.y += p.speed;
            if (p.y > height + p.r) {
              p.y = -p.r;
              p.x = Math.random() * width;
            }
          }
          p.x += p.drift;
          ctx!.globalAlpha = p.opacity;
        }

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
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
