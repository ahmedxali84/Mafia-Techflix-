import { CARDS, roleInfo } from '@/lib/roles';

// A role's illustrated card in the shared frame. `size`: 'lg' (reveal), 'md', 'sm' (lists).
// Unknown roles (or no art) fall back to the role's icon on a plain card.
export default function RoleCard({ role, size = 'md', className = '', dead = false, alt }) {
  const card = CARDS[role];
  const info = roleInfo(role);
  return (
    <figure
      className={`rcard rcard-${size} tone-${info.tone} ${dead ? 'dead' : ''} ${className}`}
      style={{ '--ar': card ? card.ar : 0.64 }}
    >
      {card ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={size === 'sm' ? card.thumb : card.src} alt={alt ?? `${info.label} card`} width={720} height={Math.round(720 / card.ar)} decoding="async" loading={size === 'sm' ? 'lazy' : undefined} draggable={false} />
      ) : (
        <span className="rcard-fallback">{info.label}</span>
      )}
      <span className="rcard-sheen" aria-hidden="true" />
    </figure>
  );
}

// The face-down side: shared by every role so the back gives nothing away.
export function CardBack({ size = 'md', className = '' }) {
  return (
    <div className={`rcard rcard-${size} rcard-back ${className}`} aria-hidden="true">
      <svg className="rcard-back-art" viewBox="0 0 200 310" preserveAspectRatio="none">
        <defs>
          <pattern id="rcb-lattice" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <path d="M0 7h14M7 0v14" stroke="rgba(224,168,74,0.07)" strokeWidth="1" />
          </pattern>
          <radialGradient id="rcb-glow" cx="50%" cy="46%" r="60%">
            <stop offset="0" stopColor="#4a0d12" />
            <stop offset="1" stopColor="#120406" />
          </radialGradient>
        </defs>
        <rect width="200" height="310" fill="url(#rcb-glow)" />
        <rect width="200" height="310" fill="url(#rcb-lattice)" />
        <rect x="9" y="9" width="182" height="292" rx="6" fill="none" stroke="rgba(224,168,74,0.55)" strokeWidth="1.2" />
        <rect x="15" y="15" width="170" height="280" rx="4" fill="none" stroke="rgba(224,168,74,0.22)" strokeWidth="0.8" />
        {[[15, 15, 1, 1], [185, 15, -1, 1], [15, 295, 1, -1], [185, 295, -1, -1]].map(([x, y, sx, sy]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y + 26 * sy}V${y}H${x + 26 * sx}M${x + 6 * sx} ${y + 14 * sy}l${8 * sx} ${-8 * sy}`} fill="none" stroke="rgba(224,168,74,0.6)" strokeWidth="1.2" />
        ))}
        <g transform="translate(100 140)" fill="none" stroke="#e0a84a" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M0 -58L58 0L0 58L-58 0Z" stroke="rgba(224,168,74,0.35)" />
          <path d="M0 -44L44 0L0 44L-44 0Z" stroke="rgba(224,168,74,0.6)" />
          <path d="M-22 10l-4-22 13 11 13-18 13 18 13-11-4 22z" fill="rgba(224,168,74,0.14)" />
          <path d="M-22 16h44" />
        </g>
        <text x="100" y="236" textAnchor="middle" fill="#e0a84a" fontFamily="Cinzel, Georgia, serif" fontWeight="700" fontSize="19" letterSpacing="7">MAFIA</text>
        <path d="M66 248h68" stroke="rgba(224,168,74,0.45)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
