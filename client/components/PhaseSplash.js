'use client';
import { useEffect, useState } from 'react';

const SPLASH = {
  NIGHT: { icon: '🌙', text: 'Night falls', sub: 'The town goes to sleep…' },
  DISCUSSION: { icon: '☀️', text: 'Dawn breaks', sub: 'Time to find the Mafia' },
  VOTING: { icon: '🗳️', text: 'Time to vote', sub: 'Choose wisely' },
};

// Brief full-screen title card when a major phase starts.
export default function PhaseSplash({ phase, day }) {
  const [show, setShow] = useState(null);

  useEffect(() => {
    const s = SPLASH[phase];
    if (!s) return;
    setShow({ ...s, key: `${phase}-${day}` });
    const t = setTimeout(() => setShow(null), 1900);
    return () => clearTimeout(t);
  }, [phase, day]);

  if (!show) return null;
  return (
    <div className="splash" key={show.key} role="status">
      <div className="splash-icon">{show.icon}</div>
      <div className="splash-text">{show.text}</div>
      <div className="splash-sub">{show.sub}</div>
    </div>
  );
}
