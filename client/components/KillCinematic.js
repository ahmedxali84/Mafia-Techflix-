'use client';
import { useEffect, useState } from 'react';
import { play } from '@/lib/sound';
import { roleInfo } from '@/lib/roles';
import RoleCard from './RoleCard';
import RoleTag from './RoleTag';

const SHOWN_KEY = 'mafia_kills_shown';
const LENGTH = 3600; // ms, matches .kill's animation

// Each death plays once per browser tab, even across refreshes and reconnects.
function firstTime(key) {
  try {
    const seen = JSON.parse(sessionStorage.getItem(SHOWN_KEY) || '[]');
    if (seen.includes(key)) return false;
    sessionStorage.setItem(SHOWN_KEY, JSON.stringify([key, ...seen].slice(0, 40)));
  } catch {}
  return true;
}

// A short cinematic when someone dies: at dawn the victim's card is shot and torn in two;
// after a vote it is stamped and dropped. It never blocks clicks and cleans itself up.
export default function KillCinematic({ state }) {
  const [show, setShow] = useState(null);
  const r = state.result;
  const night = state.phase === 'DAY_RESULT' && r?.type === 'NIGHT' && r.killedId;
  const vote = state.phase === 'VOTE_RESULT' && r?.type === 'VOTE' && r.eliminatedId;
  const key = night || vote ? `${state.gameId}:${state.day}:${night ? 'N' : 'V'}` : null;

  useEffect(() => {
    if (!key || !firstTime(key)) return;
    setShow({
      key,
      kind: night ? 'night' : 'vote',
      name: night ? r.killedName : r.eliminatedName,
      role: night ? r.killedRole : r.eliminatedRole,
      you: (night ? r.killedId : r.eliminatedId) === state.you.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Sound and self-removal live with the shown overlay, so an effect re-run can't strand it.
  useEffect(() => {
    if (!show) return;
    const shot = setTimeout(() => play(show.kind === 'night' ? 'gunshot' : 'stamp'), show.kind === 'night' ? 450 : 560);
    const done = setTimeout(() => setShow(null), LENGTH);
    return () => {
      clearTimeout(shot);
      clearTimeout(done);
    };
  }, [show]);

  // Leaving the phase early (e.g. a fast table) removes the overlay at once.
  useEffect(() => {
    if (show && show.key !== key) setShow(null);
  }, [key, show]);

  if (!show) return null;
  const tone = roleInfo(show.role).tone;
  return (
    <div className={`kill ${show.kind}`} key={show.key} role="status" aria-live="assertive">
      {show.kind === 'night' && <div className="kill-flash" />}
      <div className="kill-shake">
        <div className="kill-card">
          <RoleCard role={show.role} size="lg" className="kill-ghost" alt="" />
          <div className="kill-half kh-top"><RoleCard role={show.role} size="lg" alt="" /></div>
          <div className="kill-half kh-bot"><RoleCard role={show.role} size="lg" alt="" /></div>
          {show.kind === 'night' ? <Hit /> : <span className="kill-stamp">Voted out</span>}
        </div>
        <div className="kill-text">
          <span className="label">{show.kind === 'night' ? 'Killed in the night' : 'The town has spoken'}</span>
          <strong>{show.you ? 'You' : show.name}</strong>
          <span className={`kill-role tone-${tone}`}>{show.you ? 'were' : 'was'} the <RoleTag role={show.role} /></span>
        </div>
      </div>
    </div>
  );
}

// Bullet hole with radiating cracks, a blood splatter and a few drips (card-relative SVG).
function Hit() {
  return (
    <svg className="kill-hit" viewBox="0 0 100 155" preserveAspectRatio="none" aria-hidden="true">
      <g transform="translate(58 52)">
        <path className="blood" d="M-15 -4c-6-9 4-15 9-10 2-9 13-9 13 0 8-6 16 2 10 9 9 2 8 13-1 13 3 9-8 13-12 6-5 7-16 4-13-5-9-1-10-12-6-13z" fill="#7d0a12" opacity="0.92" />
        <circle className="blood" cx="-21" cy="11" r="2.4" fill="#7d0a12" />
        <circle className="blood" cx="20" cy="-11" r="1.8" fill="#7d0a12" />
        <circle className="blood" cx="15" cy="17" r="1.4" fill="#7d0a12" />
        <rect className="drip" x="-6" y="8" width="2.2" height="34" rx="1.1" fill="#6d0810" />
        <rect className="drip" x="4" y="11" width="1.6" height="22" rx="0.8" fill="#6d0810" />
        {['M0 0l-24 -18 -8 -10', 'M0 0l26 -12 9 -12', 'M0 0l-18 22 -4 14', 'M0 0l20 26 12 4', 'M0 0l-30 4'].map((d) => (
          <path key={d} className="crack" d={d} fill="none" stroke="rgba(255,235,220,0.75)" strokeWidth="0.6" />
        ))}
        <circle className="hole" r="3.6" fill="#050102" stroke="rgba(255,220,200,0.5)" strokeWidth="0.8" />
      </g>
    </svg>
  );
}
