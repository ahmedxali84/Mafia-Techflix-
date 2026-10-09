'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { play } from '@/lib/sound';
import Scene from '@/components/Scene';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';

const CAPS = [
  ['Chapter I', 'The city sleeps.', 'One table. One secret. Nobody is who they seem.'],
  ['Night', 'The family chooses.', 'Mafia pick a victim. The Doctor and Detective act in the dark.'],
  ['Dawn', 'The town accuses.', 'Someone is gone. Everyone votes. Someone pays.'],
  ['Your move', 'Take your seat.', 'Five to twelve players. Free to play.'],
];
const EDGES = [0, 0.25, 0.5, 0.75, 1.1];
const clamp = (v) => Math.min(1, Math.max(0, v));

export default function Home() {
  const [help, setHelp] = useState(false);
  const [cap, setCap] = useState(0);
  const story = useRef(null);
  const logo = useRef(null);
  const spot = useRef(null);
  const bar = useRef(null);
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const leavingRef = useRef(false);

  useEffect(() => {
    router.prefetch('/play');
  }, [router]);

  // Outro: the logo rushes toward the camera until it fills the screen, then /play opens.
  function enterTable(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return; // let new-tab clicks through
    e.preventDefault();
    if (leavingRef.current) return;
    play('click');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return router.push('/play');
    leavingRef.current = true;
    setLeaving(true);
    const el = logo.current;
    el.style.transition = 'transform 1.2s cubic-bezier(0.7, 0, 0.25, 1), filter 1.2s ease-in';
    el.style.transform = 'translate(-50%,-50%) scale(7)';
    el.style.filter = 'brightness(1.25) drop-shadow(0 0 80px rgba(211,32,42,0.9))';
    spot.current.style.setProperty('--r', '120%');
    setTimeout(() => router.push('/play'), 1150);
  }

  // Scroll-driven reveal: the logo lights up and zooms as you scroll.
  useEffect(() => {
    const upd = () => {
      const el = story.current;
      if (!el || !logo.current || leavingRef.current) return;
      const p = clamp(-el.getBoundingClientRect().top / (el.offsetHeight - innerHeight));
      const e = clamp(p / 0.6);
      logo.current.style.filter = `brightness(${0.08 + e * 0.92}) drop-shadow(0 0 ${30 + e * 20}px rgba(211,32,42,${0.5 - e * 0.15}))`;
      logo.current.style.transform = `translate(-50%,-50%) scale(${0.82 + p * 0.22})`;
      spot.current.style.setProperty('--r', 8 + e * 55 + '%');
      bar.current.style.width = p * 100 + '%';
      setCap(EDGES.findIndex((a, i) => p >= a && p < EDGES[i + 1]));
    };
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
    upd();
    return () => { removeEventListener('scroll', upd); removeEventListener('resize', upd); };
  }, []);

  return (
    <main className={`screen cine ${leaving ? 'leaving' : ''}`}>
      <Scene day={false} />
      <div className="topbar floating">
        <b className="wordmark">MAFIA</b>
        <div className="topbar-actions">
          <Link className="btn small" href="/play" onClick={enterTable}>Play</Link>
          <SoundToggle />
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play" title="How to play">❔</button>
        </div>
      </div>

      <section ref={story} className="story">
        <div className="stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={logo} className="logo-main" src="/logo.webp" alt="Mafia Game" />
          <div ref={spot} className="spot" />
          {CAPS.map(([k, h, t], i) => (
            <div key={k} className={`cap ${i % 2 ? 'r' : 'l'} ${cap === i ? 'on' : ''}`}>
              <small>{k}</small>
              <h2>{h}</h2>
              <p>{t}</p>
              {i === CAPS.length - 1 && <Link className="btn primary" href="/play" onClick={enterTable}>Join a table</Link>}
            </div>
          ))}
          <div className="hint">Scroll</div>
          <div ref={bar} className="pbar" />
        </div>
      </section>

      {leaving && <div className="outro-veil" aria-hidden="true" />}
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}
