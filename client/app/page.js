'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SERVER_URL, socket, emit, getPlayerId, getName, setName } from '@/lib/socket';
import { play } from '@/lib/sound';
import Scene from '@/components/Scene';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';
import { ROLE_INFO } from '@/components/PlayerCard';

const CAPS = [
  ['Chapter I', 'The city sleeps.', 'One table. One secret. Nobody is who they seem.'],
  ['Night', 'The family chooses.', 'Mafia pick a victim. The Doctor and Detective act in the dark.'],
  ['Dawn', 'The town accuses.', 'Someone is gone. Everyone votes. Someone pays.'],
  ['Your move', 'Take your seat.', 'Five to twelve players. Free to play.'],
];
const EDGES = [0, 0.25, 0.5, 0.75, 1.1];
const clamp = (v) => Math.min(1, Math.max(0, v));

export default function Home() {
  const router = useRouter();
  const [name, setNameState] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [help, setHelp] = useState(false);
  const [cap, setCap] = useState(0);
  const story = useRef(null);
  const logo = useRef(null);
  const spot = useRef(null);
  const bar = useRef(null);

  useEffect(() => {
    setNameState(getName());
    fetch(`${SERVER_URL}/stats/${getPlayerId()}`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
  }, []);


  // Scroll-driven reveal: the logo lights up and zooms as you scroll.
  useEffect(() => {
    const upd = () => {
      const el = story.current;
      if (!el || !logo.current) return;
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

  async function create() {
    play('click');
    if (!name.trim()) return setError('Enter your name first');
    setBusy(true);
    setName(name.trim());
    try {
      if (!socket.connected) {
        socket.connect();
        await new Promise((resolve, reject) => {
          socket.once('connect', resolve);
          socket.once('connect_error', () => reject(new Error('Cannot reach the game server')));
        });
      }
      const res = await emit('create_room', { playerId: getPlayerId(), name: name.trim() });
      socket.disconnect(); // the room page opens its own connection
      if (res.error) throw new Error(res.error);
      router.push(`/room/${res.code}`);
    } catch (e) {
      socket.disconnect();
      setError(e.message);
      setBusy(false);
    }
  }

  function join(e) {
    e.preventDefault();
    play('click');
    if (!name.trim()) return setError('Enter your name first');
    if (code.trim().length < 4) return setError('Enter the 4-letter room code');
    setName(name.trim());
    router.push(`/room/${code.trim().toUpperCase()}`);
  }

  const winRate = stats?.games ? Math.round((stats.wins / stats.games) * 100) : 0;

  return (
    <main className="screen cine">
      <Scene day={false} />
      <div className="topbar floating">
        <b className="wordmark">MAFIA</b>
        <div className="topbar-actions">
          <a className="btn small" href="#join">Play</a>
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
              {i === CAPS.length - 1 && <a className="btn primary" href="#join">Join a table</a>}
            </div>
          ))}
          <div className="hint">Scroll</div>
          <div ref={bar} className="pbar" />
        </div>
      </section>

      <section className="cast" id="cast">
        <small>The Cast</small>
        <h2>Choose who to trust.</h2>
        <div className="cast-grid">
          {['MAFIA', 'DOCTOR', 'DETECTIVE', 'VILLAGER'].map((k) => (
            <div className="cast-card" key={k}>
              {ROLE_INFO[k].icon}
              <h3>{ROLE_INFO[k].label}</h3>
              <p>{ROLE_INFO[k].blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="home" id="join">
        <h2 className="join-title">Take your seat.</h2>

        <div className="card glass">
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" className="input" maxLength={16} value={name} autoComplete="nickname"
            onChange={(e) => { setNameState(e.target.value); setError(''); }} placeholder="e.g. Ayesha" />

          <button className="btn primary lg" onClick={create} disabled={busy}>
            {busy ? 'Creating…' : '✨ Create a room'}
          </button>

          <div className="divider"><span>or join a friend</span></div>

          <form onSubmit={join} className="row">
            <input className="input code" aria-label="Room code" maxLength={4} value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }} placeholder="CODE" />
            <button className="btn lg" type="submit">Join</button>
          </form>

          {error && <p className="error" role="alert">{error}</p>}
        </div>

        {stats && (
          <div className="stat-row">
            <div><b>{stats.games}</b><span>games</span></div>
            <div><b>{stats.wins}</b><span>wins</span></div>
            <div><b>{winRate}%</b><span>win rate</span></div>
          </div>
        )}

        <div className="links">
          <Link href="/leaderboard">🏆 Leaderboard</Link>
          <button onClick={() => setHelp(true)}>📖 How to play</button>
        </div>
        <p className="muted small center-text">5–12 players · works on phones and laptops · no download</p>
      </div>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}
