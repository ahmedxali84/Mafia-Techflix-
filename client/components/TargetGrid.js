'use client';
import { play } from '@/lib/sound';
import Avatar from './Avatar';
import Icon from './Icon';
import RoleTag from './RoleTag';

// Pick one living player (night actions and day votes). `verb` is stamped on the chosen tile,
// `tone` colours the selection (mafia red, doctor green, detective blue, vote gold).
// `marks` ({ targetId: [names] }) flags tiles other people picked, e.g. Mafia teammates at night.
export default function TargetGrid({ players, youId, hostId, exclude = [], selectedId, onPick, verb, tone = 'mafia', votedIds = [], marks = {}, allowSkip, skipSelected }) {
  const targets = players.filter((p) => p.alive && !exclude.includes(p.id));
  const pick = (id) => { play('select'); onPick(id); };
  return (
    <div className={`tgrid tone-${tone}`} role="radiogroup" aria-label="Choose a player">
      {targets.map((p) => {
        const on = selectedId === p.id;
        return (
          <button key={p.id} type="button" role="radio" aria-checked={on} className={`tile cut ${on ? 'on' : ''}`} onClick={() => pick(p.id)}>
            <Avatar name={p.name} size={46} />
            <span className="tile-name">{p.name}</span>
            <span className="tile-sub">{p.id === youId ? 'You' : p.id === hostId ? 'Host' : p.bot ? 'Bot' : ' '}</span>
            {p.role && <RoleTag role={p.role} />}
            {votedIds.includes(p.id) && <span className="tile-voted" title="Has voted"><Icon name="check" /> Voted</span>}
            {marks[p.id] && <span className="tile-mark"><Icon name="target" /> {marks[p.id].join(', ')}</span>}
            {on && <span className="tile-stamp">{verb}</span>}
          </button>
        );
      })}
      {allowSkip && (
        <button type="button" role="radio" aria-checked={!!skipSelected} className={`tile tile-skip cut ${skipSelected ? 'on' : ''}`} onClick={() => pick('SKIP')}>
          <span className="tile-skip-ic"><Icon name="skip" /></span>
          <span className="tile-name">Skip vote</span>
          <span className="tile-sub">No elimination</span>
          {skipSelected && <span className="tile-stamp">Skipping</span>}
        </button>
      )}
    </div>
  );
}
