import Avatar from './Avatar';
import Icon from './Icon';
import RoleTag from './RoleTag';

// One line of the roster: portrait, name, and status markers (host, bot, offline, voice, known role).
export default function PlayerRow({ player: p, isYou, isHost, speaking }) {
  return (
    <li className={`prow ${p.alive ? '' : 'dead'} ${isYou ? 'you' : ''} ${speaking ? 'speaking' : ''}`}>
      <Avatar name={p.name} size={34} dead={!p.alive} />
      <span className="prow-name">
        <b>{p.name}</b>
        {isHost && <Icon name="crown" className="t-gold" title="Host" />}
        {isYou && <small className="chip-you">You</small>}
      </span>
      <span className="prow-meta">
        {!p.connected && <Icon name="offline" className="t-warn" title="Offline" />}
        {p.bot && <small className="mini-tag">Bot</small>}
        {p.voice && <Icon name={p.voice.muted ? 'micOff' : 'mic'} className={speaking ? 't-ok' : 'dim'} title={p.voice.muted ? 'In voice, mic muted' : 'In voice'} />}
        {p.role && <RoleTag role={p.role} />}
      </span>
    </li>
  );
}
