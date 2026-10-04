import { io } from 'socket.io-client';

export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';

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
