// Consistent line icons for the four roles (replaces emoji).
export default function RoleIcon({ role }) {
  const p = {
    width: '1em', height: '1em', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
    style: { verticalAlign: '-0.12em' },
  };
  let body;
  switch (role) {
    case 'MAFIA': // fedora
      body = <><path d="M6.5 16c0-5.5 1.6-9.5 5.5-9.5s5.5 4 5.5 9.5" /><path d="M6.7 12.8h10.6" /><path d="M2.5 16.2c1 1.6 4 2.6 9.5 2.6s8.5-1 9.5-2.6" /></>;
      break;
    case 'DOCTOR': // cross
      body = <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v9M7.5 12h9" /></>;
      break;
    case 'DETECTIVE': // magnifier
      body = <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5" /></>;
      break;
    default: // villager: candle
      body = <><rect x="9" y="11" width="6" height="9" rx="1" /><path d="M12 3.5c1.8 2.2 2.2 3.8 0 5.8-2.2-2-1.8-3.6 0-5.8z" /><path d="M7 20.5h10" /></>;
  }
  return <svg {...p}>{body}</svg>;
}
