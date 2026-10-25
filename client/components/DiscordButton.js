import { DISCORD_URL } from '@/lib/links';

// Discord's mark (simplified), drawn in currentColor.
function DiscordMark() {
  return (
    <svg className="ic" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="currentColor">
      <path d="M19.3 5.3A16.6 16.6 0 0 0 15.2 4l-.5 1a15.4 15.4 0 0 0-5.4 0l-.5-1a16.6 16.6 0 0 0-4.1 1.3C2.1 9.2 1.4 13 1.7 16.8a16.7 16.7 0 0 0 5 2.5l1.1-1.7c-.6-.2-1.2-.5-1.7-.8l.4-.3a11.9 11.9 0 0 0 10.9 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.7 16.7 0 0 0 5-2.5c.4-4.4-.7-8.2-2.9-11.5zM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2z" />
    </svg>
  );
}

// Opens the community Discord in a new tab. Renders nothing until NEXT_PUBLIC_DISCORD_URL is set.
// `variant`: 'icon' (square top-bar button), 'block' (full-width) or default (inline button).
export default function DiscordButton({ variant, label = 'Join our Discord', className = '' }) {
  if (!DISCORD_URL) return null;
  const cls = variant === 'icon' ? `hud-btn b-discord-icon ${className}` : `b b-discord ${variant === 'block' ? 'b-block' : ''} ${className}`;
  return (
    <a className={cls} href={DISCORD_URL} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
      <DiscordMark />
      {variant !== 'icon' && <span>{label}</span>}
    </a>
  );
}
