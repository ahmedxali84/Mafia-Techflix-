import Avatar from './Avatar';
import RoleIcon from './RoleIcon';

export const ROLE_INFO = {
  MAFIA: { icon: <span className="role-ico"><RoleIcon role="MAFIA" /></span>, label: 'Mafia', blurb: 'Each night, choose a player to eliminate with your team. Stay hidden by day.' },
  VILLAGER: { icon: <span className="role-ico"><RoleIcon role="VILLAGER" /></span>, label: 'Villager', blurb: 'You have no night power. Find the Mafia by talking and voting.' },
  DOCTOR: { icon: <span className="role-ico"><RoleIcon role="DOCTOR" /></span>, label: 'Doctor', blurb: 'Each night, protect one player from being killed. You may protect yourself.' },
  DETECTIVE: { icon: <span className="role-ico"><RoleIcon role="DETECTIVE" /></span>, label: 'Detective', blurb: 'Each night, investigate one player to learn whether they are Mafia.' },
};

export default function PlayerCard({ player, isYou, isHost, selected, onClick, disabled, badge, compact, speaking }) {
  const dead = !player.alive;
  const role = player.role ? ROLE_INFO[player.role] : null;
  const interactive = !!onClick && !disabled;
  return (
    <button
      type="button"
      data-tilt={interactive ? 8 : undefined}
      className={`player ${speaking ? 'speaking' : ''} ${compact ? 'compact' : ''} ${dead ? 'dead' : ''} ${selected ? 'selected' : ''} ${interactive ? 'pickable' : ''}`}
      onClick={onClick}
      disabled={!interactive}
      aria-pressed={onClick ? !!selected : undefined}
    >
      <Avatar name={player.name} size={compact ? 34 : 42} dead={dead} />
      <span className="pname">
        <span className="pname-text">{player.name}</span>
        {isYou && <em>you</em>}
        {isHost && <span title="Host">👑</span>}
      </span>
      <span className="pmeta">
        {!player.connected && <span className="tag warn">offline</span>}
        {player.bot && <span className="tag">bot</span>}
        {player.voice && <span className="tag voice" title={player.voice.muted ? 'In voice, mic muted' : 'In voice'}>{player.voice.muted ? '🔇' : '🎙️'}</span>}
        {role && <span className={`tag role ${player.role}`}>{role.icon} {role.label}</span>}
        {badge}
      </span>
    </button>
  );
}
