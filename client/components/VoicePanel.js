'use client';
import { play } from '@/lib/sound';
import Avatar from './Avatar';

const CHANNEL = {
  public: { icon: '📢', label: 'Everyone hears you' },
  mafia: { icon: '🔪', label: 'Only the Mafia hear you' },
  dead: { icon: '👻', label: 'Only ghosts hear you' },
};

// Voice controls: join/leave, push-to-talk or open mic, mute, deafen and a per-player mixer.
export default function VoicePanel({ voice, state }) {
  const { you, players } = state;
  const route = you.voice || { sendTo: [], hearFrom: [], channel: null };
  const members = players.filter((p) => p.id !== you.id && p.voice);

  if (!voice.active) {
    return (
      <section className="voice card glass" aria-label="Voice chat">
        <h3 className="side-title">🎙️ Voice chat <span>{members.length} in voice</span></h3>
        <p className="muted small">Talk to the table in real time. Voice follows the chat rules — at night only the Mafia can talk to each other.</p>
        <button className="btn primary" onClick={() => { play('click'); voice.join(); }} disabled={voice.joining}>
          {voice.joining ? 'Connecting…' : '🎧 Join voice'}
        </button>
        {voice.error && <p className="error">{voice.error}</p>}
      </section>
    );
  }

  const ch = CHANNEL[route.channel];
  const canSpeak = !!ch && !voice.muted;
  const live = voice.talking && canSpeak && route.sendTo.length > 0;
  const ptt = voice.mode === 'ptt';
  const hold = holdToTalk(voice);

  return (
    <section className="voice card glass" aria-label="Voice chat">
      <h3 className="side-title">🎙️ Voice chat <span>{members.length + 1} in voice</span></h3>

      <div className={`voice-channel ${ch ? route.channel : 'silent'} ${live ? 'live' : ''}`} role="status">
        <span>{ch ? ch.icon : '🤐'}</span>
        <div>
          <b>{ch ? ch.label : 'You can only listen right now'}</b>
          {ch && route.sendTo.length === 0 && <small>Nobody who can hear you is in voice</small>}
          {voice.muted && <small>Your mic is muted</small>}
        </div>
      </div>

      {voice.blockedAutoplay && (
        <button className="btn small" onClick={voice.resumeAudio}>🔈 Tap to turn on voice audio</button>
      )}

      <div className="seg" role="radiogroup" aria-label="Mic mode">
        <button role="radio" aria-checked={ptt} className={ptt ? 'on' : ''} onClick={() => voice.setMode('ptt')}>Push-to-talk</button>
        <button role="radio" aria-checked={!ptt} className={!ptt ? 'on' : ''} onClick={() => voice.setMode('open')}>Open mic</button>
      </div>

      {ptt && (
        <button className={`btn ptt ${voice.talking ? 'held' : ''}`} disabled={!canSpeak} {...hold}>
          {voice.talking ? '🔴 Talking…' : '🎙️ Hold to talk'} <kbd>T</kbd>
        </button>
      )}

      <div className="voice-row">
        <button className={`btn small ${voice.muted ? 'danger' : ''}`} aria-pressed={voice.muted} onClick={() => voice.setMuted(!voice.muted)}>
          {voice.muted ? '🔇 Unmute' : '🎙️ Mute'}
        </button>
        <button className={`btn small ${voice.deafened ? 'danger' : ''}`} aria-pressed={voice.deafened} onClick={() => voice.setDeafened(!voice.deafened)}>
          {voice.deafened ? '🔕 Undeafen' : '🎧 Deafen'}
        </button>
        <button className="btn small ghost" onClick={() => { play('click'); voice.leave(); }}>Leave</button>
      </div>

      {members.length > 0 && (
        <ul className="voice-list">
          {members.map((p) => {
            const hear = route.hearFrom.includes(p.id);
            const off = voice.blocked.has(p.id);
            const conn = voice.connectionOf(p.id);
            return (
              <li key={p.id} className={`${voice.speaking.has(p.id) ? 'speaking' : ''} ${hear ? '' : 'faded'}`}>
                <Avatar name={p.name} size={28} dead={!p.alive} />
                <span className="vname">
                  {p.name}
                  <small>{conn && conn !== 'connected' ? (conn === 'failed' ? 'no connection' : 'connecting…') : p.voice.muted ? 'mic muted' : hear ? '' : 'can’t hear them now'}</small>
                </span>
                <input type="range" min="0" max="1" step="0.05" aria-label={`Volume for ${p.name}`} value={voice.volumeOf(p.id)} onChange={(e) => voice.setVolume(p.id, Number(e.target.value))} disabled={off} />
                <button className="icon-btn sm" aria-pressed={off} aria-label={off ? `Unmute ${p.name}` : `Mute ${p.name}`} title={off ? 'Unmute' : 'Mute for me'} onClick={() => voice.setBlocked(p.id, !off)}>
                  {off ? '🔇' : '🔊'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const holdToTalk = (voice) => ({
  onPointerDown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); voice.setTalking(true); },
  onPointerUp: () => voice.setTalking(false),
  onPointerCancel: () => voice.setTalking(false),
  onLostPointerCapture: () => voice.setTalking(false),
  onContextMenu: (e) => e.preventDefault(),
});

// Floating hold-to-talk button for phones, visible on every tab.
export function PushToTalkFab({ voice, state }) {
  const channel = state.you.voice?.channel;
  if (!voice.active || voice.mode !== 'ptt' || !channel || voice.muted) return null;
  return (
    <button className={`ptt-fab ${voice.talking ? 'held' : ''}`} aria-label="Hold to talk" {...holdToTalk(voice)}>🎙️</button>
  );
}
