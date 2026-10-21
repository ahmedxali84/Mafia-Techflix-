'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import SoundToggle from './SoundToggle';
import HowToPlay from './HowToPlay';

// Top navigation for the out-of-game screens (menu and career).
export default function MenuBar({ active }) {
  const [help, setHelp] = useState(false);
  return (
    <header className="menubar">
      <Link href="/" className="brand" aria-label="Mafia home">MAFIA</Link>
      <nav className="menu-nav" aria-label="Main">
        <Link href="/play" className={active === 'play' ? 'on' : ''} aria-current={active === 'play' ? 'page' : undefined}>Play</Link>
        <Link href="/stats" className={active === 'career' ? 'on' : ''} aria-current={active === 'career' ? 'page' : undefined}>Career</Link>
        <button onClick={() => setHelp(true)}>How to play</button>
      </nav>
      <div className="menubar-end">
        <SoundToggle className="hud-btn" />
      </div>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </header>
  );
}
