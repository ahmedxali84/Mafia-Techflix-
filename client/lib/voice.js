// Real-time voice over WebRTC (peer-to-peer mesh). The server relays signaling and decides
// who may hear whom (state.you.voice); this class owns the mic, the peer connections and
// the level meters. See docs/VOICE.md.
import { socket, emit } from './socket';

const SPEAKING_LEVEL = 0.025; // RMS above this counts as talking
const LEVEL_EVERY_MS = 120;
const STUCK_MS = 15000; // a connection that is not up after this long is rebuilt

const rid = () => Math.random().toString(36).slice(2, 10);

export class VoiceManager {
  constructor(onChange) {
    this.onChange = onChange;
    // playerId -> { session, pcId, pc, sender, audio, meter, initiator, pending, since, okAt }
    this.peers = new Map();
    this.stream = null;
    this.track = null;
    this.session = null;
    this.starting = null; // in-flight start() promise
    this.gen = 0; // bumps on stop() so a start() that is still running knows it was cancelled
    this.iceServers = [];
    this.myId = null;
    this.lastState = null;
    this.route = { sendTo: [], hearFrom: [] };
    this.talking = false; // push-to-talk held / open mic on
    this.muted = false;
    this.deafened = false;
    this.volumes = {}; // playerId -> 0..1
    this.blocked = new Set(); // players I muted locally
    this.speaking = new Set();
    this.blockedAutoplay = false;
    this.onSignal = (m) => this.handleSignal(m);
  }

  get active() {
    return !!this.session;
  }

  start() {
    if (this.session) return Promise.resolve();
    if (!this.starting) this.starting = this.doStart().finally(() => (this.starting = null));
    return this.starting;
  }

  async doStart() {
    const gen = this.gen;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    if (gen !== this.gen) return stream.getTracks().forEach((t) => t.stop()); // left while asking for the mic
    this.stream = stream;
    this.track = stream.getAudioTracks()[0];
    this.applyMic();
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.localMeter = this.meter(stream);
    socket.on('voice_signal', this.onSignal);
    const res = await emit('voice_join');
    if (gen !== this.gen) return;
    if (res?.error) {
      this.stop({ notify: false });
      throw new Error(res.error);
    }
    this.session = res.session;
    this.joinedAt = res.at || 0; // server time; older room states don't know this session yet
    this.iceServers = res.iceServers || [];
    if (this.muted) emit('voice_mute', { muted: true }); // the server forgets it on rejoin
    this.timer = setInterval(() => this.tick(), LEVEL_EVERY_MS);
    this.onChange();
  }

  stop({ notify = true } = {}) {
    this.gen++;
    socket.off('voice_signal', this.onSignal);
    for (const id of [...this.peers.keys()]) this.closePeer(id);
    clearInterval(this.timer);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close().catch(() => {});
    this.stream = this.track = this.ctx = this.localMeter = null;
    if (notify && this.session) emit('voice_leave');
    this.session = null;
    this.speaking = new Set();
    this.onChange();
  }

  // Called with every room state: opens/closes connections and applies the routing rules.
  sync(state) {
    if (!this.session || !state) return;
    this.lastState = state;
    this.myId = state.you.id;
    this.route = state.you.voice || { sendTo: [], hearFrom: [] };
    const wanted = new Map(
      state.players.filter((p) => p.id !== this.myId && p.voice && p.connected).map((p) => [p.id, p.voice.session])
    );
    for (const [id, peer] of this.peers) {
      // Ignore states older than the connection: they may not know this peer yet.
      if (wanted.get(id) !== peer.session && state.serverNow > peer.since) this.closePeer(id);
    }
    for (const [id, session] of wanted) {
      // The smaller id makes the offer, so both sides never offer at once.
      if (!this.peers.has(id) && this.myId < id) this.call(id, session, state.serverNow);
    }
    this.applyRouting();
  }

  // ── Peer connections ──
  newPeer(id, { session, pcId, initiator, since }) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer = { session, pcId, pc, sender: null, audio: new Audio(), meter: null, initiator, pending: [], since, okAt: Date.now() };
    peer.audio.autoplay = true;
    pc.onicecandidate = (e) => e.candidate && this.signal(id, { candidate: e.candidate.toJSON() });
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      peer.audio.srcObject = stream;
      peer.audio.play().catch(() => {
        this.blockedAutoplay = true;
        this.onChange();
      });
      peer.meter?.src.disconnect();
      peer.meter = this.meter(stream);
      this.applyRouting();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && peer.initiator) this.offer(id, { iceRestart: true });
      this.onChange();
    };
    this.peers.set(id, peer);
    return peer;
  }

  async call(id, session, since) {
    const peer = this.newPeer(id, { session, pcId: rid(), initiator: true, since });
    const tr = peer.pc.addTransceiver('audio', { direction: 'sendrecv', streams: [this.stream] });
    peer.sender = tr.sender;
    this.applyRouting();
    await this.offer(id);
  }

  async offer(id, opts) {
    const peer = this.peers.get(id);
    if (!peer) return;
    try {
      const offer = await peer.pc.createOffer(opts);
      await peer.pc.setLocalDescription(offer);
      this.signal(id, { sdp: peer.pc.localDescription.toJSON() });
    } catch (e) {
      console.warn('voice offer failed', e);
    }
  }

  async handleSignal({ from, fromSession, data, at } = {}) {
    if (!this.session || !data || !from) return;
    let peer = this.peers.get(from);
    const same = peer && peer.session === fromSession && peer.pcId === data.pcId;
    try {
      if (data.sdp?.type === 'offer') {
        // A new connection id means the other side rebuilt the call: replace ours.
        if (peer && !same) this.closePeer(from), (peer = null);
        if (!peer) peer = this.newPeer(from, { session: fromSession, pcId: data.pcId, initiator: false, since: at || 0 });
        await peer.pc.setRemoteDescription(data.sdp);
        const tr = peer.pc.getTransceivers().find((t) => t.receiver.track.kind === 'audio');
        if (tr) {
          tr.direction = 'sendrecv';
          peer.sender = tr.sender;
          tr.sender.setStreams?.(this.stream);
        }
        this.applyRouting();
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        this.signal(from, { sdp: peer.pc.localDescription.toJSON() });
      } else if (!same) {
        return; // answer / candidate for a connection we no longer have
      } else if (data.sdp?.type === 'answer') {
        if (peer.pc.signalingState === 'have-local-offer') await peer.pc.setRemoteDescription(data.sdp);
      } else if (data.candidate) {
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(data.candidate);
        else peer.pending.push(data.candidate);
      }
      if (this.peers.get(from) === peer && peer.pc.remoteDescription && peer.pending.length) {
        for (const c of peer.pending.splice(0)) await peer.pc.addIceCandidate(c);
      }
    } catch (e) {
      console.warn('voice signal failed', e);
    }
  }

  signal(id, data) {
    const peer = this.peers.get(id);
    if (peer) socket.emit('voice_signal', { to: id, toSession: peer.session, data: { ...data, pcId: peer.pcId } });
  }

  closePeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    peer.pc.close();
    peer.meter?.src.disconnect();
    peer.audio.srcObject = null;
    this.peers.delete(id);
    this.speaking.delete(id);
  }

  // ── Who hears what ──
  applyMic() {
    if (this.track) this.track.enabled = this.talking && !this.muted;
  }

  applyRouting() {
    for (const [id, peer] of this.peers) {
      const send = this.route.sendTo.includes(id);
      // Only feed my mic to players the server says may hear me right now.
      if (peer.sender && peer.pc.signalingState !== 'closed' && (peer.sender.track === this.track) !== send) {
        peer.sender.replaceTrack(send ? this.track : null).catch(() => {});
      }
      const hear = this.route.hearFrom.includes(id) && !this.deafened && !this.blocked.has(id);
      peer.audio.muted = !hear;
      peer.audio.volume = this.volumes[id] ?? 1;
    }
    this.onChange();
  }

  setTalking(on) {
    if (this.talking === on) return;
    this.talking = on;
    this.applyMic();
    this.onChange();
  }

  setMuted(on) {
    this.muted = on;
    this.applyMic();
    if (this.session) emit('voice_mute', { muted: on });
    this.onChange();
  }

  setDeafened(on) {
    this.deafened = on;
    this.applyRouting();
  }

  setBlocked(id, on) {
    if (on) this.blocked.add(id);
    else this.blocked.delete(id);
    this.applyRouting();
  }

  setVolume(id, v) {
    this.volumes[id] = v;
    this.applyRouting();
  }

  // Retries playback after the browser blocked autoplay (needs a click).
  resumeAudio() {
    this.blockedAutoplay = false;
    this.ctx?.resume();
    for (const p of this.peers.values()) p.audio.play().catch(() => {});
    this.onChange();
  }

  // ── Level meters (speaking indicators) + self-healing ──
  meter(stream) {
    if (!this.ctx) return null;
    const a = this.ctx.createAnalyser();
    a.fftSize = 512;
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(a);
    return { a, src, buf: new Float32Array(a.fftSize) };
  }

  level(m) {
    if (!m) return 0;
    m.a.getFloatTimeDomainData(m.buf);
    let sum = 0;
    for (const v of m.buf) sum += v * v;
    return Math.sqrt(sum / m.buf.length);
  }

  tick() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    const now = Date.now();
    let rebuilt = false;
    for (const [id, peer] of this.peers) {
      if (peer.pc.connectionState === 'connected') peer.okAt = now;
      else if (now - peer.okAt > STUCK_MS) {
        // Never connected / dropped for too long: start over (the offering side calls again).
        this.closePeer(id);
        rebuilt = true;
      }
    }
    if (rebuilt && this.lastState) this.sync({ ...this.lastState, serverNow: 0 });

    const next = new Set();
    const live = this.track?.enabled && this.route.sendTo.length > 0;
    if (live && this.level(this.localMeter) > SPEAKING_LEVEL) next.add(this.myId);
    for (const [id, peer] of this.peers) {
      if (!peer.audio.muted && this.level(peer.meter) > SPEAKING_LEVEL) next.add(id);
    }
    const changed = next.size !== this.speaking.size || [...next].some((id) => !this.speaking.has(id));
    if (changed) {
      this.speaking = next;
      this.onChange();
    }
  }

  connectionOf(id) {
    return this.peers.get(id)?.pc.connectionState || null;
  }
}
