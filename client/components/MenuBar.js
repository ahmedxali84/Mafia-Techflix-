'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import SoundToggle from './SoundToggle';
import HowToPlay from './HowToPlay';
import DiscordButton from './DiscordButton';
import Feedback from './Feedback';

// Top navigation for the out-of-game screens (menu and career).
export default function MenuBar({ active }) {
  const [help, setHelp] = useState(false);
  return (
    <header className="menubar">
      <Link href="/" className="brand" aria-label="Mafia home">MAFIA</Link>
      <nav className="menu-nav" aria-label="Main">
        <Link href="/play" className={active === 'play' ? 'on' : ''} aria-current={active === 'play' ? 'page' : undefined}>Play</Link>
        <Link href="/stats" className={active === 'career' ? 'on' : ''} aria-current={active === 'career' ? 'page' : undefined}>Career</Link>
        <button onClick={() => setHelp(true)} aria-label="How to play"><span className="nav-long">How to play</span><span className="nav-short" aria-hidden="true">Help</span></button>
        <Feedback className="menu-fb" />
      </nav>
      <div className="menubar-end">
        <DiscordButton variant="icon" />
        <SoundToggle className="hud-btn" />
      </div>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </header>
  );
}
