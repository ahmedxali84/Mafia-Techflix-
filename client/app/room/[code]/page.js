'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRoom } from '@/lib/useRoom';
import { useVoice } from '@/lib/useVoice';
import { emit, setName, socket } from '@/lib/socket';
import { play } from '@/lib/sound';
import { recordGame } from '@/lib/stats';
import { ROLES, CARDS, roleInfo, mafiaCount, roleMix, preloadCards } from '@/lib/roles';
import Backdrop from '@/components/Backdrop';
import Timer from '@/components/Timer';
import Chat from '@/components/Chat';
import TargetGrid from '@/components/TargetGrid';
import PhaseSplash from '@/components/PhaseSplash';
import HowToPlay from '@/components/HowToPlay';
import SoundToggle from '@/components/SoundToggle';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
import DiscordButton from '@/components/DiscordButton';
import Feedback from '@/components/Feedback';
import RoleIcon from '@/components/RoleIcon';
import RoleTag from '@/components/RoleTag';
import PlayerRow from '@/components/PlayerRow';
import VoicePanel, { PushToTalkFab } from '@/components/VoicePanel';
import MafiaChat from '@/components/MafiaChat';
import PoweredBy from '@/components/PoweredBy';
import RoleCard, { CardBack } from '@/components/RoleCard';
import KillCinematic from '@/components/KillCinematic';

const PHASE = {
  LOBBY: ['Lobby', 'users'],
  ROLE_REVEAL: ['Your role', 'lock'],
  NIGHT: ['Night', 'moon'],
  DAY_RESULT: ['Morning', 'sun'],
  DISCUSSION: ['Discussion', 'chat'],
  VOTING: ['Voting', 'ballot'],
  VOTE_RESULT: ['Verdict', 'scales'],
  GAME_OVER: ['Game over', 'trophy'],
};
const DAYTIME = ['DAY_RESULT', 'DISCUSSION', 'VOTING', 'VOTE_RESULT'];
const ROUND = ['NIGHT', 'DAY_RESULT', 'DISCUSSION', 'VOTING', 'VOTE_RESULT'];

// True on layouts wide enough to show the game and the side rail together (matches game.css).
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(min-width: 961px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

export default function RoomPage() {
  const { code: raw } = useParams();
  const code = String(raw).toUpperCase();
  const { status, error, state, chat, online, join } = useRoom(code);
  const voice = useVoice(state);
  const wide = useWide();
  const [tab, setTab] = useState('game'); // 'game' (phones only) | 'chat' | 'mafia' | 'players' | 'voice'
  const [help, setHelp] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mafiaUnread, setMafiaUnread] = useState(0);
  const seen = useRef(0);

  // With two or more Mafia, their messages move out of the main chat into their own panel.
  const mafiaOn = !!state?.you.mafiaChat;
  const railTab = tab === 'game' || (tab === 'mafia' && !mafiaOn) ? 'chat' : tab; // the rail never shows "game"
  const shown = (id) => (wide ? railTab === id : tab === id);
  const chatVisible = shown('chat');
  const mafiaVisible = shown('mafia');

  useEffect(() => { preloadCards(); }, []);

  // Sound cues on phase changes. Deaths get their sound from the kill cinematic.
  const phase = state?.phase;
  useEffect(() => {
    if (!state) return;
    const r = state.result;
    if (phase === 'ROLE_REVEAL') {
      play('reveal');
      window.scrollTo({ top: 0 }); // the lobby may have been scrolled; start the reveal with the card in view
    }
    else if (phase === 'NIGHT') play('night');
    else if (phase === 'DAY_RESULT' && !r?.killedId) play(r?.saved ? 'saved' : 'day');
    else if (phase === 'GAME_OVER') {
      play(state.winner === state.you.team ? 'win' : 'lose');
      recordGame(state);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, state?.day]);

  // Unread badges on the chat / Mafia tabs + message sound.
  useEffect(() => {
    const fresh = state ? chat.slice(seen.current).filter((m) => m.from !== state.you.id) : [];
    seen.current = chat.length;
    if (!fresh.length) return;
    play(fresh[fresh.length - 1].channel === 'whisper' ? 'whisper' : 'message');
    const family = fresh.filter((m) => mafiaOn && m.channel === 'mafia').length;
    if (family && !mafiaVisible) setMafiaUnread((u) => u + family);
    if (fresh.length > family && !chatVisible) setUnread((u) => u + fresh.length - family);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.length]);
  useEffect(() => { if (chatVisible) setUnread(0); }, [chatVisible]);
  useEffect(() => { if (mafiaVisible) setMafiaUnread(0); }, [mafiaVisible]);

  if (status === 'error') {
    return (
      <Gate>
        <span className="notice-ic"><Icon name="door" /></span>
        <span className="label">Table {code}</span>
        <h1 className="h-lg">Can’t join this table</h1>
        <p className="err">{error}</p>
        <Link className="b b-primary" href="/play"><Icon name="back" /> Back to menu</Link>
      </Gate>
    );
  }
  if (status === 'need_name') return <NamePrompt code={code} onSubmit={(n) => { setName(n); join(n); }} />;
  if (!state) {
    return (
      <Gate>
        <span className="spinner" aria-hidden="true" />
        <span className="label">Table {code}</span>
        <p className="dim">Connecting…</p>
      </Gate>
    );
  }

  const day = DAYTIME.includes(state.phase);
  const aliveCount = state.players.filter((p) => p.alive).length;
  const [phaseTitle, phaseIcon] = PHASE[state.phase];
  const spectating = !state.you.alive && !['LOBBY', 'GAME_OVER'].includes(state.phase);
  const tabs = [
    ['game', 'target', 'Game', null],
    ['chat', 'chat', 'Chat', unread > 0 ? <b className="badge">{unread}</b> : null],
    mafiaOn && ['mafia', 'hat', 'Mafia', mafiaUnread > 0 ? <b className="badge">{mafiaUnread}</b> : null],
    ['players', 'users', mafiaOn ? `${aliveCount}` : `Players ${aliveCount}`, null],
    ['voice', 'headphones', 'Voice', voice.active ? <i className={`live-dot ${voice.talking ? 'on' : ''}`} /> : null],
  ].filter(Boolean);
  const mainChat = mafiaOn ? chat.filter((m) => m.channel !== 'mafia') : chat;
  const mainChannel = mafiaOn && state.you.chatChannel === 'mafia' ? null : state.you.chatChannel;
  const team = state.players.filter((p) => p.role === 'MAFIA').map((p) => (p.id === state.you.id ? 'you' : p.name));

  return (
    <main className={`g room ${day ? 'day' : ''}`}>
      <Backdrop day={day} />
      <PhaseSplash phase={state.phase} day={state.day} />
      <KillCinematic state={state} />
      {!online && <div className="conn" role="alert"><Icon name="offline" /> Connection lost — reconnecting…</div>}

      <header className="hud">
        <div className="hud-left">
          <span className="brand brand-sm">MAFIA</span>
          <CodeChip code={state.code} />
        </div>
        <div className="hud-center">
          <span className="label">{state.phase === 'LOBBY' ? 'Pre-game' : state.phase === 'GAME_OVER' ? 'Final' : `Day ${Math.max(1, state.day)}`}</span>
          <b className="hud-phase"><Icon name={phaseIcon} /> {phaseTitle}</b>
          <Timer endsAt={state.endsAt} serverNow={state.serverNow} phaseMs={state.phaseMs} />
        </div>
        <div className="hud-right">
          {state.phase !== 'LOBBY' && <span className="hud-alive"><Icon name="users" /> <b>{aliveCount}</b>/{state.players.length}</span>}
          {state.you.role && <RoleTag role={state.you.role} className="hud-role" />}
          <SoundToggle className="hud-btn" />
          <button className="hud-btn" onClick={() => setHelp(true)} aria-label="How to play" title="How to play"><Icon name="help" /></button>
        </div>
      </header>

      <div className="room-grid">
        <nav className="tabs" aria-label="Sections">
          {tabs.map(([id, icon, label, extra]) => (
            <button key={id} className={`tab-${id} ${tab === id ? 'on' : ''} ${railTab === id ? 'rail-on' : ''}`} onClick={() => setTab(id)} aria-label={id === 'players' ? `Players, ${aliveCount} alive` : undefined}>
              <Icon name={icon} /> {label} {extra}
            </button>
          ))}
        </nav>

        <section className={`stage ${tab !== 'game' ? 'm-hide' : ''}`} aria-label="Game">
          {spectating && <div className="dead-strip"><Icon name="skull" /> You were eliminated — spectating. Ghost chat is open.</div>}
          {ROUND.includes(state.phase) && <RoundTrack phase={state.phase} day={state.day} />}
          <div className="phase-body" key={state.phase}>
            <Phase state={state} />
          </div>
        </section>

        <aside className={`rail cut ${tab === 'game' ? 'm-hide' : ''}`}>
          <div className={railTab === 'chat' ? 'rail-pane' : 'hide'}>
            <Chat messages={mainChat} channel={mainChannel} myId={state.you.id} players={state.players} whispersLeft={state.you.whispersLeft} canWhisper={state.you.alive && ['DISCUSSION', 'VOTING'].includes(state.phase)} />
          </div>
          {mafiaOn && (
            <div className={railTab === 'mafia' ? 'rail-pane' : 'hide'}>
              <MafiaChat messages={chat.filter((m) => m.channel === 'mafia')} myId={state.you.id} team={team} canWrite={state.you.mafiaChat.canWrite} />
            </div>
          )}
          <div className={railTab === 'players' ? 'rail-pane' : 'hide'}>
            <div className="panel-head"><h2 className="panel-title">Players</h2><span className="dim small">{aliveCount}/{state.players.length} alive</span></div>
            <ul className="roster">
              {state.players.map((p) => (
                <PlayerRow key={p.id} player={p} isYou={p.id === state.you.id} isHost={p.id === state.hostId} speaking={voice.speaking.has(p.id)} />
              ))}
            </ul>
          </div>
          <div className={railTab === 'voice' ? 'rail-pane' : 'hide'}>
            <VoicePanel voice={voice} state={state} />
          </div>
        </aside>
      </div>

      <PushToTalkFab voice={voice} state={state} />
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}

function Gate({ children }) {
  return (
    <main className="g g-center">
      <Backdrop />
      <div className="panel cut gate">{children}</div>
    </main>
  );
}

function NamePrompt({ code, onSubmit }) {
  const [n, setN] = useState('');
  return (
    <main className="g g-center">
      <Backdrop />
      <form className="panel cut gate" onSubmit={(e) => { e.preventDefault(); if (n.trim()) onSubmit(n.trim()); }}>
        <span className="label">Invitation</span>
        <h1 className="h-lg">Join table <span className="t-red">{code}</span></h1>
        <label className="label" htmlFor="callsign">Callsign</label>
        <input id="callsign" className="field" autoFocus maxLength={16} value={n} onChange={(e) => setN(e.target.value)} placeholder="Your name at the table" />
        <button className="b b-primary b-lg b-block" disabled={!n.trim()}>Take your seat <Icon name="play" /></button>
      </form>
    </main>
  );
}

function CodeChip({ code }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    play('click');
    try {
      await navigator.clipboard.writeText(`${location.origin}/room/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }
  return (
    <button className="code-chip" onClick={copy} title="Copy invite link">
      <span className="label">Table</span>
      <b>{code}</b>
      <Icon name={copied ? 'check' : 'copy'} />
    </button>
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

// A centred status panel: icon, small label, headline, text.
function Notice({ icon, label, title, text, tone, children }) {
  return (
    <section className={`panel cut notice ${tone ? `tone-${tone}` : ''}`}>
      <span className="notice-ic"><Icon name={icon} /></span>
      <span className="label">{label}</span>
      <h2 className="h-lg">{title}</h2>
      {text && <p className="dim">{text}</p>}
      {children}
    </section>
  );
}

function Intel({ check, players }) {
  const name = players.find((p) => p.id === check.targetId)?.name;
  return (
    <p className={`intel ${check.isMafia ? 'bad' : 'good'}`}>
      <Icon name="eye" /> <span><b>{name}</b> is {check.isMafia ? 'Mafia' : 'not Mafia'}</span>
    </p>
  );
}

function Board({ players, youId, final }) {
  return (
    <ul className="board">
      {players.map((p) => (
        <li key={p.id} className={`board-p cut ${p.alive ? '' : 'dead'} ${p.id === youId ? 'you' : ''}`}>
          <Avatar name={p.name} size={40} dead={!p.alive} />
          <span className="board-name">{p.name}{p.id === youId && <small className="chip-you">You</small>}</span>
          {p.role ? <RoleTag role={p.role} /> : <small className="dim">{p.alive ? 'Unknown' : ''}</small>}
          {final && !p.alive && <small className="dim">Eliminated</small>}
        </li>
      ))}
    </ul>
  );
}

// Where the table is in the current round: Night → Morning → Discussion → Vote → Verdict.
function RoundTrack({ phase, day }) {
  const at = ROUND.indexOf(phase);
  return (
    <ol className="track" aria-label={`Day ${day}: ${PHASE[phase][0]}`}>
      {ROUND.map((id, i) => (
        <li key={id} className={i < at ? 'done' : i === at ? 'now' : ''} aria-current={i === at ? 'step' : undefined}>
          <Icon name={PHASE[id][1]} /> <span>{PHASE[id][0]}</span>
        </li>
      ))}
    </ol>
  );
}

// What happened each day — deaths, saves and votes. Everything here is public information.
function Timeline({ history }) {
  return (
    <ol className="timeline">
      {history.map((e, i) => {
        const night = e.type === 'NIGHT';
        const out = !!e.name;
        return (
          <li key={i} className={out ? 'out' : ''}>
            <span className="tl-when"><Icon name={night ? 'moon' : 'ballot'} /> Day {e.day} · {night ? 'Night' : 'Vote'}</span>
            <span className="tl-what">
              {out
                ? <><b>{e.name}</b> {night ? 'was killed' : 'was voted out'} <RoleTag role={e.role} /></>
                : night ? (e.saved ? <><Icon name="shield" /> The Doctor saved the target</> : 'A quiet night')
                : e.tie ? 'A tie — nobody went' : 'Nobody was voted out'}
              {e.theft && <span className="tl-theft"><RoleIcon role="THIEF" /> A role was stolen</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Lobby({ state }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const isHost = state.hostId === state.you.id;
  const n = state.players.length;
  const bots = state.players.filter((p) => p.bot).length;
  const host = state.players.find((p) => p.id === state.hostId);
  // Seats so far plus one open chair (at least the 5 needed to start), so the lobby stays one screen tall.
  const slots = Array.from({ length: Math.min(12, Math.max(5, n + 1)) }, (_, i) => state.players[i] || null);

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

  return (
    <div className="stack lobby">
      <section className="panel cut lobby-head">
        <div className="lobby-code">
          <span className="label">Table code</span>
          <div className="big-code" aria-label={`Table code ${state.code}`}>{state.code}</div>
        </div>
        <p className="dim small lobby-tip">Share the code with your friends, or copy the invite link from the top bar.</p>
        <button className="b b-ghost b-sm" onClick={leave}><Icon name="exit" /> Leave</button>
      </section>

      <section className="panel cut">
        <div className="panel-head">
          <h2 className="panel-title">Players <span className="dim">{n}/12</span></h2>
          <div className="ready">
            <div className="segments" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}
            </div>
            <span className={n >= 5 ? 't-ok' : 'dim'}>{n >= 5 ? 'Ready to start' : `${5 - n} more needed`}</span>
          </div>
        </div>
        <ul className="seats">
          {slots.map((p, i) => (p ? (
            <li key={p.id} className={`seat cut filled ${p.id === state.you.id ? 'you' : ''}`}>
              <Avatar name={p.name} size={34} />
              <span className="seat-name">{p.name}</span>
              <span className="seat-tags">
                {p.id === state.hostId && <span className="mini-tag gold"><Icon name="crown" /> Host</span>}
                {p.bot && <span className="mini-tag">Bot</span>}
                {p.id === state.you.id && <span className="chip-you">You</span>}
                {!p.connected && <Icon name="offline" className="t-warn" title="Offline" />}
              </span>
            </li>
          ) : (
            <li key={`open-${i}`} className={`seat cut open ${i < 5 ? 'req' : ''}`}>
              <span className="seat-n">{String(i + 1).padStart(2, '0')}</span>
              <span>{i < 5 ? 'Required' : 'Open seat'}</span>
            </li>
          )))}
        </ul>
        <RoleMix n={n} extras={state.extraRoles || []} />
      </section>

      {isHost ? (
        <section className="actionbar cut">
          <div className="actionbar-side">
            <span className="label">Bots</span>
            <div className="row">
              {n < 5 && <button className="b b-sm" onClick={() => addBots(5 - n)}><Icon name="bot" /> Fill to 5</button>}
              <button className="b b-sm" onClick={() => addBots(1)} disabled={n >= 12}><Icon name="plus" /> Add bot</button>
              {bots > 0 && <button className="b b-sm b-ghost" onClick={() => { play('click'); emit('remove_bots'); }}><Icon name="minus" /> Remove bots</button>}
            </div>
          </div>
          <button className="b b-primary b-xl" onClick={start} disabled={n < 5}>Start game <Icon name="play" /></button>
        </section>
      ) : (
        <section className="actionbar cut waiting"><span className="pulse-dot" /> Waiting for {host?.name || 'the host'} to start the game</section>
      )}
      {err && <p className="err">{err}</p>}
      <PoweredBy />
    </div>
  );
}

// The roles that will be dealt for the current head count.
function RoleMix({ n, extras }) {
  const mix = roleMix(Math.max(n, 5), extras);
  return (
    <div className="mix">
      <span className="label">Roles this game{n < 5 ? ' (at 5 players)' : ''}</span>
      <ul>
        {mix.map(([role, c]) => (
          <li key={role} className={`tone-${ROLES[role].tone}`}><RoleIcon role={role} /> <b>{c}×</b> {ROLES[role].label}</li>
        ))}
      </ul>
    </div>
  );
}

function RoleReveal({ state }) {
  const { role } = state.you;
  const info = roleInfo(role);
  const [flipped, setFlipped] = useState(false);
  const [settled, setSettled] = useState(false);
  const tilt = useRef(null);
  const mates = state.players.filter((p) => p.role === 'MAFIA' && p.id !== state.you.id);
  const m = mafiaCount(state.players.length);
  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 900);
    const t2 = setTimeout(() => setSettled(true), 1950); // after the flip, pointer tilt follows quickly
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // The card leans toward the pointer (desktop only), like holding it in your hand.
  function lean(e) {
    if (!settled || !matchMedia('(hover: hover)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    tilt.current?.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -12}deg`);
    tilt.current?.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 14}deg`);
  }
  function rest() {
    tilt.current?.style.setProperty('--rx', '0deg');
    tilt.current?.style.setProperty('--ry', '0deg');
  }

  return (
    <div className={`deal-stage tone-${info.tone}`}>
      <div className="deal-tilt" style={{ '--ar': CARDS[role]?.ar || 0.64 }} onPointerMove={lean} onPointerLeave={rest}>
        <div ref={tilt} className={`deal ${flipped ? 'flipped' : ''} ${settled ? 'settled' : ''}`}>
          <CardBack size="fill" className="deal-face deal-back" />
          <div className="deal-face deal-front">
            <RoleCard role={role} size="fill" className={flipped ? 'shine' : ''} />
          </div>
        </div>
      </div>
      <section className={`reveal-info ${flipped ? 'on' : ''}`} aria-live="polite">
        <span className="label">Your secret role</span>
        <h1 className="h-xl">{info.label}</h1>
        <span className="team-tag">Team {info.team}</span>
        <p>{info.blurb}</p>
        <p className="goal"><b>Goal</b> {info.goal}</p>
        {role === 'MAFIA' && mates.length > 0 && <p className="intel bad"><Icon name="users" /> <span>Your team: <b>{mates.map((x) => x.name).join(', ')}</b></span></p>}
        <small className="dim">{m} Mafia {m === 1 ? 'is' : 'are'} hiding among {state.players.length} players. Keep it secret — night begins soon.</small>
      </section>
    </div>
  );
}

function Night({ state }) {
  const { you, players } = state;
  const [err, setErr] = useState('');
  const info = roleInfo(you.role);

  async function pick(targetId) {
    const res = await emit('night_action', { targetId });
    setErr(res.error || '');
  }

  if (!you.alive) return <Notice icon="skull" label="Night" title="You are dead" text="Watch quietly. You can talk with the other ghosts in the chat." />;
  if (!info.night) return <Notice icon="moon" label="Night" title="The town sleeps" text={you.role === 'JESTER' ? 'Rest up. Tomorrow you need the town to think you are the Mafia.' : 'Close your eyes. The Mafia, the Doctor and the Detective are making their moves.'} />;

  const exclude = you.role === 'MAFIA' ? players.filter((p) => p.role === 'MAFIA').map((p) => p.id) : ['DETECTIVE', 'THIEF'].includes(you.role) ? [you.id] : [];
  const lastCheck = you.checks[you.checks.length - 1];
  const marks = {};
  for (const [mateId, targetId] of Object.entries(you.mafiaPicks || {})) {
    (marks[targetId] ||= []).push(players.find((p) => p.id === mateId)?.name || '?');
  }
  const picks = Object.values(you.mafiaPicks || {});
  const agreed = you.nightTarget && picks.length > 0 && picks.every((t) => t === you.nightTarget);
  return (
    <section className={`panel cut action tone-${info.tone}`}>
      <div className="action-head">
        <span className="label"><RoleIcon role={you.role} /> {info.label} · Night action</span>
        <h2 className="h-lg">{info.night.prompt}</h2>
      </div>
      {you.role === 'DETECTIVE' && lastCheck && <Intel check={lastCheck} players={players} />}
      {you.role === 'THIEF' && <p className="intel"><RoleIcon role="THIEF" /> <span>You take their role at dawn and they become a Villager. Rob tonight’s victim and you get nothing.</span></p>}
      <TargetGrid players={players} youId={you.id} hostId={state.hostId} exclude={exclude} selectedId={you.nightTarget} onPick={pick} verb={info.night.verb} tone={info.tone} marks={marks} />
      <p className="status-line">
        {you.nightTarget ? <><Icon name="check" /> Locked in — you can change it until the timer ends.</> : 'Select a player.'}
      </p>
      {you.role === 'MAFIA' && picks.length > 0 && (
        <p className={`status-line ${agreed ? '' : 't-warn'}`}>
          <Icon name={agreed ? 'check' : 'target'} /> {agreed ? 'The family agrees on the target.' : 'Teammates’ picks are marked. Agree in the Mafia chat — a split is settled at random.'}
        </p>
      )}
      {err && <p className="err">{err}</p>}
    </section>
  );
}

function DayResult({ state }) {
  const r = state.result;
  const detCheck = state.you.role === 'DETECTIVE' ? state.you.checks[state.you.checks.length - 1] : null;
  const dead = !!r?.killedName;
  return (
    <Notice
      icon={dead ? 'skull' : r?.saved ? 'shield' : 'sun'}
      label="Morning report"
      tone={dead ? 'mafia' : r?.saved ? 'doctor' : undefined}
      title={dead ? <><span className="t-red">{r.killedName}</span> was killed in the night</> : r?.saved ? 'An attack was stopped' : 'A quiet night'}
      text={dead ? null : r?.saved ? 'The Doctor saved the target. Nobody died.' : 'Nobody died.'}
    >
      {dead && <p className="reveal-role">They were <RoleTag role={r.killedRole} /></p>}
      {detCheck && <Intel check={detCheck} players={state.players} />}
      {r?.theft && <p className="intel theft"><RoleIcon role="THIEF" /> <span>A thief struck in the night. Someone at this table is no longer who they were.</span></p>}
      <Theft you={state.you} players={state.players} day={state.day} />
    </Notice>
  );
}

// Private news of the night's theft, for the Thief and for their victim.
function Theft({ you, players, day }) {
  if (you.stole?.day === day) {
    const mark = players.find((p) => p.id === you.stole.targetId)?.name || '?';
    return (
      <p className="intel theft">
        <RoleIcon role="THIEF" />
        <span>You robbed <b>{mark}</b>. You are now the <RoleTag role={you.stole.role} />{you.stole.role === 'MAFIA' ? ' Your new family knows you.' : ''}</span>
      </p>
    );
  }
  if (you.robbed?.day === day) {
    return (
      <p className="intel bad">
        <RoleIcon role="THIEF" />
        {you.robbed.role === 'VILLAGER'
          ? <span>The Thief broke in last night but found nothing worth taking. You are still a Villager.</span>
          : <span>Your role was stolen. You were the <RoleTag role={you.robbed.role} /> and woke up a plain Villager.</span>}
      </p>
    );
  }
  return null;
}

function Discussion({ state }) {
  const { you, players } = state;
  const humans = players.filter((p) => p.alive && !p.bot && p.connected);
  const readyN = humans.filter((p) => state.readyIds.includes(p.id)).length;
  const imReady = state.readyIds.includes(you.id);
  const need = Math.floor(humans.length / 2) + 1;
  function ready() {
    play('click');
    emit('ready_vote', { ready: !imReady });
  }
  return (
    <div className="stack">
      <Notice icon="chat" label="Discussion" title="Who is the Mafia?" text="Talk it out in the chat. Voting opens when the timer runs out — or sooner, if most of the table wants to vote now.">
        {!you.alive && <p className="intel"><Icon name="skull" /> <span>You are dead — only ghosts can see your messages.</span></p>}
        {you.alive && you.role === 'JESTER' && <p className="intel"><RoleIcon role="JESTER" /> <span>Play guilty. If the town votes you out, you win.</span></p>}
        <Theft you={you} players={players} day={state.day} />
        <div className="ready-vote">
          {you.alive && (
            <button className={`b ${imReady ? 'b-ghost' : 'b-primary'}`} onClick={ready} aria-pressed={imReady}>
              <Icon name={imReady ? 'check' : 'ballot'} /> {imReady ? 'Vote now — undo' : 'Vote now'}
            </button>
          )}
          <span className="dim small">{readyN}/{need} want to vote now · at {need} the timer stops and voting starts</span>
        </div>
      </Notice>
      {state.history.length > 0 && (
        <section className="panel cut">
          <h2 className="panel-title">So far</h2>
          <Timeline history={state.history} />
        </section>
      )}
      {you.role === 'DETECTIVE' && you.checks.length > 0 && (
        <section className="panel cut">
          <h2 className="panel-title">Your investigations</h2>
          <div className="intel-list">
            {you.checks.map((c, i) => <Intel key={i} check={c} players={players} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Voting({ state }) {
  return <VotePanel state={state} title="Vote someone out" />;
}

// The voting round. It ends the moment the result is settled — someone holds a majority,
// or everyone has voted — instead of waiting for the timer.
function VotePanel({ state, title }) {
  const { you, players } = state;
  const [err, setErr] = useState('');
  const aliveN = players.filter((p) => p.alive).length;
  const voted = state.votedIds.length;
  const majority = Math.floor(aliveN / 2) + 1;
  async function vote(targetId) {
    const res = await emit('cast_vote', { targetId });
    setErr(res.error || '');
  }
  const progress = (
    <div className="ready">
      <div className="bar"><span style={{ transform: `scaleX(${aliveN ? voted / aliveN : 0})` }} /></div>
      <span className="dim">{voted}/{aliveN} voted · {majority} decides it</span>
    </div>
  );
  if (!you.alive) {
    return (
      <section className="panel cut">
        <h2 className="panel-title">The living are voting</h2>
        <Board players={players} youId={you.id} />
        {progress}
      </section>
    );
  }
  return (
    <section className="panel cut action tone-vote">
      <div className="action-head">
        <span className="label"><Icon name="ballot" /> Day {state.day} · Vote</span>
        <h2 className="h-lg">{title}</h2>
      </div>
      <TargetGrid players={players} youId={you.id} hostId={state.hostId} exclude={[you.id]} selectedId={you.vote} onPick={vote} verb="Your vote" tone="vote" allowSkip skipSelected={you.vote === 'SKIP'} votedIds={state.votedIds} />
      {progress}
      <p className="status-line">
        {you.vote ? <><Icon name="check" /> Vote cast — you can change it until the vote is decided.</> : `The vote ends early once one choice reaches ${majority} votes or everyone has voted.`}
      </p>
      {err && <p className="err">{err}</p>}
    </section>
  );
}

function VoteResult({ state }) {
  const r = state.result;
  const name = (id) => (id === 'SKIP' ? 'Skip' : state.players.find((p) => p.id === id)?.name || '?');
  const counts = {};
  for (const v of r?.votes || []) counts[v.targetId] = (counts[v.targetId] || 0) + 1;
  const tally = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = tally[0]?.[1] || 1;
  return (
    <div className="stack">
      <Notice
        icon="scales"
        label="Verdict"
        tone={r?.eliminatedName ? 'mafia' : undefined}
        title={r?.eliminatedName ? <><span className="t-red">{r.eliminatedName}</span> was voted out</> : r?.tie ? 'A tie — nobody is eliminated' : 'Nobody was eliminated'}
      >
        {r?.eliminatedName && <p className="reveal-role">They were <RoleTag role={r.eliminatedRole} /></p>}
      </Notice>
      {tally.length > 0 && (
        <section className="panel cut">
          <h2 className="panel-title">Votes</h2>
          <ul className="tally">
            {tally.map(([id, c]) => (
              <li key={id}>
                <span className="tally-name">{name(id)}</span>
                <span className="bar"><span style={{ transform: `scaleX(${c / max})` }} /></span>
                <b>{c}</b>
              </li>
            ))}
          </ul>
          <ul className="votelog">
            {r.votes.map((v, i) => (
              <li key={i}><b>{name(v.voterId)}</b> <span className="dim">→</span> {name(v.targetId)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function GameOver({ state }) {
  const isHost = state.hostId === state.you.id;
  const won = state.winner === state.you.team;
  const jester = state.winner === 'JESTER' ? state.players.find((p) => p.id === state.result?.eliminatedId) : null;
  return (
    <div className="stack">
      <section className={`panel cut finale ${won ? 'won' : 'lost'}`}>
        <span className="label">Game over{state.day > 0 ? ` · Day ${state.day}` : ''}</span>
        <h1 className="finale-title">{won ? 'Victory' : 'Defeat'}</h1>
        <p className={`finale-sub ${state.winner === 'MAFIA' ? 't-red' : state.winner === 'JESTER' ? 't-jester' : 't-gold'}`}>
          {state.winner === 'MAFIA' ? 'The Mafia take the town'
            : state.winner === 'JESTER' ? `The joke’s on you — ${jester?.name || 'the Jester'} was the Jester and wins alone`
            : 'The town is safe — the Villagers win'}
        </p>
        <div className="finale-actions">
          {isHost
            ? <button className="b b-primary b-xl" onClick={() => { play('click'); emit('play_again'); }}>Play again <Icon name="play" /></button>
            : <p className="dim"><span className="pulse-dot" /> Waiting for the host to start a new game</p>}
          <Link className="b b-ghost" href="/play"><Icon name="back" /> Menu</Link>
          <Feedback page="game-over" gameId={state.gameId} label="Rate this game" />
          <DiscordButton label="Find players on Discord" />
        </div>
      </section>
      <section className="panel cut">
        <h2 className="panel-title">Final roster</h2>
        <Board players={state.players} youId={state.you.id} final />
      </section>
      {state.history.length > 0 && (
        <section className="panel cut">
          <h2 className="panel-title">Match timeline</h2>
          <Timeline history={state.history} />
        </section>
      )}
      <PoweredBy />
    </div>
  );
}
