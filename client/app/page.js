'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SERVER_URL, socket, emit, getPlayerId, getName, setName } from '@/lib/socket';
import { play } from '@/lib/sound';
import Scene from '@/components/Scene';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';

export default function Home() {
  const router = useRouter();
  const [name, setNameState] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setNameState(getName());
    fetch(`${SERVER_URL}/stats/${getPlayerId()}`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => {});
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
    <main className="screen">
      <Scene day={false} />
      <div className="topbar floating">
        <span />
        <div className="topbar-actions">
          <SoundToggle />
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play" title="How to play">❔</button>
        </div>
      </div>

      <div className="home">
        <div className="hero">
          <div className="hero-mask">🎭</div>
          <h1 className="logo">MAFIA</h1>
          <p className="tagline">Trust no one. Lie well. Survive the night.</p>
        </div>

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
