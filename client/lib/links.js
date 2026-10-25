// Community links. Set NEXT_PUBLIC_DISCORD_URL (Vercel > Settings > Environment Variables, or
// client/.env.local) to the server's invite link. Only real Discord invite links are accepted,
// so a typo can't send players to some other site; without one the Discord buttons stay hidden.
const DISCORD_INVITE = /^https:\/\/(discord\.gg|(www\.)?discord\.com\/invite)\/[A-Za-z0-9-]{2,32}\/?$/;

export function discordUrl(value = process.env.NEXT_PUBLIC_DISCORD_URL) {
  const url = String(value || '').trim();
  return DISCORD_INVITE.test(url) ? url : null;
}

export const DISCORD_URL = discordUrl();
