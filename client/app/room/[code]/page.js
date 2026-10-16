'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { emit, setName, socket } from '@/lib/socket';
import { play } from '@/lib/sound';
import { recordGame } from '@/lib/stats';
import Timer from '@/components/Timer';
import Chat from '@/components/Chat';
import VoteList from '@/components/VoteList';
import Scene from '@/components/Scene';
import PhaseSplash from '@/components/PhaseSplash';
import Confetti from '@/components/Confetti';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';
import Avatar from '@/components/Avatar';
import PlayerCard, { ROLE_INFO } from '@/components/PlayerCard';
import VoicePanel, { PushToTalkFab } from '@/components/VoicePanel';
import { useVoice } from '@/lib/useVoice';

const PHASE_TITLE = {
  LOBBY: 'Lobby',
  ROLE_REVEAL: 'Your role',
  NIGHT: 'Night',
  DAY_RESULT: 'Morning',
  DISCUSSION: 'Discussion',
  VOTING: 'Voting',
  VOTE_RESULT: 'Vote result',
  GAME_OVER: 'Game over',
};
const DAYTIME = ['DAY_RESULT', 'DISCUSSION', 'VOTING', 'VOTE_RESULT'];

export default function RoomPage() {
  const { code: raw } = useParams();
  const code = String(raw).toUpperCase();
  const { status, error, state, chat, online, join } = useRoom(code);
  const voice = useVoice(state);
  const [tab, setTab] = useState('game'); // mobile tabs
  const [help, setHelp] = useState(false);
  const [unread, setUnread] = useState(0);
  const seen = useRef(0);

  // Sound cues on phase changes.
  const phase = state?.phase;
  useEffect(() => {
    if (!state) return;
    const r = state.result;
    if (phase === 'ROLE_REVEAL') play('reveal');
    else if (phase === 'NIGHT') play('night');
    else if (phase === 'DAY_RESULT') play(r?.killedId ? 'death' : r?.saved ? 'saved' : 'day');
    else if (phase === 'VOTE_RESULT' && r?.eliminatedId) play('death');
    else if (phase === 'GAME_OVER') {
      play(state.winner === state.you.team ? 'win' : 'lose');
      recordGame(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state?.day]);

  // Chat unread badge (mobile) + message sound.
  useEffect(() => {
    if (chat.length > seen.current) {
      const last = chat[chat.length - 1];
      if (state && last.from !== state.you.id) {
        play(last.channel === 'whisper' ? 'whisper' : last.channel === 'notice' ? 'click' : 'message');
        if (tab !== 'chat') setUnread((u) => u + (chat.length - seen.current));
      }
    }
    seen.current = chat.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.length]);
  useEffect(() => { if (tab === 'chat') setUnread(0); }, [tab]);

  if (status === 'error') {
    return (
      <main className="screen">
        <Scene day={false} />
        <div className="home">
          <div className="card glass center" data-tilt="3">
            <div className="big-emoji">🚪</div>
            <h2>Can’t join {code}</h2>
            <p className="error">{error}</p>
            <Link className="btn primary" href="/play">Back to tables</Link>
          </div>
        </div>
      </main>
    );
  }
  if (status === 'need_name') return <NamePrompt code={code} onSubmit={(n) => { setName(n); join(n); }} />;
  if (!state) {
    return (
      <main className="screen">
        <Scene day={false} />
        <div className="home"><div className="card glass center" data-tilt="3"><div className="spinner" /><p className="muted">Connecting to room {code}…</p></div></div>
      </main>
    );
  }

  const day = DAYTIME.includes(state.phase);
  const aliveCount = state.players.filter((p) => p.alive).length;

  return (
    <main className={`screen ${day ? 'day' : ''}`}>
      <Scene day={day} />
      <PhaseSplash phase={state.phase} day={state.day} />
      {!online && <div className="banner">Connection lost — reconnecting…</div>}

      <header className="topbar">
        <div className="room-code" title="Room code">
          <span className="muted">Room</span> <b>{state.code}</b>
        </div>
        <div className="phase">
          {PHASE_TITLE[state.phase]}
          {state.day > 0 && state.phase !== 'GAME_OVER' && <small> · Day {state.day}</small>}
        </div>
        <div className="topbar-actions">
          <SoundToggle />
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="How to play">❔</button>
        </div>
      </header>
      <Timer endsAt={state.endsAt} serverNow={state.serverNow} phaseMs={state.phaseMs} />

      <nav className="tabs" aria-label="Sections">
        <button className={tab === 'game' ? 'on' : ''} onClick={() => setTab('game')}>🎮 Game</button>
        <button className={tab === 'players' ? 'on' : ''} onClick={() => setTab('players')}>👥 Players ({aliveCount}){voice.active && ' 🎙️'}</button>
        <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>💬 Chat{unread > 0 && <i className="dot">{unread}</i>}</button>
      </nav>

      <div className="layout">
        <div className={`main ${tab !== 'game' ? 'hide-m' : ''}`}>
          <div className="phase-body" key={state.phase}>
            <Phase state={state} />
          </div>
        </div>
        <aside className="side">
          <div className={tab !== 'players' ? 'hide-m' : ''}>
            <VoicePanel voice={voice} state={state} />
          </div>
          <div className={tab !== 'players' ? 'hide-m' : ''}>
            <h3 className="side-title">Players <span>{aliveCount}/{state.players.length} alive</span></h3>
            <div className="list compact">
              {state.players.map((p) => (
                <PlayerCard key={p.id} compact player={p} isYou={p.id === state.you.id} isHost={p.id === state.hostId} speaking={voice.speaking.has(p.id)} />
              ))}
            </div>
          </div>
          <div className={tab !== 'chat' ? 'hide-m' : ''}>
            <Chat messages={chat} channel={state.you.chatChannel} myId={state.you.id} players={state.players} whispersLeft={state.you.whispersLeft} canWhisper={state.you.alive && ['DISCUSSION', 'VOTING'].includes(state.phase)} />
          </div>
        </aside>
      </div>
      <PushToTalkFab voice={voice} state={state} />
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}

function NamePrompt({ code, onSubmit }) {
  const [n, setN] = useState('');
  return (
    <main className="screen">
      <Scene day={false} />
      <div className="home">
        <form className="card glass center" data-tilt="3" onSubmit={(e) => { e.preventDefault(); if (n.trim()) onSubmit(n.trim()); }}>
          <div className="big-emoji">🎭</div>
          <h2>Join room <span className="accent">{code}</span></h2>
          <input className="input" autoFocus maxLength={16} value={n} onChange={(e) => setN(e.target.value)} placeholder="Your name" />
          <button className="btn primary lg">Join the game</button>
        </form>
      </div>
    </main>
  );
}

function Phase({ state }) {
  switch (state.phase) {
    case 'LOBBY': return <Lobby state={state} />;
    case 'ROLE_REVEAL': return <RoleReveal state={state} />;
    case 'NIGHT': return <Night state={state} />;
    case 'DAY_RESULT': return <DayResult state={state} />;
    case 'DISCUSSION': return <Discussion state={state} />;
    case 'VOTING': return <Voting state={state} />;
    case 'VOTE_RESULT': return <VoteResult state={state} />;
    case 'GAME_OVER': return <GameOver state={state} />;
    default: return null;
  }
}

function Lobby({ state }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === state.you.id;
  const n = state.players.length;
  const bots = state.players.filter((p) => p.bot).length;
  const slots = Array.from({ length: 12 }, (_, i) => state.players[i] || null);

  async function start() {
    play('click');
    const res = await emit('start_game');
    if (res.error) setErr(res.error);
  }
  async function leave() {
    await emit('leave_room');
    socket.disconnect();
    router.push('/play');
  }
  async function addBots(count) {
    play('click');
    const res = await emit('add_bots', { count });
    setErr(res.error || '');
  }
  async function copy() {
    play('click');
    try {
      await navigator.clipboard.writeText(`${location.origin}/room/${state.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="card glass center" data-tilt="3">
      <p className="muted">Share this code with your friends</p>
      <div className="big-code" aria-label={`Room code ${state.code}`}>{state.code}</div>
      <button className="btn small" onClick={copy}>{copied ? '✅ Link copied!' : '🔗 Copy invite link'}</button>

      <div className="slots" aria-label="Players">
        {slots.map((p, i) => (
          <div key={i} data-tilt="14" className={`slot ${p ? 'filled' : ''} ${i < 5 && !p ? 'required' : ''}`} title={p ? p.name : i < 5 ? 'Needed to start' : 'Open seat'}>
            {p ? <Avatar name={p.name} size={44} ring={p.id === state.hostId} /> : <span>{i + 1}</span>}
            {p?.bot && <i className="slot-bot" title="Bot">🤖</i>}
            {p && <small>{p.name}{p.id === state.you.id ? ' (you)' : ''}</small>}
          </div>
        ))}
      </div>

      <div className="meter"><span style={{ width: `${Math.min(100, (n / 5) * 100)}%` }} /></div>
      <p className="muted small">{n >= 5 ? `${n} players ready` : `${5 - n} more player${5 - n === 1 ? '' : 's'} needed to start`} · max 12</p>

      {isHost ? (
        <>
          <button className="btn primary lg" onClick={start} disabled={n < 5}>▶ Start game</button>
          <div className="bot-bar">
            {n < 5 && <button className="btn small" onClick={() => addBots(5 - n)}>🤖 Fill with bots</button>}
            <button className="btn small" onClick={() => addBots(1)} disabled={n >= 12}>＋ Add bot</button>
            {bots > 0 && <button className="btn small ghost" onClick={() => { play('click'); emit('remove_bots'); }}>Remove bots</button>}
          </div>
          <p className="muted small">Short on players? Bots take empty seats, vote, scheme and talk.</p>
        </>
      ) : (
        <p className="muted pulse">⏳ Waiting for the host to start…</p>
      )}
      <button className="btn small ghost" onClick={leave}>Leave room</button>
      {err && <p className="error">{err}</p>}
    </div>
  );
}

function RoleReveal({ state }) {
  const { role } = state.you;
  const info = ROLE_INFO[role];
  const [flipped, setFlipped] = useState(false);
  const mates = state.players.filter((p) => p.role === 'MAFIA' && p.id !== state.you.id);
  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flip-wrap">
      <div className={`flip ${flipped ? 'flipped' : ''}`}>
        <div className="flip-face back"><span>?</span><small>Your secret role</small></div>
        <div className={`flip-face front ${role}`}>
          <div className="role-icon">{info.icon}</div>
          <h1>{info.label}</h1>
          <p>{info.blurb}</p>
          {role === 'MAFIA' && mates.length > 0 && <p className="info">Your team: <b>{mates.map((m) => m.name).join(', ')}</b></p>}
          <p className="muted small">Keep it secret. Night begins soon…</p>
        </div>
      </div>
    </div>
  );
}

const NIGHT_PROMPT = {
  MAFIA: 'Choose who to eliminate',
  DOCTOR: 'Choose who to protect',
  DETECTIVE: 'Choose who to investigate',
};

function Night({ state }) {
  const { you, players } = state;
  const [err, setErr] = useState('');
  const acts = ['MAFIA', 'DOCTOR', 'DETECTIVE'].includes(you.role);

  async function pick(targetId) {
    const res = await emit('night_action', { targetId });
    setErr(res.error || '');
  }

  if (!you.alive) return <div className="card glass center" data-tilt="3"><div className="big-emoji float">👻</div><h2>You are dead</h2><p className="muted">Watch quietly. Talk with other ghosts in the chat.</p></div>;
  if (!acts) return <div className="card glass center" data-tilt="3"><div className="big-emoji float">🌙</div><h2>The town sleeps…</h2><p className="muted">Close your eyes. Morning will come.</p><p className="zzz">z z z</p></div>;

  const exclude = you.role === 'MAFIA' ? players.filter((p) => p.role === 'MAFIA').map((p) => p.id) : you.role === 'DETECTIVE' ? [you.id] : [];
  const lastCheck = you.checks[you.checks.length - 1];
  return (
    <div className="card glass">
      <h2>{ROLE_INFO[you.role].icon} {NIGHT_PROMPT[you.role]}</h2>
      {you.role === 'DETECTIVE' && lastCheck && (
        <p className="info">Last result: <b>{players.find((p) => p.id === lastCheck.targetId)?.name}</b> is {lastCheck.isMafia ? 'MAFIA 🔪' : 'not Mafia ✅'}</p>
      )}
      <VoteList players={players} youId={you.id} hostId={state.hostId} exclude={exclude} selectedId={you.nightTarget} onPick={pick} />
      <p className="muted small">{you.nightTarget ? '✅ Choice locked in — you can change it until the timer ends.' : 'Tap a player to choose.'}</p>
      {err && <p className="error">{err}</p>}
    </div>
  );
}

function DayResult({ state }) {
  const r = state.result;
  const detCheck = state.you.role === 'DETECTIVE' ? state.you.checks[state.you.checks.length - 1] : null;
  const dead = !!r?.killedName;
  return (
    <div className={`card glass center ${dead ? 'shake' : ''}`}>
      <div className="big-emoji">{dead ? '💀' : r?.saved ? '🩺' : '🌤️'}</div>
      {dead ? (
        <>
          <h2><span className="accent">{r.killedName}</span> was killed in the night</h2>
          <p className="muted">They were a {ROLE_INFO[r.killedRole].label} {ROLE_INFO[r.killedRole].icon}</p>
        </>
      ) : r?.saved ? (
        <>
          <h2>Someone was attacked…</h2>
          <p className="muted">…but the Doctor saved them! Nobody died.</p>
        </>
      ) : (
        <>
          <h2>A quiet night</h2>
          <p className="muted">Nobody died.</p>
        </>
      )}
      {detCheck && (
        <p className="info">🕵️ {state.players.find((p) => p.id === detCheck.targetId)?.name} is {detCheck.isMafia ? 'MAFIA' : 'not Mafia'}.</p>
      )}
    </div>
  );
}

function Discussion({ state }) {
  return (
    <div className="card glass center" data-tilt="3">
      <div className="big-emoji">🗣️</div>
      <h2>Who is the Mafia?</h2>
      <p className="muted">Talk it out in the chat. Voting starts when the timer ends.</p>
      {!state.you.alive && <p className="info">You are dead — only ghosts can see your messages.</p>}
      {state.you.role === 'DETECTIVE' && state.you.checks.length > 0 && (
        <div className="info">
          <b>Your investigations</b>
          {state.you.checks.map((c, i) => (
            <div key={i}>{state.players.find((p) => p.id === c.targetId)?.name}: {c.isMafia ? 'MAFIA 🔪' : 'not Mafia'}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Voting({ state }) {
  const { you, players } = state;
  const [err, setErr] = useState('');
  const aliveN = players.filter((p) => p.alive).length;
  async function vote(targetId) {
    const res = await emit('cast_vote', { targetId });
    setErr(res.error || '');
  }
  const progress = (
    <p className="muted small">{state.votedIds.length}/{aliveN} votes cast</p>
  );
  if (!you.alive) return <div className="card glass center" data-tilt="3"><div className="big-emoji float">👻</div><h2>You are dead</h2><p className="muted">The living are voting.</p>{progress}</div>;
  return (
    <div className="card glass">
      <h2>🗳️ Vote someone out</h2>
      <VoteList players={players} youId={you.id} hostId={state.hostId} exclude={[you.id]} selectedId={you.vote} onPick={vote} allowSkip skipSelected={you.vote === 'SKIP'} votedIds={state.votedIds} />
      <div className="meter"><span style={{ width: `${(state.votedIds.length / aliveN) * 100}%` }} /></div>
      {progress}
      {err && <p className="error">{err}</p>}
    </div>
  );
}

function VoteResult({ state }) {
  const r = state.result;
  const name = (id) => (id === 'SKIP' ? 'Skip' : state.players.find((p) => p.id === id)?.name || '?');
  return (
    <div className="card glass center" data-tilt="3">
      <div className="big-emoji">{r?.eliminatedName ? '⚖️' : '🤝'}</div>
      {r?.eliminatedName ? (
        <>
          <h2><span className="accent">{r.eliminatedName}</span> was voted out</h2>
          <p className="muted">They were a {ROLE_INFO[r.eliminatedRole].label} {ROLE_INFO[r.eliminatedRole].icon}</p>
        </>
      ) : (
        <h2>{r?.tie ? 'It’s a tie — nobody is eliminated' : 'Nobody was eliminated'}</h2>
      )}
      {r?.votes?.length > 0 && (
        <ul className="votelog">
          {r.votes.map((v, i) => (
            <li key={i}><b>{name(v.voterId)}</b> <span>→</span> {name(v.targetId)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GameOver({ state }) {
  const isHost = state.hostId === state.you.id;
  const won = state.winner === state.you.team;
  return (
    <div className="card glass center" data-tilt="3">
      {won && <Confetti />}
      <div className="big-emoji">{state.winner === 'MAFIA' ? '🔪' : '🏘️'}</div>
      <h1 className={`headline ${state.winner}`}>{state.winner === 'MAFIA' ? 'The Mafia win!' : 'The Villagers win!'}</h1>
      <p className={`result-chip ${won ? 'won' : 'lost'}`}>{won ? '🎉 You won' : 'You lost'}</p>
      <div className="list compact left">
        {state.players.map((p) => (
          <PlayerCard key={p.id} compact player={{ ...p, alive: true }} isYou={p.id === state.you.id} isHost={p.id === state.hostId} />
        ))}
      </div>
      {isHost ? <button className="btn primary lg" onClick={() => emit('play_again')}>🔁 Play again</button> : <p className="muted pulse">Waiting for the host to start a new game…</p>}
    </div>
  );
}
