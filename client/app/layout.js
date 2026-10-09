import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import TiltLayer from '@/components/TiltLayer';

const display = Cinzel({ subsets: ['latin'], weight: ['600', '800'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: 'Mafia — play with friends',
  description: 'A real-time multiplayer Mafia game. Hidden roles, night kills, day votes. No download needed.',
  openGraph: { title: 'Mafia', description: 'Play Mafia with friends in your browser.' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#070405' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <TiltLayer />
        {children}
      </body>
    </html>
  );
}
