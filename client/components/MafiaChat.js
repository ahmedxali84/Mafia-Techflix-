'use client';
import { useEffect, useRef, useState } from 'react';
import { emit } from '@/lib/socket';
import Icon from './Icon';

// The family's private channel (two or more Mafia): open day and night, readable only by the Mafia.
export default function MafiaChat({ messages, myId, team, canWrite }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [messages.length]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await emit('chat_message', { text, channel: 'mafia' });
    setErr(res.error || '');
    if (!res.error) setText('');
  }

  return (
    <section className="chat ch-mafia" aria-label="Mafia chat">
      <div className="chat-top">
        <span className="chat-channel"><i className="chat-dot" /> Mafia channel</span>
        <small className="chat-note">Secret — only your family can read this. Team: <b>{team.join(', ')}</b></small>
      </div>

      <div className="chat-log" ref={box} aria-live="polite">
        {messages.length === 0 && <p className="chat-empty">Plan your next move here.</p>}
        {messages.map((m) => (
          <p key={m.id} className={`msg msg-family ${m.from === myId ? 'mine' : ''}`}>
            <b>{m.from === myId ? 'You' : m.name}</b> {m.text}
          </p>
        ))}
      </div>

      <form onSubmit={submit} className="chat-input">
        <input className="field" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} disabled={!canWrite} aria-label="Message to the Mafia"
          placeholder={canWrite ? 'Message the family…' : 'Only living Mafia can write'} />
        <button className="b b-primary" disabled={!canWrite || !text.trim()}><Icon name="lock" /> Send</button>
      </form>
      {err && <p className="err">{err}</p>}
    </section>
  );
}
