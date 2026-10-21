'use client';
import { useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sound';

// Phase countdown for the HUD. endsAt is a server timestamp; serverNow corrects for clock differences.
export default function Timer({ endsAt, serverNow, phaseMs }) {
  const [ms, setMs] = useState(0);
  const lastTick = useRef(null);

  useEffect(() => {
    if (!endsAt) return setMs(0);
    const offset = serverNow - Date.now();
    const tick = () => {
      const left = Math.max(0, endsAt - (Date.now() + offset));
      setMs(left);
      const sec = Math.ceil(left / 1000);
      if (sec <= 5 && sec > 0 && lastTick.current !== sec && phaseMs > 8000) {
        lastTick.current = sec;
        play('tick');
      }
    };
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, [endsAt, serverNow, phaseMs]);

  if (!endsAt) return null;
  const left = Math.ceil(ms / 1000);
  const pct = phaseMs ? Math.min(100, (ms / phaseMs) * 100) : 0;
  return (
    <div className={`timer ${left <= 5 ? 'urgent' : ''}`} role="timer" aria-label={`${left} seconds left`}>
      <span className="timer-num">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
      <span className="timer-bar"><span style={{ transform: `scaleX(${pct / 100})` }} /></span>
    </div>
  );
}
