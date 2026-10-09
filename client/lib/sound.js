// Tiny synthesized sound engine (Web Audio) — no asset files needed.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('mafia_muted') === '1'; } catch {}

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.08, slideTo } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SOUNDS = {
  click: () => tone(660, 0, 0.07, { type: 'triangle', gain: 0.05 }),
  select: () => { tone(520, 0, 0.06, { type: 'triangle' }); tone(780, 0.05, 0.08, { type: 'triangle' }); },
  whisper: () => { tone(420, 0, 0.25, { type: 'sine', gain: 0.035, slideTo: 300 }); tone(560, 0.08, 0.3, { type: 'sine', gain: 0.025, slideTo: 380 }); },
  message: () => tone(900, 0, 0.06, { gain: 0.03 }),
  tick: () => tone(1000, 0, 0.05, { type: 'square', gain: 0.025 }),
  reveal: () => { tone(220, 0, 0.5, { type: 'sawtooth', gain: 0.04, slideTo: 440 }); tone(660, 0.35, 0.5, { gain: 0.06 }); },
  night: () => { tone(330, 0, 0.9, { gain: 0.06, slideTo: 165 }); tone(247, 0.2, 1.1, { gain: 0.05, slideTo: 123 }); },
  day: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.5, { gain: 0.06 })); },
  death: () => { tone(300, 0, 0.7, { type: 'sawtooth', gain: 0.07, slideTo: 60 }); tone(90, 0.1, 0.8, { type: 'sine', gain: 0.1 }); },
  saved: () => { tone(660, 0, 0.2); tone(990, 0.15, 0.4); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.55, { gain: 0.07 })); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.2, 0.6, { type: 'triangle', gain: 0.07 })); },
};

export function play(name) {
  if (muted) return;
  try { SOUNDS[name]?.(); } catch {}
}

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  try { localStorage.setItem('mafia_muted', v ? '1' : '0'); } catch {}
}
