'use client';
import PlayerCard from './PlayerCard';
import { play } from '@/lib/sound';

// A list of living players to pick from (used for night actions and day votes).
export default function VoteList({ players, youId, hostId, selectedId, onPick, exclude = [], allowSkip, skipSelected, votedIds = [] }) {
  const targets = players.filter((p) => p.alive && !exclude.includes(p.id));
  const pick = (id) => { play('select'); onPick(id); };
  return (
    <div className="list">
      {targets.map((p) => (
        <PlayerCard
          key={p.id}
          player={p}
          isYou={p.id === youId}
          isHost={p.id === hostId}
          selected={selectedId === p.id}
          onClick={() => pick(p.id)}
          badge={votedIds.includes(p.id) ? <span className="tag ok">✓ voted</span> : null}
        />
      ))}
      {allowSkip && (
        <button type="button" className={`btn ${skipSelected ? 'primary' : ''}`} onClick={() => pick('SKIP')}>
          ⏭️ Skip vote
        </button>
      )}
    </div>
  );
}
