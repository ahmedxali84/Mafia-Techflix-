'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { VoiceManager } from './voice';

const PTT_KEY = 'KeyT';
const pref = (k, fallback) => {
  try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; }
};
const savePref = (k, v) => {
  try { localStorage.setItem(k, v); } catch {}
};
const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

// Ties the VoiceManager to the room state. mode: 'ptt' (push-to-talk) | 'open' (open mic).
export function useVoice(state) {
  const vm = useRef(null);
  const latest = useRef(state);
  const [, rerender] = useReducer((n) => n + 1, 0);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [mode, setModeState] = useState('ptt');
  latest.current = state;

  if (!vm.current && typeof window !== 'undefined') vm.current = new VoiceManager(rerender);
  const m = vm.current;

  async function join() {
    if (!m || m.active || m.starting) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      return setError('Voice needs a modern browser on https or localhost.');
    }
    setJoining(true);
    setError('');
    try {
      await m.start();
      if (!m.active) return; // left again while the mic prompt was open
      m.setTalking(pref('mafia_voice_mode', 'ptt') === 'open');
      savePref('mafia_voice', '1');
      if (latest.current) m.sync(latest.current);
    } catch (e) {
      setError(e?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : e?.name === 'NotFoundError' ? 'No microphone found.' : e?.message || 'Could not start voice.');
    } finally {
      setJoining(false);
      rerender();
    }
  }

  function leave() {
    savePref('mafia_voice', '0');
    m?.stop();
  }

  function setMode(next) {
    setModeState(next);
    savePref('mafia_voice_mode', next);
    m?.setTalking(next === 'open');
  }

  // Restore preferences and rejoin voice after a refresh.
  useEffect(() => {
    setModeState(pref('mafia_voice_mode', 'ptt'));
    return () => m?.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = !!state;
  useEffect(() => {
    if (ready && pref('mafia_voice', '0') === '1') join();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply routing on every state; rejoin if the server dropped us (reconnect).
  useEffect(() => {
    if (!m || !state || !m.active) return;
    const mine = state.players.find((p) => p.id === state.you.id)?.voice;
    if (mine?.session !== m.session && state.serverNow > m.joinedAt) {
      m.stop({ notify: false });
      join();
      return;
    }
    m.sync(state);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Let go of push-to-talk whenever who-hears-you changes (e.g. night falls while holding).
  const channel = state?.you.voice?.channel ?? null;
  useEffect(() => {
    if (mode === 'ptt') m?.setTalking(false);
  }, [channel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push-to-talk on the keyboard (ignored while typing in chat).
  useEffect(() => {
    if (mode !== 'ptt' || !m) return;
    const down = (e) => {
      if (e.code === PTT_KEY && !e.repeat && !typing(e.target)) m.setTalking(true);
    };
    const up = (e) => e.code === PTT_KEY && m.setTalking(false);
    const blur = () => m.setTalking(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [mode, m]);

  return {
    supported: !!m,
    active: !!m?.active,
    joining,
    error,
    mode,
    setMode,
    join,
    leave,
    talking: !!m?.talking,
    setTalking: (on) => m?.setTalking(on),
    muted: !!m?.muted,
    setMuted: (on) => m?.setMuted(on),
    deafened: !!m?.deafened,
    setDeafened: (on) => m?.setDeafened(on),
    speaking: m?.speaking || new Set(),
    blocked: m?.blocked || new Set(),
    setBlocked: (id, on) => m?.setBlocked(id, on),
    volumeOf: (id) => m?.volumes[id] ?? 1,
    setVolume: (id, v) => m?.setVolume(id, v),
    blockedAutoplay: !!m?.blockedAutoplay,
    resumeAudio: () => m?.resumeAudio(),
    connectionOf: (id) => m?.connectionOf(id),
  };
}
