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

// A burst of filtered white noise (gunshots, impacts). `type` picks the filter and `sweepTo`
// glides its frequency (a rising highpass sounds like paper tearing, a bandpass like a whoosh).
function noise(start, dur, { gain = 0.3, freq = 1800, q = 0.7, type = 'lowpass', sweepTo, decay = 3 } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
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
  gunshot: () => { noise(0, 0.35, { gain: 0.45, freq: 2600 }); noise(0.01, 0.9, { gain: 0.25, freq: 380 }); tone(70, 0, 0.5, { gain: 0.12, slideTo: 40 }); },
  stamp: () => { noise(0, 0.18, { gain: 0.35, freq: 700 }); tone(110, 0, 0.25, { gain: 0.12, slideTo: 60 }); },
  // The Doctor's save: a shield ring, then a rising healing shimmer.
  saved: () => {
    tone(392, 0, 0.9, { type: 'triangle', gain: 0.06 });
    tone(784, 0, 0.7, { gain: 0.04 });
    noise(0, 0.25, { gain: 0.12, type: 'highpass', freq: 5000 });
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18 + i * 0.09, 0.55, { gain: 0.05 }));
    noise(0.25, 0.9, { gain: 0.05, type: 'bandpass', freq: 3000, sweepTo: 9000, q: 1.2, decay: 1 });
  },
  // Kill cinematic, timed to the CSS in cards.css (.kill-*):
  crack: () => { [0, 0.035, 0.08].forEach((s) => noise(s, 0.06, { gain: 0.18, type: 'highpass', freq: 3500 })); },
  tear: () => { noise(0, 0.55, { gain: 0.32, type: 'highpass', freq: 900, sweepTo: 4500, q: 0.9, decay: 0.6 }); tone(140, 0, 0.3, { type: 'sawtooth', gain: 0.03, slideTo: 90 }); },
  toll: () => { tone(98, 0, 2.2, { gain: 0.11 }); tone(196, 0, 1.6, { gain: 0.04 }); tone(293, 0.02, 1.2, { gain: 0.025 }); },
  whoosh: () => noise(0, 0.7, { gain: 0.16, type: 'bandpass', freq: 400, sweepTo: 2200, q: 1.4, decay: 1.2 }),
  thud: () => { tone(80, 0, 0.35, { gain: 0.14, slideTo: 45 }); noise(0, 0.2, { gain: 0.2, freq: 300 }); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.55, { gain: 0.07 })); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.2, 0.6, { type: 'triangle', gain: 0.07 })); },
};

let lastPlayed = 0;
export function play(name) {
  if (muted) return;
  lastPlayed = Date.now();
  try { SOUNDS[name]?.(); } catch {}
}

// For the global button-click sound: skip it when the button's own handler already made a sound.
export const playedRecently = (ms = 80) => Date.now() - lastPlayed < ms;

export const isMuted = () => muted;
export function setMuted(v) {
  muted = v;
  try { localStorage.setItem('mafia_muted', v ? '1' : '0'); } catch {}
}
