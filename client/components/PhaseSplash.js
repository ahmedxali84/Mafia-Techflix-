'use client';
import { useEffect, useState } from 'react';

const SPLASH = {
  NIGHT: { text: 'Night falls', sub: 'The town goes to sleep' },
  DISCUSSION: { text: 'Dawn breaks', sub: 'Time to find the Mafia' },
  VOTING: { text: 'Time to vote', sub: 'Someone has to pay' },
};

// A short banner across the screen when a major phase starts, so nobody misses the change.
export default function PhaseSplash({ phase, day }) {
  const [show, setShow] = useState(null);

  useEffect(() => {
    const s = SPLASH[phase];
    if (!s) return;
    setShow({ ...s, key: `${phase}-${day}` });
    const t = setTimeout(() => setShow(null), 1700);
    return () => clearTimeout(t);
  }, [phase, day]);

  if (!show) return null;
  return (
    <div className="splash" key={show.key} role="status">
      <div className="splash-band">
        <span className="label">{day > 0 ? `Day ${day}` : 'Mafia'}</span>
        <strong>{show.text}</strong>
        <span className="splash-sub">{show.sub}</span>
      </div>
    </div>
  );
}
