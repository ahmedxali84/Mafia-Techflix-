// Community links. The team's Discord server ("Mafia Web Game", never-expiring invite) is the
// default; NEXT_PUBLIC_DISCORD_URL (Vercel > Settings > Environment Variables, or client/.env.local)
// overrides it. Only real Discord invite links are accepted, so a typo can't send players to some
// other site; an invalid value hides the Discord buttons.
const DISCORD_INVITE = /^https:\/\/(discord\.gg|(www\.)?discord\.com\/invite)\/[A-Za-z0-9-]{2,32}\/?$/;
export const DEFAULT_DISCORD_URL = 'https://discord.gg/SCaPFuzkGp';

export function discordUrl(value = process.env.NEXT_PUBLIC_DISCORD_URL || DEFAULT_DISCORD_URL) {
  const url = String(value || '').trim();
  return DISCORD_INVITE.test(url) ? url : null;
}

export const DISCORD_URL = discordUrl();
