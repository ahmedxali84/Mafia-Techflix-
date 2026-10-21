import { Barlow_Condensed, Cinzel, Inter } from 'next/font/google';
import './globals.css';
import './game.css';
import './cards.css';

const display = Cinzel({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-display' });
const hud = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-hud' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: 'Mafia — play with friends',
  description: 'A real-time multiplayer Mafia game. Hidden roles, night kills, day votes. No download needed.',
  openGraph: { title: 'Mafia', description: 'Play Mafia with friends in your browser.' },
};

// `resizes-content`: when the phone keyboard opens, the page shrinks above it, so the chat box stays visible.
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#070405', interactiveWidget: 'resizes-content' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${hud.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
