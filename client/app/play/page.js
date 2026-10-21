'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { socket, emit, getPlayerId, getName, setName } from '@/lib/socket';
import { getStats } from '@/lib/stats';
import { rankOf, EXTRA_ROLES } from '@/lib/roles';
import { play } from '@/lib/sound';
import Backdrop from '@/components/Backdrop';
import MenuBar from '@/components/MenuBar';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import PoweredBy from '@/components/PoweredBy';

const MODES = [
  { id: 'host', icon: 'users', title: 'Host a table', tag: 'Private', text: 'Open a new table and share its code with friends.', facts: ['5–12 players', 'You decide when the game starts', 'Fill empty seats with bots'], launch: 'Create table' },
  { id: 'bots', icon: 'bot', title: 'Practice vs bots', tag: 'Instant', text: 'Start right away against 5 bots that vote, scheme and talk.', facts: ['6 players, no waiting', 'Bots play every role', 'The best way to learn'], launch: 'Start practice' },
  { id: 'join', icon: 'door', title: 'Join with code', tag: 'Friends', text: 'Got a code from a friend? Take your seat at their table.', facts: [], launch: 'Join table' },
];

export default function Play() {
  const router = useRouter();
  const [name, setNameState] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('host');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ games: 0, wins: 0 });
  const nameRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    setNameState(getName());
    setStats(getStats());
  }, []);

  useEffect(() => {
    if (mode === 'join') codeRef.current?.focus();
  }, [mode]);

  function needName() {
    if (name.trim()) return false;
    setError('Enter your callsign first');
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
      const res = await emit('create_room', { playerId: getPlayerId(), name: name.trim(), bots, roles: EXTRA_ROLES });
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
    if (code.length < 4) {
      codeRef.current?.focus();
      return setError('Enter the 4-character table code');
    }
    setName(name.trim());
    router.push(`/room/${code}`);
  }

  const current = MODES.find((m) => m.id === mode);
  const rank = rankOf(stats.wins);
  const winRate = stats.games ? Math.round((stats.wins / stats.games) * 100) : 0;

  return (
    <main className="g">
      <Backdrop />
      <div className="veil-in" aria-hidden="true" />
      <MenuBar active="play" />

      <div className="menu">
        <aside className="op cut" aria-label="Your profile">
          <span className="label">Operative</span>
          <div className="op-id">
            <Avatar name={name.trim() || '?'} size={60} />
            <div>
              <span className="op-rank">{rank.name}</span>
              <b className="op-name">{name.trim() || 'Unnamed'}</b>
            </div>
          </div>

          <label className="label" htmlFor="name">Callsign</label>
          <input id="name" ref={nameRef} className="field" maxLength={16} value={name} autoComplete="nickname"
            onChange={(e) => { setNameState(e.target.value); setError(''); }} placeholder="Your name at the table" />

          <div className="xp">
            <div className="xp-row">
              <span>Rank {rank.level}</span>
              <span>{rank.next ? `${stats.wins} / ${rank.next.wins} wins to ${rank.next.name}` : 'Highest rank'}</span>
            </div>
            <div className="bar"><span style={{ transform: `scaleX(${rank.progress})` }} /></div>
          </div>

          <dl className="kpis">
            <div><dt>Games</dt><dd>{stats.games}</dd></div>
            <div><dt>Wins</dt><dd>{stats.wins}</dd></div>
            <div><dt>Win rate</dt><dd>{winRate}%</dd></div>
          </dl>
          <Link href="/stats" className="b b-ghost b-block"><Icon name="chart" /> View career</Link>
        </aside>

        <section className="modes" aria-label="Game mode">
          <span className="label">Select mode</span>
          <div className="mode-list" role="radiogroup" aria-label="Game mode">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className={`mode cut ${mode === m.id ? 'on' : ''}`} onClick={() => pick(m.id)}>
                <span className="mode-ic"><Icon name={m.icon} /></span>
                <span className="mode-body">
                  <b>{m.title}</b>
                  <small>{m.text}</small>
                </span>
                <span className="mode-tag">{m.tag}</span>
              </button>
            ))}
          </div>

          <div className="mode-detail cut">
            {mode === 'join' ? (
              <form id="join-form" onSubmit={join}>
                <label className="label" htmlFor="code">Table code</label>
                <input id="code" ref={codeRef} className="field code-field" maxLength={4} value={code} autoComplete="off" spellCheck={false}
                  onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError(''); }} placeholder="····" />
                <p className="dim small">4 characters, letters and numbers — ask the host for it.</p>
              </form>
            ) : (
              <>
                <span className="label">{current.title}</span>
                <ul className="facts">
                  {current.facts.map((f) => <li key={f}><Icon name="check" /> {f}</li>)}
                </ul>
              </>
            )}
          </div>

          <div className="launch">
            {error && <p className="err" role="alert">{error}</p>}
            <button
              className="b b-primary b-xl"
              type={mode === 'join' ? 'submit' : 'button'}
              form={mode === 'join' ? 'join-form' : undefined}
              onClick={mode === 'join' ? undefined : () => create(mode === 'bots' ? 5 : 0)}
              disabled={busy}
            >
              {busy ? 'Setting the table…' : current.launch} <Icon name="play" />
            </button>
          </div>
        </section>
      </div>
      <PoweredBy className="foot" />
    </main>
  );
}
