'use client';
import { useEffect, useRef, useState } from 'react';
import { emit } from '@/lib/socket';
import { play } from '@/lib/sound';
import Avatar from './Avatar';

const LABEL = { public: '💬 Town chat', mafia: '🔪 Mafia chat (secret)', dead: '👻 Ghost chat' };
const REACTIONS = ['👍', '😂', '🤔', '😱', '🔥'];
const WHISPER_MAX = 140;

export default function Chat({ messages, channel, myId, players = [], whispersLeft = 0, canWhisper = false }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [mode, setMode] = useState('public'); // 'public' | 'whisper'
  const [target, setTarget] = useState(null);
  const [newWhispers, setNewWhispers] = useState(0);
  const [sent, setSent] = useState(false);
  const box = useRef(null);
  const seen = useRef(messages.length);

  const whisperOn = canWhisper && mode === 'whisper';
  const targets = players.filter((p) => p.alive && p.id !== myId);
  const nameOf = (id) => players.find((p) => p.id === id)?.name || '?';

  // Leave whisper mode when whispers are no longer allowed (night, game over, death).
  useEffect(() => {
    if (!canWhisper) setMode('public');
  }, [canWhisper]);

  // Forget a target who has died since.
  useEffect(() => {
    if (target && !targets.some((p) => p.id === target)) setTarget(null);
  }, [players]); // eslint-disable-line react-hooks/exhaustive-deps

  // Count whispers that arrive while looking at town chat.
  useEffect(() => {
    const fresh = messages.slice(seen.current);
    seen.current = messages.length;
    const incoming = fresh.filter((m) => m.channel === 'whisper' && m.to === myId).length;
    if (incoming && !whisperOn) setNewWhispers((n) => n + incoming);
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (box.current) box.current.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  function switchMode(m) {
    play('click');
    setMode(m);
    setErr('');
    if (m === 'whisper') setNewWhispers(0);
  }

  async function sendPublic(t) {
    if (!t.trim() || !channel) return false;
    const res = await emit('chat_message', { text: t });
    setErr(res.error || '');
    return !res.error;
  }

  async function submit(e) {
    e.preventDefault();
    if (whisperOn) {
      if (!target) return setErr('Pick who to whisper to');
      const res = await emit('whisper', { targetId: target, text });
      if (res.error) return setErr(res.error);
      setErr('');
      setText('');
      setSent(true);
      play('whisper');
      setTimeout(() => setSent(false), 1400);
      return;
    }
    if (await sendPublic(text)) setText('');
  }

  const noneLeft = whispersLeft <= 0;
  const heading = whisperOn ? '🤫 Whisper' : channel ? LABEL[channel] : '💬 Chat';

  return (
    <section className={`chat ${whisperOn ? 'whisper-mode' : channel || ''}`}>
      <div className="chat-head">
        <h3>{heading}</h3>
        {canWhisper && (
          <div className="seg" role="tablist" aria-label="Chat mode">
            <button role="tab" aria-selected={!whisperOn} className={!whisperOn ? 'on' : ''} onClick={() => switchMode('public')}>💬 Town</button>
            <button role="tab" aria-selected={whisperOn} className={`w ${whisperOn ? 'on' : ''}`} onClick={() => switchMode('whisper')}>
              🤫 Whisper
              <span className="pips" aria-label={`${whispersLeft} whispers left`}>
                {Array.from({ length: Math.max(2, whispersLeft) }, (_, i) => <i key={i} className={i < whispersLeft ? 'full' : ''} />)}
              </span>
              {newWhispers > 0 && !whisperOn && <b className="ping">{newWhispers}</b>}
            </button>
          </div>
        )}
      </div>

      <div className="messages" ref={box} aria-live="polite">
        {messages.length === 0 && <p className="muted small empty">No messages yet — say something.</p>}
        {messages.map((m) => {
          if (m.channel === 'notice') {
            if (m.from === myId || m.to === myId) return null; // your own whisper bubble already shows it
            return <div key={m.id} className="notice"><span>🤫</span> {m.name} whispered to {m.toName}</div>;
          }
          if (m.channel === 'whisper') {
            const mine = m.from === myId;
            return (
              <div key={m.id} className={`bubble whisper ${mine ? 'mine' : ''}`}>
                <b>🤫 {mine ? `You → ${m.toName}` : `${m.name} → you`}</b>
                <span>{m.text}</span>
              </div>
            );
          }
          return (
            <div key={m.id} className={`bubble ${m.channel} ${m.from === myId ? 'mine' : ''}`}>
              {m.from !== myId && <b>{m.name}</b>}
              <span>{m.text}</span>
            </div>
          );
        })}
      </div>

      {whisperOn ? (
        <div className="whisper-box">
          {noneLeft ? (
            <p className="whisper-empty">🤐 You are out of whispers. Choose your words in town chat now.</p>
          ) : (
            <>
              <p className="whisper-hint">🔒 Only they can read it — but <b>everyone</b> will see that you whispered.</p>
              <div className="chips" role="radiogroup" aria-label="Whisper to">
                {targets.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={target === p.id} className={`chip ${target === p.id ? 'on' : ''}`} onClick={() => { play('select'); setTarget(p.id); }}>
                    <Avatar name={p.name} size={26} />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="reactions">
          {REACTIONS.map((r) => (
            <button key={r} className="react" disabled={!channel} onClick={() => sendPublic(r)} aria-label={`Send ${r}`}>{r}</button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="row">
        <div className="field">
          <input
            className="input"
            maxLength={whisperOn ? WHISPER_MAX : 300}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={whisperOn ? noneLeft : !channel}
            placeholder={whisperOn ? (target ? `Whisper to ${nameOf(target)}…` : 'Pick someone, then type…') : channel ? 'Type a message…' : 'Chat is closed right now'}
          />
          {whisperOn && !noneLeft && <small className="count">{WHISPER_MAX - text.length}</small>}
        </div>
        <button className={`btn ${whisperOn ? 'violet' : 'primary'} ${sent ? 'sent' : ''}`} disabled={whisperOn ? noneLeft || !text.trim() || !target : !channel || !text.trim()}>
          {sent ? '✓ Sent' : whisperOn ? '🤫 Send' : 'Send'}
        </button>
      </form>
      {err && <p className="error small">{err}</p>}
    </section>
  );
}
