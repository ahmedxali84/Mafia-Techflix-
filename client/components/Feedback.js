'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SERVER_URL, getName } from '@/lib/socket';
import { play } from '@/lib/sound';
import Icon from './Icon';

const LABELS = ['Bad', 'Meh', 'Okay', 'Good', 'Loved it'];
const MAX = 1000;

// "Feedback" button + dialog (beta, week 8): a 1-5 rating and an optional comment, sent to the
// server's POST /feedback. `page` says where it was opened, `gameId` ties it to a finished game.
export default function Feedback({ page = 'menu', gameId, label = 'Feedback', className = 'b b-ghost' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={label} title={label}><Icon name="chat" /> <span className="fb-trigger-text">{label}</span></button>
      {/* Rendered at page level so the menu/nav button styles around the trigger don't leak in. */}
      {open && createPortal(<FeedbackDialog page={page} gameId={gameId} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function FeedbackDialog({ page, gameId, onClose }) {
  const box = useRef(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent
  const [err, setErr] = useState('');

  useEffect(() => {
    box.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!rating) return setErr('Pick a rating first');
    setState('sending');
    setErr('');
    try {
      const res = await fetch(`${SERVER_URL}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating, text, page, gameId, name: getName() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send feedback');
      setState('sent');
      play('saved');
    } catch (ex) {
      setState('idle');
      setErr(ex.message === 'Failed to fetch' ? 'Cannot reach the game server' : ex.message);
    }
  }

  return (
    <div className="dlg-back" onClick={onClose}>
      <form ref={box} tabIndex={-1} className="dlg cut fb" role="dialog" aria-modal="true" aria-labelledby="fb-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="dlg-head">
          <div>
            <span className="label">Beta</span>
            <h2 id="fb-title" className="h-lg">How was it?</h2>
          </div>
          <button type="button" className="hud-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>

        {state === 'sent' ? (
          <div className="fb-done">
            <Icon name="check" />
            <p><b>Thank you!</b> The team reads every message.</p>
            <button type="button" className="b b-primary" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div className="fb-stars" role="radiogroup" aria-label="Rating">
              {LABELS.map((l, i) => (
                <button key={l} type="button" role="radio" aria-checked={rating === i + 1} aria-label={`${i + 1} – ${l}`}
                  className={`fb-star ${rating > i ? 'on' : ''}`} onClick={() => { play('select'); setRating(i + 1); }}>★</button>
              ))}
              <span className="fb-label">{rating ? LABELS[rating - 1] : 'Tap a star'}</span>
            </div>
            <label className="label" htmlFor="fb-text">Anything to tell us? (optional)</label>
            <textarea id="fb-text" className="field fb-text" rows={4} maxLength={MAX} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Bugs, ideas, what you liked…" />
            <small className="dim fb-count">{MAX - text.length}</small>
            {err && <p className="err">{err}</p>}
            <footer className="dlg-foot">
              <button className="b b-primary b-lg" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send feedback'}</button>
            </footer>
          </>
        )}
      </form>
    </div>
  );
}
