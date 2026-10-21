'use client';
import { useEffect, useRef } from 'react';
import { gsap, reduced } from '@/lib/anim';

// A red ring that trails the pointer and opens up over anything clickable. Mouse/trackpad only.
export default function Cursor() {
  const ring = useRef(null);
  const dot = useRef(null);

  useEffect(() => {
    if (reduced() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const r = ring.current;
    const d = dot.current;
    gsap.set([r, d], { xPercent: -50, yPercent: -50 });
    const rx = gsap.quickTo(r, 'x', { duration: 0.45, ease: 'power3' });
    const ry = gsap.quickTo(r, 'y', { duration: 0.45, ease: 'power3' });
    const dx = gsap.quickTo(d, 'x', { duration: 0.08 });
    const dy = gsap.quickTo(d, 'y', { duration: 0.08 });
    const root = document.documentElement;

    const move = (e) => {
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      root.classList.add('cursor-on');
      r.classList.toggle('hot', !!e.target.closest?.('a, button, input, label'));
    };
    const down = () => gsap.to(r, { scale: 0.7, duration: 0.15 });
    const up = () => gsap.to(r, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
    const out = () => root.classList.remove('cursor-on');

    addEventListener('pointermove', move, { passive: true });
    addEventListener('pointerdown', down);
    addEventListener('pointerup', up);
    root.addEventListener('pointerleave', out);
    return () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerdown', down);
      removeEventListener('pointerup', up);
      root.removeEventListener('pointerleave', out);
      out();
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
