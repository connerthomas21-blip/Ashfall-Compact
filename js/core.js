'use strict';
/* ============================== CORE: constants, state, save, input, scene manager, loop ============================== */

const W = 480, H = 270, TILE = 16;   // logical view size; the canvas is scaled to fit and drawn at device resolution
const SAVE_KEY = 'ashfall-save-v1';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clone = o => JSON.parse(JSON.stringify(o));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Saved state (S) and runtime state (G) ---------- */
// S is everything that persists. Story flags live in S.flags (sacrificed_thyken, mariveth_name_source, ...).
const fresh = () => ({
  v: 1, scene: 'escape', flags: {}, lead: 'raiden',
  party: { raiden: { alive: true }, ichabod: { alive: true }, kieran: { alive: true } },
  will: true, playtime: 0,
});
let S = null;
// G is per-session: current scene object, room, actors, pause, overlay text.
const G = { scene: null, sceneId: null, room: null, paused: false, menu: false, say: null, time: 0, cam: { x: 0, y: 0 } };

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function loadSaved() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function encodeSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function decodeSave(code) {
  const s = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (!s || s.v !== 1 || !s.party) throw new Error('bad save');
  return Object.assign(fresh(), s);
}
const flag = k => S && S.flags[k];
const setFlag = (k, v = true) => { S.flags[k] = v; };

/* ---------- Input ---------- */
// keys: held; pressed: went down this frame. Keys are KeyboardEvent.code values.
const keys = new Set(), pressed = new Set();
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);
addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  if (!keys.has(e.code)) pressed.add(e.code);
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = (...c) => c.some(k => keys.has(k));
const hit = (...c) => c.some(k => pressed.has(k));

/* ---------- Scene manager ---------- */
// A scene is { room?, enter(opts), update(dt), draw(ctx), exit() }. Every scene change auto-saves.
const SCENES = {};
function go(id, opts = {}) {
  if (G.scene && G.scene.exit) G.scene.exit();
  G.sceneId = id; G.scene = SCENES[id]; G.say = null; G.paused = false;
  if (S && !opts.noSave) { S.scene = id; save(); }
  G.scene.enter(opts);
  renderUI();
}

/* ---------- Main loop ---------- */
let last = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  G.time += dt;
  if (G.scene) {
    const frozen = G.paused || G.menu || G.say;
    if (!frozen) { G.scene.update(dt); if (S) S.playtime += dt; }
    uiKeys();
    draw();
  }
  pressed.clear();
  requestAnimationFrame(frame);
}
