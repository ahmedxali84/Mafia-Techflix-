import { io } from 'socket.io-client';

// NEXT_PUBLIC_SERVER_URL wins; otherwise production builds use the deployed backend.
// A localhost value can't work on a deployed site, so production ignores it.
const DEPLOYED_SERVER = 'https://mafia-backend-z04f.onrender.com';
const PROD = process.env.NODE_ENV === 'production';
const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL;
const usable = fromEnv && !(PROD && /localhost|127\.0\.0\.1/.test(fromEnv));
export const SERVER_URL = (usable ? fromEnv : PROD ? DEPLOYED_SERVER : 'http://localhost:4000').replace(/\/$/, '');

export const socket = io(SERVER_URL, {
  autoConnect: false,
});

// A stable id per browser so a refresh gets the same seat back.
export function getPlayerId() {
  let id = localStorage.getItem('mafia_player_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('mafia_player_id', id);
  }
  return id;
}

export const getName = () => localStorage.getItem('mafia_name') || '';
export const setName = (n) => localStorage.setItem('mafia_name', n);

export function emit(event, data) {
  return new Promise((resolve) => socket.emit(event, data, resolve));
}
