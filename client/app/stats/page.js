'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Scene from '@/components/Scene';
import { ROLE_INFO } from '@/components/PlayerCard';
import { getStats, resetStats } from '@/lib/stats';

const pct = (w, g) => (g ? Math.round((w / g) * 100) : 0);

export default function MyStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => setStats(getStats()), []);

  function reset() {
    resetStats();
    setStats(getStats());
  }

  return (
    <main className="screen">
      <Scene day={false} />
      <div className="home">
        <div className="card glass center" data-tilt="3">
          <h1 className="page-title">📊 My stats</h1>
          {!stats && <div className="skeleton-list">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>}
          {stats && stats.games === 0 && <p className="muted">No games played yet on this device. Finish a game to start your record!</p>}
          {stats && stats.games > 0 && (
            <>
              <div className="stat-row">
                <div><b>{stats.games}</b><span>games</span></div>
                <div><b>{stats.wins}</b><span>wins</span></div>
                <div><b>{pct(stats.wins, stats.games)}%</b><span>win rate</span></div>
              </div>
              <table className="table">
                <thead>
                  <tr><th>Role</th><th>Games</th><th>Wins</th><th>Win %</th></tr>
                </thead>
                <tbody>
                  {Object.entries(stats.byRole).map(([role, r]) => (
                    <tr key={role}>
                      <td>{ROLE_INFO[role]?.label || role}</td>
                      <td>{r.games}</td>
                      <td><b>{r.wins}</b></td>
                      <td>{pct(r.wins, r.games)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small">Stats are saved in this browser only.</p>
              <button className="btn" onClick={reset}>Reset stats</button>
            </>
          )}
          <Link className="btn" href="/play">← Back</Link>
        </div>
      </div>
    </main>
  );
}
