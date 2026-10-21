'use client';
import { useEffect, useRef } from 'react';
import { ROLES } from '@/lib/roles';
import Icon from './Icon';
import RoleCard from './RoleCard';

const ROUND = [
  ['moon', 'Night', 'Mafia pick a victim. The Doctor protects someone. The Detective investigates someone. On the first night the Thief steals a role.'],
  ['sun', 'Morning', 'The town learns who, if anyone, died — and what role they had.'],
  ['chat', 'Discussion', 'Talk it out. Share suspicions, defend yourself, whisper a secret. If most of the table hits Vote now, the timer stops and voting starts.'],
  ['ballot', 'Vote', 'Most votes is eliminated; a majority ends the day at once. A tie means nobody goes.'],
];

export default function HowToPlay({ onClose }) {
  const box = useRef(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dlg-back" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="dlg cut" role="dialog" aria-modal="true" aria-labelledby="htp-title" onClick={(e) => e.stopPropagation()}>
        <header className="dlg-head">
          <div>
            <span className="label">Briefing</span>
            <h2 id="htp-title" className="h-lg">How to play</h2>
          </div>
          <button className="hud-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>

        <div className="dlg-body">
          <p className="dim dlg-intro">A hidden team of Mafia is trying to eliminate the town. The town must find them first.</p>

          <div className="dlg-col">
            <h3 className="label">A round</h3>
            <ol className="round">
              {ROUND.map(([icon, name, text], i) => (
                <li key={name} className="cut">
                  <span className="round-n">0{i + 1}</span>
                  <div>
                    <b><Icon name={icon} /> {name}</b>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="dlg-col">
            <h3 className="label">Roles</h3>
            <ul className="role-list">
              {Object.entries(ROLES).map(([key, r]) => (
                <li key={key} className={`tone-${r.tone}`}>
                  <RoleCard role={key} size="sm" alt="" />
                  <div>
                    <b>{r.label}</b> <small>· {r.team}</small>
                    <p>{r.blurb}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="win-rules">
              <p><b className="t-gold">Town wins</b> when every Mafia member is gone.</p>
              <p><b className="t-red">Mafia win</b> when they equal or outnumber everyone else.</p>
              <p><b className="t-jester">The Jester wins</b> alone, the moment the town votes them out.</p>
            </div>
          </div>
        </div>

        <footer className="dlg-foot">
          <button className="b b-primary b-lg" onClick={onClose}>Got it <Icon name="check" /></button>
        </footer>
      </div>
    </div>
  );
}
