import { useEffect } from 'react';

/**
 * Drives the --mx/--my custom properties that body::after (src/index.css)
 * uses to mask the bright grid spotlight around the cursor. Eases toward the
 * cursor each frame for a trailing feel, matching moxmap's spring-smoothed
 * version (built there with framer-motion; this project doesn't depend on
 * it, so plain requestAnimationFrame + lerp does the same job).
 */
export function useCursorSpotlight() {
  useEffect(() => {
    const root = document.documentElement;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let curX = targetX;
    let curY = targetY;
    let frame: number;

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const tick = () => {
      curX += (targetX - curX) * 0.15;
      curY += (targetY - curY) * 0.15;
      root.style.setProperty('--mx', `${curX}px`);
      root.style.setProperty('--my', `${curY}px`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frame);
    };
  }, []);
}
