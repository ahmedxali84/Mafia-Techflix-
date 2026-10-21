'use client';
import { useEffect, useRef } from 'react';

// Shared warp control. A page raises `target` for a hyperspace rush toward the camera;
// every newly mounted field resets it to 1, so the rush carries over and slows down on the next page.
export const embers = { speed: 1, target: 1 };

const DEPTH = 1600;
const COLORS = ['225, 40, 45', '255, 110, 70', '255, 190, 110'];

// Embers drifting through real 3D space (perspective-projected onto a canvas), with pointer parallax.
export default function Embers3D() {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = innerWidth < 700 || matchMedia('(hover: none)').matches; // phones: fewer embers, no glow pass
    embers.target = 1;
    let w = 0, h = 0, raf = 0, mx = 0, my = 0, camX = 0, camY = 0;

    const spawn = (p, anywhere) => {
      p.x = (Math.random() - 0.5) * 2600;
      p.y = (Math.random() - 0.5) * 1700;
      p.z = anywhere ? 40 + Math.random() * DEPTH : DEPTH;
      p.vx = (Math.random() - 0.5) * 0.35;
      p.vy = -0.2 - Math.random() * 0.55; // embers rise
      p.r = 0.7 + Math.random() * 1.9;
      p.c = COLORS[Math.random() < 0.45 ? 0 : Math.random() < 0.7 ? 1 : 2];
      p.ph = Math.random() * Math.PI * 2;
      p.sx = null;
      return p;
    };
    const pts = Array.from({ length: small ? 40 : 160 }, () => spawn({}, true));

    const size = () => {
      // On phones the address bar changes the height while scrolling; reallocating the canvas
      // for those few pixels each time causes stutter, so only a real resize counts.
      if (small && w && innerWidth === w && Math.abs(innerHeight - h) < 160) return;
      const dpr = small ? 1 : Math.min(devicePixelRatio || 1, 1.5);
      w = innerWidth;
      h = innerHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const onMove = (e) => { mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5; };

    const draw = (t) => {
      embers.speed += (embers.target - embers.speed) * 0.04;
      const s = embers.speed;
      const warp = s > 3;
      camX += (mx * 140 - camX) * 0.05;
      camY += (my * 90 - camY) * 0.05;
      const f = Math.min(w, h) * 0.9; // focal length

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const p of pts) {
        if (!still) {
          p.z -= 1.2 * s;
          p.x += p.vx + Math.sin(t / 1400 + p.ph) * 0.25;
          p.y += p.vy;
        }
        const k = f / p.z;
        const sx = w / 2 + (p.x - camX) * k;
        const sy = h / 2 + (p.y - camY) * k;
        if (p.z < 30 || sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) { spawn(p, false); continue; }

        const a = Math.min(1, (DEPTH - p.z) / 300) * Math.min(1, p.z / 140); // fade in far away, out up close
        const flick = 0.65 + 0.35 * Math.sin(t / 170 + p.ph * 3);
        const r = Math.max(0.4, p.r * k * 1.3);
        if (warp && p.sx != null) {
          ctx.strokeStyle = `rgba(${p.c}, ${a * 0.85})`;
          ctx.lineWidth = r;
          ctx.beginPath();
          ctx.moveTo(p.sx, p.sy);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        } else {
          if (!small) {
            ctx.fillStyle = `rgba(${p.c}, ${a * flick * 0.16})`;
            ctx.beginPath();
            ctx.arc(sx, sy, r * 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = `rgba(${p.c}, ${a * flick})`;
          ctx.beginPath();
          ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        p.sx = sx;
        p.sy = sy;
      }
      if (!still) raf = requestAnimationFrame(draw);
    };

    size();
    addEventListener('resize', size);
    addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
      removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} className="embers3d" />;
}
