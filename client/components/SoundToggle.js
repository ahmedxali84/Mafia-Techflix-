'use client';
import { useEffect, useState } from 'react';
import { isMuted, setMuted, play } from '@/lib/sound';
import Icon from './Icon';

// `className` picks the look: the home page's 'icon-btn' or the game HUD's 'hud-btn'.
export default function SoundToggle({ className = 'icon-btn' }) {
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  const hud = className !== 'icon-btn';
  return (
    <button
      className={className}
      aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => {
        setMuted(!muted);
        setM(!muted);
        if (muted) play('select');
      }}
    >
      {hud ? <Icon name={muted ? 'volumeOff' : 'volume'} /> : muted ? '🔇' : '🔊'}
    </button>
  );
}
