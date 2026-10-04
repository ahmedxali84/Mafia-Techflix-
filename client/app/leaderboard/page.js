'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SERVER_URL } from '@/lib/socket';
import Scene from '@/components/Scene';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${SERVER_URL}/leaderboard`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Could not reach the server'));
  }, []);

  return (
    <main className="screen">
      <Scene day={false} />
      <div className="home">
        <div className="card glass center">
          <h1 className="page-title">🏆 Leaderboard</h1>
          {error && <p className="error">{error}</p>}
          {!data && !error && <div className="skeleton-list">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" />)}</div>}
          {data && !data.enabled && <p className="muted">Stats are not enabled on this server.</p>}
          {data?.enabled && data.players.length === 0 && <p className="muted">No games played yet. Be the first on the board!</p>}
          {data?.enabled && data.players.length > 0 && (
            <table className="table">
              <thead>
                <tr><th>#</th><th>Player</th><th>Wins</th><th>Games</th><th>Win %</th></tr>
              </thead>
              <tbody>
                {data.players.map((p, i) => (
                  <tr key={p.name + i}>
                    <td>{MEDALS[i] || i + 1}</td>
                    <td>{p.name}</td>
                    <td><b>{p.wins}</b></td>
                    <td>{p.games}</td>
                    <td>{Math.round((p.wins / p.games) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link className="btn" href="/">← Back home</Link>
        </div>
      </div>
    </main>
  );
}
