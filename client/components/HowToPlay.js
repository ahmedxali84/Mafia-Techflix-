'use client';
import { useEffect } from 'react';
import { ROLE_INFO } from './PlayerCard';

export default function HowToPlay({ onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={(e) => e.stopPropagation()}>
        <h2>How to play</h2>
        <p className="muted">A hidden team of Mafia is trying to eliminate the town. The town must find them first.</p>
        <ol className="steps">
          <li><b>🌙 Night</b> — Mafia choose someone to kill, the Doctor protects someone, the Detective investigates someone.</li>
          <li><b>☀️ Morning</b> — Everyone learns who (if anyone) died.</li>
          <li><b>🗣️ Discussion</b> — Talk it out and share suspicions.</li>
          <li><b>🗳️ Vote</b> — The player with the most votes is eliminated. A tie means nobody goes.</li>
        </ol>
        <h3>Roles</h3>
        <ul className="roles">
          {Object.values(ROLE_INFO).map((r) => (
            <li key={r.label}><span>{r.icon}</span><div><b>{r.label}</b><br /><span className="muted small">{r.blurb}</span></div></li>
          ))}
        </ul>
        <p className="small"><b>Villagers win</b> when all Mafia are gone. <b>Mafia win</b> when they equal or outnumber everyone else.</p>
        <button className="btn primary" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
