'use strict';
/* ============================== AUDIO: procedural ambience and sound hooks ==============================
  Everything is synthesised (no files). The context starts on the first key press or click, as browsers require.
  ambience(kind): 'cavern' | 'library' | 'deep' | null. Low rumble always; settling earth and paper in the Library;
  a slow ember breath near the fissure. sfx(name) is the hook combat and story beats call; M toggles mute.
*/
const AU = { ctx: null, master: null, bed: null, kind: null, timer: 0, muted: false };
try { AU.muted = localStorage.getItem('ashfall-mute') === '1'; } catch (e) {}

function audioInit() {
  if (AU.ctx) return;
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  AU.ctx = new C();
  AU.master = AU.ctx.createGain(); AU.master.gain.value = AU.muted ? 0 : 0.7; AU.master.connect(AU.ctx.destination);
  // Shared brown-noise buffer, reused by every noise voice.
  const n = AU.ctx.sampleRate * 3, buf = AU.ctx.createBuffer(1, n, AU.ctx.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  AU.brown = buf;
  const wbuf = AU.ctx.createBuffer(1, AU.ctx.sampleRate, AU.ctx.sampleRate), w = wbuf.getChannelData(0);
  for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;
  AU.white = wbuf;
  if (AU.pending !== undefined) ambience(AU.pending);
}
addEventListener('keydown', audioInit, { once: false });
addEventListener('pointerdown', audioInit, { once: false });

function setMuted(m) {
  AU.muted = m; try { localStorage.setItem('ashfall-mute', m ? '1' : '0'); } catch (e) {}
  if (AU.master) AU.master.gain.setTargetAtTime(m ? 0 : 0.7, AU.ctx.currentTime, 0.1);
}

function noise(buf, { filter = 'lowpass', freq = 200, q = 0.7, gain = 0.2, dur = null, attack = 0.02, loop = false, dest = AU.master }) {
  const a = AU.ctx, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
  src.buffer = buf; src.loop = loop;
  f.type = filter; f.frequency.value = freq; f.Q.value = q;
  src.connect(f); f.connect(g); g.connect(dest);
  if (dur) {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t, Math.random() * 2); src.stop(t + dur + 0.05);
  } else { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 2); src.start(t, Math.random() * 2); }
  return { src, g, f };
}

// Bed: a continuous rumble, swapped per scene with a slow crossfade.
function ambience(kind) {
  AU.pending = kind;
  if (!AU.ctx || AU.kind === kind) return;
  AU.kind = kind;
  if (AU.bed) { const old = AU.bed; old.g.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.6); setTimeout(() => { try { old.src.stop(); } catch (e) {} }, 3000); AU.bed = null; }
  if (!kind) return;
  AU.bed = noise(AU.brown, { freq: kind === 'deep' ? 110 : 70, gain: kind === 'deep' ? 0.32 : 0.22, loop: true });
  AU.timer = 2;
}

// Called every frame: occasional one-shots on top of the bed.
function audioTick(dt) {
  if (!AU.ctx || !AU.kind || AU.muted) return;
  AU.timer -= dt;
  if (AU.timer > 0) return;
  AU.timer = rnd(3, 9);
  const k = AU.kind, r = Math.random();
  if (r < 0.45) sfx('settle');
  else if (k === 'library') sfx('paper');
  else if (k === 'deep') sfx('ember');
  else sfx('drip');
}

const SFX = {
  settle: () => noise(AU.brown, { freq: 260, gain: 0.25, dur: rnd(1.2, 2.4), attack: 0.4 }),                 // earth shifting somewhere
  paper: () => { for (let i = 0; i < 3; i++) setTimeout(() => AU.ctx && noise(AU.white, { filter: 'bandpass', freq: rnd(2500, 4200), q: 1.2, gain: 0.03, dur: rnd(0.08, 0.18) }), i * rnd(60, 140)); },
  ember: () => noise(AU.brown, { filter: 'bandpass', freq: 380, q: 0.6, gain: 0.16, dur: 3, attack: 1.4 }),     // the fissure breathing
  drip: () => {
    const a = AU.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'sine'; o.frequency.setValueAtTime(rnd(900, 1300), t); o.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + 0.3);
  },
  doors: () => noise(AU.brown, { freq: 140, gain: 0.6, dur: 2.6, attack: 0.3 }),
  seal: () => {
    const a = AU.ctx, o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = 'triangle'; o.frequency.value = 196;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + 2.3);
  },
  thud: () => noise(AU.brown, { freq: 90, gain: 0.5, dur: 0.5, attack: 0.01 }),
};
function sfx(name) { if (AU.ctx && !AU.muted && SFX[name]) try { SFX[name](); } catch (e) {} }
