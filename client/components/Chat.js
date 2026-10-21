'use client';
import { useEffect, useRef, useState } from 'react';
import { emit } from '@/lib/socket';
import { play } from '@/lib/sound';
import Avatar from './Avatar';
import Icon from './Icon';

const CHANNEL = {
  public: { label: 'Town chat', note: 'Everyone can read this' },
  mafia: { label: 'Mafia channel', note: 'Secret — only the Mafia can read this' },
  dead: { label: 'Ghost chat', note: 'Only the dead can read this' },
};
const QUICK = ['👍', '😂', '🤔', '😱', '🔥'];
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
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
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
  const ch = CHANNEL[channel];

  return (
    <section className={`chat ${whisperOn ? 'ch-whisper' : `ch-${channel || 'closed'}`}`} aria-label="Chat">
      <div className="chat-top">
        {canWhisper ? (
          <div className="seg" role="tablist" aria-label="Chat mode">
            <button role="tab" aria-selected={!whisperOn} className={!whisperOn ? 'on' : ''} onClick={() => switchMode('public')}>
              <Icon name="chat" /> Town
            </button>
            <button role="tab" aria-selected={whisperOn} className={`seg-w ${whisperOn ? 'on' : ''}`} onClick={() => switchMode('whisper')}>
              <Icon name="whisper" /> Whisper
              <span className="pips" aria-label={`${whispersLeft} whispers left`}>
                {Array.from({ length: Math.max(2, whispersLeft) }, (_, i) => <i key={i} className={i < whispersLeft ? 'full' : ''} />)}
              </span>
              {newWhispers > 0 && !whisperOn && <b className="badge">{newWhispers}</b>}
            </button>
          </div>
        ) : (
          <span className="chat-channel"><i className="chat-dot" /> {ch ? ch.label : 'Chat closed'}</span>
        )}
        <small className="chat-note">{whisperOn ? 'Fully private — nobody else knows you whispered' : ch ? ch.note : 'You can read, but not write right now'}</small>
      </div>

      <div className="chat-log" ref={box} aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">No messages yet.</p>}
        {messages.map((m) => {
          if (m.channel === 'whisper') {
            const mine = m.from === myId;
            return (
              <p key={m.id} className="msg msg-whisper">
                <b>{mine ? `You → ${m.toName}` : `${m.name} → you`}</b> {m.text}
              </p>
            );
          }
          const mine = m.from === myId;
          return (
            <p key={m.id} className={`msg msg-${m.channel} ${mine ? 'mine' : ''}`}>
              {m.channel === 'mafia' && <span className="msg-ch">[Mafia]</span>}
              {m.channel === 'dead' && <span className="msg-ch">[Ghost]</span>}
              <b>{mine ? 'You' : m.name}</b> {m.text}
            </p>
          );
        })}
      </div>

      {whisperOn ? (
        noneLeft ? (
          <p className="whisper-out"><Icon name="lock" /> You are out of whispers for this game.</p>
        ) : (
          <div className="whisper-to" role="radiogroup" aria-label="Whisper to">
            {targets.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={target === p.id} className={`wchip ${target === p.id ? 'on' : ''}`} onClick={() => { play('select'); setTarget(p.id); }}>
                <Avatar name={p.name} size={22} />
                {p.name}
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="quick" aria-label="Quick reactions">
          {QUICK.map((r) => (
            <button key={r} disabled={!channel} onClick={() => sendPublic(r)} aria-label={`Send ${r}`}>{r}</button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="chat-input">
        <input
          className="field"
          maxLength={whisperOn ? WHISPER_MAX : 300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={whisperOn ? noneLeft : !channel}
          aria-label="Message"
          placeholder={whisperOn ? (target ? `Whisper to ${nameOf(target)}…` : 'Pick someone, then type…') : channel ? 'Type a message…' : 'Chat is closed right now'}
        />
        {whisperOn && !noneLeft && <small className="chat-count">{WHISPER_MAX - text.length}</small>}
        <button className={`b ${whisperOn ? 'b-violet' : 'b-primary'}`} disabled={whisperOn ? noneLeft || !text.trim() || !target : !channel || !text.trim()}>
          {sent ? <><Icon name="check" /> Sent</> : 'Send'}
        </button>
      </form>
      {err && <p className="err">{err}</p>}
    </section>
  );
}
