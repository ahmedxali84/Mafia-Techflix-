'use client';
import { useEffect } from 'react';

// Gives any element with data-tilt a gentle 3D tilt and a moving light spot
// that follow the pointer. Sets --rx, --ry (degrees) and --mx, --my (%) on it.
export default function TiltLayer() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover)').matches) return;
    let active = null;
    let frame = 0;

    const reset = (el) => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
      el.classList.remove('tilting');
    };

    const onMove = (e) => {
      const el = e.target.closest?.('[data-tilt]');
      if (active && active !== el) reset(active);
      active = el;
      if (!el) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const max = Number(el.dataset.tilt) || 6;
        el.style.setProperty('--rx', `${(0.5 - y) * max}deg`);
        el.style.setProperty('--ry', `${(x - 0.5) * max}deg`);
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
        el.classList.add('tilting');
      });
    };
    const onLeave = () => active && reset(active);

    addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
