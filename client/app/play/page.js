'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { socket, emit, getPlayerId, getName, setName } from '@/lib/socket';
import { getStats } from '@/lib/stats';
import { play } from '@/lib/sound';
import Scene from '@/components/Scene';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';

export default function Play() {
  const router = useRouter();
  const [name, setNameState] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [help, setHelp] = useState(false);
  const nameRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    setNameState(getName());
    const s = getStats();
    if (s.games) setStats(s);
  }, []);

  useEffect(() => {
    if (mode === 'join') codeRef.current?.focus();
  }, [mode]);

  function needName() {
    if (name.trim()) return false;
    setError('Enter your name first');
    nameRef.current?.focus();
    return true;
  }

  function pick(m) {
    play('click');
    setError('');
    setMode(m);
  }

  async function create(bots = 0) {
    play('click');
    if (needName()) return;
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
      const res = await emit('create_room', { playerId: getPlayerId(), name: name.trim(), bots });
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
    if (needName()) return;
    if (code.trim().length < 4) return setError('Enter the 4-letter room code');
    setName(name.trim());
    router.push(`/room/${code.trim().toUpperCase()}`);
  }

  const winRate = stats?.games ? Math.round((stats.wins / stats.games) * 100) : 0;

  return (
    <main className="screen">
      <Scene day={false} />
      <div className="veil-in" aria-hidden="true" />
      <div className="topbar">
        <Link href="/" className="btn small ghost">← Back</Link>
        <b className="wordmark center-text">MAFIA</b>
        <div className="topbar-actions">
          <SoundToggle />
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play" title="How to play">❔</button>
        </div>
      </div>

      <div className="lobby-gate">
        <header className="gate-head">
          <small>Your move</small>
          <h1>Take your seat.</h1>
          <p className="muted">Start a new table for your friends, or join one with a code.</p>
        </header>

        <div className="card glass gate-name">
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" ref={nameRef} className="input" maxLength={16} value={name} autoComplete="nickname"
            onChange={(e) => { setNameState(e.target.value); setError(''); }} placeholder="e.g. Ayesha" />
        </div>

        <div className="gate-grid">
          <section
            data-tilt="7"
            className={`gate-card ${mode === 'create' ? 'on' : ''} ${mode === 'join' ? 'dim' : ''}`}
            onClick={() => mode !== 'create' && pick('create')}
          >
            <div className="gate-ico">🎩</div>
            <h2>Create a table</h2>
            <p>Host a new game and share the 4-letter code, or start right away against 5 bots.</p>
            <button className="btn primary lg" onClick={(e) => { e.stopPropagation(); create(); }} disabled={busy}>
              {busy ? 'Setting the table…' : 'Create table'}
            </button>
            <button className="btn lg" onClick={(e) => { e.stopPropagation(); create(5); }} disabled={busy}>
              🤖 Play with bots
            </button>
          </section>

          <section
            data-tilt="7"
            className={`gate-card ${mode === 'join' ? 'on' : ''} ${mode === 'create' ? 'dim' : ''}`}
            onClick={() => mode !== 'join' && pick('join')}
          >
            <div className="gate-ico">🚪</div>
            <h2>Join a table</h2>
            <p>Got a code from a friend? Enter it to take your seat.</p>
            <form onSubmit={join} className="row" onClick={(e) => e.stopPropagation()}>
              <input ref={codeRef} className="input code" aria-label="Room code" maxLength={4} value={code}
                onFocus={() => setMode('join')}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }} placeholder="CODE" />
              <button className="btn lg" type="submit">Join</button>
            </form>
          </section>
        </div>

        {error && <p className="error center-text" role="alert">{error}</p>}

        {stats && (
          <div className="stat-row">
            <div data-tilt="12"><b>{stats.games}</b><span>games</span></div>
            <div data-tilt="12"><b>{stats.wins}</b><span>wins</span></div>
            <div data-tilt="12"><b>{winRate}%</b><span>win rate</span></div>
          </div>
        )}

        <div className="links">
          <Link href="/stats">📊 My stats</Link>
          <button onClick={() => setHelp(true)}>📖 How to play</button>
        </div>
        <p className="muted small center-text">5–12 players · works on phones and laptops · no download</p>
      </div>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}
