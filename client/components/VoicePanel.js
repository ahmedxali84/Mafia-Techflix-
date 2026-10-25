'use client';
import { play } from '@/lib/sound';
import Avatar from './Avatar';
import Icon from './Icon';
import DiscordButton from './DiscordButton';

const CHANNEL = {
  public: { label: 'Town channel', note: 'Everyone hears you' },
  mafia: { label: 'Mafia channel', note: 'Only the Mafia hear you' },
  dead: { label: 'Ghost channel', note: 'Only ghosts hear you' },
};

// Voice controls: join/leave, push-to-talk or open mic, mute, deafen and a per-player mixer.
export default function VoicePanel({ voice, state }) {
  const { you, players } = state;
  const route = you.voice || { sendTo: [], hearFrom: [], channel: null };
  const members = players.filter((p) => p.id !== you.id && p.voice);

  if (!voice.active) {
    return (
      <section className="voice" aria-label="Voice chat">
        <div className="voice-off">
          <span className="voice-off-ic"><Icon name="headphones" /></span>
          <b>Voice chat</b>
          <p>Talk to the table in real time. Voice follows the chat rules — at night only the Mafia can talk to each other.</p>
          <small className="dim">{members.length} {members.length === 1 ? 'player' : 'players'} in voice</small>
          <button className="b b-primary b-block" onClick={() => { play('click'); voice.join(); }} disabled={voice.joining}>
            <Icon name="headphones" /> {voice.joining ? 'Connecting…' : 'Join voice'}
          </button>
          {voice.error && <p className="err">{voice.error}</p>}
          <DiscordButton variant="block" label="Prefer Discord? Join our server" />
        </div>
      </section>
    );
  }

  const ch = CHANNEL[route.channel];
  const canSpeak = !!ch && !voice.muted;
  const live = voice.talking && canSpeak && route.sendTo.length > 0;
  const ptt = voice.mode === 'ptt';
  const hold = holdToTalk(voice);

  return (
    <section className="voice" aria-label="Voice chat">
      <div className={`vchan ${ch ? `vchan-${route.channel}` : 'vchan-silent'} ${live ? 'live' : ''}`} role="status">
        <Icon name={live ? 'mic' : ch ? 'volume' : 'lock'} />
        <div>
          <b>{live ? 'Transmitting' : ch ? ch.label : 'Listen only'}</b>
          <small>
            {!ch ? 'You can’t talk right now' : voice.muted ? 'Your mic is muted' : route.sendTo.length === 0 ? 'Nobody who can hear you is in voice' : ch.note}
          </small>
        </div>
      </div>

      {voice.blockedAutoplay && (
        <button className="b b-block" onClick={voice.resumeAudio}><Icon name="volume" /> Tap to turn on voice audio</button>
      )}

      <div className="seg seg-full" role="radiogroup" aria-label="Mic mode">
        <button role="radio" aria-checked={ptt} className={ptt ? 'on' : ''} onClick={() => voice.setMode('ptt')}>Push-to-talk</button>
        <button role="radio" aria-checked={!ptt} className={!ptt ? 'on' : ''} onClick={() => voice.setMode('open')}>Open mic</button>
      </div>

      {ptt && (
        <button className={`b b-block ptt ${voice.talking ? 'held' : ''}`} disabled={!canSpeak} {...hold}>
          <Icon name="mic" /> {voice.talking ? 'Talking…' : 'Hold to talk'} <kbd>T</kbd>
        </button>
      )}

      <div className="voice-ctrl">
        <button className={`b b-sm ${voice.muted ? 'b-danger' : ''}`} aria-pressed={voice.muted} onClick={() => voice.setMuted(!voice.muted)}>
          <Icon name={voice.muted ? 'micOff' : 'mic'} /> {voice.muted ? 'Unmute' : 'Mute'}
        </button>
        <button className={`b b-sm ${voice.deafened ? 'b-danger' : ''}`} aria-pressed={voice.deafened} onClick={() => voice.setDeafened(!voice.deafened)}>
          <Icon name={voice.deafened ? 'deafen' : 'headphones'} /> {voice.deafened ? 'Undeafen' : 'Deafen'}
        </button>
        <button className="b b-sm b-ghost" onClick={() => { play('click'); voice.leave(); }}><Icon name="exit" /> Leave</button>
      </div>

      <h3 className="label">In voice · {members.length + 1}</h3>
      {members.length === 0 ? (
        <p className="dim small">Nobody else has joined voice yet.</p>
      ) : (
        <ul className="mixer">
          {members.map((p) => {
            const hear = route.hearFrom.includes(p.id);
            const off = voice.blocked.has(p.id);
            const conn = voice.connectionOf(p.id);
            return (
              <li key={p.id} className={`${voice.speaking.has(p.id) ? 'speaking' : ''} ${hear ? '' : 'faded'}`}>
                <Avatar name={p.name} size={28} dead={!p.alive} />
                <span className="mixer-name">
                  {p.name}
                  <small>{conn && conn !== 'connected' ? (conn === 'failed' ? 'No connection' : 'Connecting…') : p.voice.muted ? 'Mic muted' : hear ? 'Can hear' : 'Can’t hear them now'}</small>
                </span>
                <input type="range" min="0" max="1" step="0.05" aria-label={`Volume for ${p.name}`} value={voice.volumeOf(p.id)} onChange={(e) => voice.setVolume(p.id, Number(e.target.value))} disabled={off} />
                <button className="hud-btn sm" aria-pressed={off} aria-label={off ? `Unmute ${p.name}` : `Mute ${p.name}`} title={off ? 'Unmute' : 'Mute for me'} onClick={() => voice.setBlocked(p.id, !off)}>
                  <Icon name={off ? 'volumeOff' : 'volume'} />
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
    <button className={`ptt-fab ${voice.talking ? 'held' : ''}`} aria-label="Hold to talk" {...holdToTalk(voice)}>
      <Icon name="mic" />
    </button>
  );
}
