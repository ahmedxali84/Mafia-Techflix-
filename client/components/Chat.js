'use client';
import { useEffect, useRef, useState } from 'react';
import { emit } from '@/lib/socket';

const LABEL = { public: '💬 Town chat', mafia: '🔪 Mafia chat (secret)', dead: '👻 Ghost chat' };
const REACTIONS = ['👍', '😂', '🤔', '😱', '🔥'];

export default function Chat({ messages, channel, myId }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (box.current) box.current.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function sendText(t) {
    if (!t.trim() || !channel) return;
    const res = await emit('chat_message', { text: t });
    setErr(res.error || '');
    return !res.error;
  }
  async function submit(e) {
    e.preventDefault();
    if (await sendText(text)) setText('');
  }

  return (
    <section className={`chat ${channel || ''}`}>
      <h3>{channel ? LABEL[channel] : '💬 Chat'}</h3>
      <div className="messages" ref={box} aria-live="polite">
        {messages.length === 0 && <p className="muted small empty">No messages yet — say something.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.channel} ${m.from === myId ? 'mine' : ''}`}>
            {m.from !== myId && <b>{m.name}</b>}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="reactions">
        {REACTIONS.map((r) => (
          <button key={r} className="react" disabled={!channel} onClick={() => sendText(r)} aria-label={`Send ${r}`}>{r}</button>
        ))}
      </div>
      <form onSubmit={submit} className="row">
        <input className="input" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} disabled={!channel} placeholder={channel ? 'Type a message…' : 'Chat is closed right now'} />
        <button className="btn primary" disabled={!channel || !text.trim()}>Send</button>
      </form>
      {err && <p className="error small">{err}</p>}
    </section>
  );
}
