'use client';
import { useEffect, useState } from 'react';
import { isMuted, setMuted, play } from '@/lib/sound';

export default function SoundToggle() {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  return (
    <button
      className="icon-btn"
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => {
        setMuted(!muted);
        setM(!muted);
        if (muted) play('select');
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
