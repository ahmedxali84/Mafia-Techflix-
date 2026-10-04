'use client';
import { useEffect, useRef, useState } from 'react';
import { play } from '@/lib/sound';

// endsAt is a server timestamp; serverNow lets us correct for clock differences.
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
    const iv = setInterval(tick, 100);
    return () => clearInterval(iv);
  }, [endsAt, serverNow, phaseMs]);

  if (!endsAt) return null;
  const left = Math.ceil(ms / 1000);
  const pct = phaseMs ? Math.min(100, (ms / phaseMs) * 100) : 0;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  return (
    <div className={`timer-wrap ${left <= 5 ? 'urgent' : ''}`} role="timer" aria-label={`${left} seconds left`}>
      <span className="timer">{m}:{s}</span>
      <span className="timer-bar"><span style={{ width: `${pct}%` }} /></span>
    </div>
  );
}
