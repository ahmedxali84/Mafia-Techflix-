'use client';
import { useEffect, useRef, useState } from 'react';
import { socket, emit, getPlayerId, getName } from './socket';

// Connects to a room (and re-connects after refresh / network drops).
// status: 'joining' | 'need_name' | 'ready' | 'error'
export function useRoom(code) {
  const [status, setStatus] = useState('joining');
  const [error, setError] = useState('');
  const [state, setState] = useState(null);
  const [chat, setChat] = useState([]);
  const [online, setOnline] = useState(true);
  const joined = useRef(false);

  async function join(name) {
    const res = await emit('join_room', { code, playerId: getPlayerId(), name: name ?? getName() });
    if (res.error === 'NAME_REQUIRED') return setStatus('need_name');
    if (res.error) {
      setError(res.error);
      return setStatus('error');
    }
    joined.current = true;
    setStatus('ready');
  }

  useEffect(() => {
    const onState = (st) => {
      setState(st);
      setChat(st.chat);
    };
    const onChat = (m) => setChat((c) => (c.some((x) => x.id === m.id) ? c : [...c, m].slice(-200)));
    const onConnect = () => {
      setOnline(true);
      join();
    };
    const onDisconnect = () => setOnline(false);

    socket.on('state', onState);
    socket.on('chat_message', onChat);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.off('state', onState);
      socket.off('chat_message', onChat);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.disconnect();
      joined.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return { status, error, state, chat, online, join };
}
