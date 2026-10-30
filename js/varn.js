'use strict';
/* ============================== VARN: the boss (Scene 6, sacrifice path only) ==============================
  Real-time translation of the tabletop fight. Varn works on beats: every few seconds he takes an action
  (Obsidian Blade, Conjured Shard-Blades, Earthen Step, or advancing), and a moment later a free bonus beat
  (a shard dart, a short shift, or a floor crack that knocks a hero prone). He is never idle.
  Diamond Skin: the first time he is bloodied he crystallises and takes nothing for ~6 seconds, with a clear cue.
  From the halfway point, residual magic from the sacrifice arcs out of the floor, hurting everyone, Varn included,
  and growing each time: a rising clock. At 0 HP he does not die; the earth takes him back (flag varn_alive).
*/

const VARN = {
  hp: 1750,             // the spec's ~155 HP, scaled for real time (see ROADMAP); × PARTY_SCALE below
  armor: 0.3,           // stands in for AC 17
  r: 12, speed: 30,
  beat: 3.2,            // seconds between actions
  bonusDelay: 1.0,      // the free bonus beat after each action
  blade: { reach: 40, arc: 0.62, windup: 1.15, dmg: [32, 36], recover: 0.8 },
  shards: { cd: 16, n: 3, hp: 10, orbit: 24, dart: 5, near: 30, far: 135, cool: [3.5, 5] },
  step: { cd: 7, sink: 0.55 },
  crack: { windup: 0.85, r: 14, dmg: 4, prone: 1.0 },
  diamond: 6,
  arcs: { every: 3, base: 1, growEvery: 20, max: 5, varnMult: 8 },   // the sacrifice's magic bites Varn hardest
};
// Varn's HP by who is missing from the party (a lost hero weakens the party differently; tuned with test/varn.js).
const PARTY_SCALE = { none: 1, raiden: 0.55, ichabod: 0.53, kieran: 0.51 };

function makeVarn(x, y) {
  const gone = HERO_ORDER.filter(id => !S.party[id].alive), k = gone.length === 1 ? PARTY_SCALE[gone[0]] : gone.length ? 0.35 : PARTY_SCALE.none;
  const hp = Math.round(VARN.hp * k);
  const v = makeFoe('risen', x, y);
  Object.assign(v, {
    kind: 'varn', boss: true, name: 'Varn', def: { name: 'Varn', armor: VARN.armor, r: VARN.r, speed: VARN.speed, aggro: 999, windup: VARN.blade.windup, reach: VARN.blade.reach },
    r: VARN.r, hp, maxHp: hp, aggro: true, brain: varnBrain, draw: drawVarn, onZero: varnFalls,
    beat: 1.5, bonus: null, shardCd: 4, stepCd: VARN.step.cd, lastHit: null, diamondUsed: false, arcsOn: false, arcT: 0, arcN: 0, rise: 0,
  });
  return v;
}

/* ---------- Brain ---------- */
function varnBrain(v, dt) {
  if (v.sinking != null) return;
  v.shardCd -= dt; v.stepCd -= dt;
  // Diamond Skin, once, the first time he is bloodied.
  if (!v.diamondUsed && v.hp <= v.maxHp / 2) {
    v.diamondUsed = true; v.st.invuln = VARN.diamond; v.diamondT = VARN.diamond;
    floatText(v, 'Diamond Skin', '#cfe3e6', true); fxRing(v.x, v.y, '#cfe3e6', 30); sfx('diamond');
    if (!v.arcsOn) { v.arcsOn = true; v.arcT = 1.5; floatText(v, 'The floor wakes', PAL.ember); }
  }
  if (v.diamondT > 0) v.diamondT -= dt;
  if (v.arcsOn) residualArcs(v, dt);

  // A wind-up in progress
  if (v.state === 'windup') { v.t -= dt; faceTo(v, { x: v.x + v.aim.x, y: v.y + v.aim.y }); if (v.t <= 0) bladeStrike(v); return; }
  if (v.state === 'sink') {
    v.t -= dt;
    if (v.t <= 0) { const to = v.stepTo; v.x = to.x; v.y = to.y; v.state = 'rise'; v.t = 0.35; fxRing(v.x, v.y, PAL.dust, 22); burst(v.x, v.y, PAL.dust, 14); sfx('thud'); shake(1.4, 0.2); }
    return;
  }
  if (v.state === 'rise' || v.state === 'recover') { v.t -= dt; if (v.t <= 0) { v.state = 'chase'; } return; }

  // Bonus beat
  if (v.bonus != null) { v.bonus -= dt; if (v.bonus <= 0) { v.bonus = null; varnBonus(v); } }

  // Pick a target: he presses whoever his blade last hit, if they are still close; otherwise the nearest.
  const hs = liveHeroes(); if (!hs.length) return;
  const near = hs.reduce((a, b) => dist(v, a) <= dist(v, b) ? a : b);
  v.target = alive(v.lastHit) && dist(v, v.lastHit) < dist(v, near) + 40 ? v.lastHit : near;
  const t = v.target, d = dist(v, t);

  v.beat -= dt;
  if (v.beat <= 0) {
    v.beat = VARN.beat; v.bonus = VARN.bonusDelay;
    const shards = liveFoes().filter(e => e.shardOf === v).length;
    if (d <= VARN.blade.reach + t.r - 4) return bladeWindup(v, t);
    if (v.shardCd <= 0 && shards < VARN.shards.n) return conjureShards(v);
    // Close instantly on someone hanging back (usually Ichabod), or on the target if they are far.
    const back = hs.filter(h => dist(v, h) > 110).sort((a, b) => a.hp - b.hp)[0];
    if (v.stepCd <= 0 && (back || d > 90)) return earthenStep(v, back || t, 'behind');
  }
  if (d > VARN.blade.reach + t.r - 6) stepToward(v, t.x, t.y, VARN.speed, dt);
  else { v.moving = false; faceTo(v, t); }
}

function bladeWindup(v, t) {
  faceTo(v, t); v.aim = { ...v.face }; v.windupId = (v.windupId || 0) + 1; v.state = 'windup'; v.t = VARN.blade.windup; v.moving = false;
  v.def.windup = VARN.blade.windup; sfx('windup');
}
// Long reach, very heavy: everyone in the wedge is hit. After a hit that lands, he often steps away before the party can answer.
function bladeStrike(v) {
  const b = VARN.blade, an = Math.atan2(v.aim.y, v.aim.x);
  let landed = null;
  for (const h of liveHeroes()) {
    const dx = h.x - v.x, dy = h.y - v.y, d = Math.hypot(dx, dy);
    let da = Math.abs(Math.atan2(dy, dx) - an); if (da > Math.PI) da = 2 * Math.PI - da;
    if (d <= b.reach + h.r && da <= b.arc + h.r / Math.max(d, 1)) { if (hurt(h, roll(b.dmg), { big: true }) > 0 || h.st.guard) landed = landed || h; }
  }
  v.swing = { t: 0.25, big: true }; shake(2, 0.2); sfx('blade');
  v.state = 'recover'; v.t = b.recover;
  if (landed) { v.lastHit = landed.down ? null : landed; if (v.stepCd <= 0 && Math.random() < 0.6) { const far = farthestPoint(v); earthenStep(v, far, 'point'); } }
}
function conjureShards(v) {
  const n = VARN.shards.n - liveFoes().filter(e => e.shardOf === v).length;
  for (let i = 0; i < n; i++) {
    const s = makeFoe('risen', v.x, v.y);
    Object.assign(s, { kind: 'shard', shardOf: v, ghost: true, r: 3.2, hp: VARN.shards.hp, maxHp: VARN.shards.hp, def: { name: 'Shard', armor: 0, r: 3.2, aggro: 999 },
      aggro: true, orbitA: i / n * Math.PI * 2, brain: shardBrain, draw: drawShard, dartT: 0, home: null });
    G.enemies.push(s);
  }
  v.shardCd = VARN.shards.cd; v.state = 'recover'; v.t = 0.5;
  floatText(v, 'Shard-Blades', PAL.bone); sfx('seal');
}
// Earthen Step: sink, then rise somewhere else. mode 'behind' lands just past the target; 'point' lands on the point given.
function earthenStep(v, to, mode) {
  let p = to;
  if (mode === 'behind') { const d = dist(v, to) || 1; p = { x: to.x + (to.x - v.x) / d * 22, y: to.y + (to.y - v.y) / d * 22 }; }
  p = openSpot(p.x, p.y, v.r);
  v.stepTo = p; v.state = 'sink'; v.t = VARN.step.sink; v.stepCd = VARN.step.cd; v.moving = false;
  fxRing(v.x, v.y, PAL.dust, 20); burst(v.x, v.y, PAL.dust, 10); sfx('settle');
}
function varnBonus(v) {
  const r = Math.random(), shards = liveFoes().filter(e => e.shardOf === v && !e.dartT);
  const hs = liveHeroes(); if (!hs.length || v.state === 'sink') return;
  if (shards.length && r < 0.4) { const h = hs.reduce((a, b) => dist(v, a) <= dist(v, b) ? a : b); shardDart(shards[0], h); return; }
  if (r < 0.75) {   // floor crack under someone
    const h = hs[Math.floor(Math.random() * hs.length)];
    G.cracks = G.cracks || []; G.cracks.push({ x: h.x, y: h.y, t: VARN.crack.windup, from: { x: v.x, y: v.y } }); sfx('settle');
    return;
  }
  const side = { x: -v.face.y, y: v.face.x }, s = Math.random() < 0.5 ? 1 : -1;   // short shift
  moveActor(v, side.x * 18 * s, side.y * 18 * s);
}
function updateCracks(dt) {
  for (const c of G.cracks || []) {
    c.t -= dt;
    if (c.t <= 0) {
      for (const h of liveHeroes()) if (Math.hypot(h.x - c.x, h.y - c.y) < VARN.crack.r + h.r) { hurt(h, VARN.crack.dmg, { aoe: true }); if (!(h.st.invuln > 0)) h.st.prone = VARN.crack.prone; }
      burst(c.x, c.y, PAL.dust, 12); fxRing(c.x, c.y, PAL.ember, VARN.crack.r); sfx('thud');
    }
  }
  G.cracks = (G.cracks || []).filter(c => c.t > 0);
}
// The rising clock: arcs from the floor every few seconds, a little worse each time.
function residualArcs(v, dt) {
  v.arcT -= dt; v.rise += dt;
  if (v.arcT > 0) return;
  v.arcT = VARN.arcs.every; v.arcN++;
  const dmg = Math.min(VARN.arcs.max, VARN.arcs.base + Math.floor(v.rise / VARN.arcs.growEvery));
  G.arcs = [];
  for (const u of [...liveHeroes(), v]) {
    hurt(u, u === v ? dmg * VARN.arcs.varnMult : dmg, { aoe: true, pure: true, arc: true });
    G.arcs.push({ x: u.x, y: u.y, t: 0.35, from: nearestFissure(u) });
  }
  sfx('arc');
}

/* ---------- Shards ---------- */
// They orbit Varn and dart at whoever comes close, and at whoever tries to get away.
function shardBrain(s, dt) {
  const v = s.shardOf;
  if (!v || v.dead || v.sinking != null) { s.dead = true; s.deadT = 0; return; }
  if (s.dartT > 0) {
    s.dartT -= dt;
    const t = s.dartAt; if (alive(t)) stepToward(s, t.x, t.y, 190, dt);
    if (alive(t) && dist(s, t) < t.r + 4) { hurt(t, VARN.shards.dart); burst(s.x, s.y, PAL.obsidian, 4); s.dartT = 0; }
    if (s.dartT <= 0) s.dartT = 0;
    return;
  }
  s.orbitA += dt * 2.2;
  const ox = v.x + Math.cos(s.orbitA) * VARN.shards.orbit, oy = v.y + Math.sin(s.orbitA) * VARN.shards.orbit * 0.8;
  s.x = lerp(s.x, ox, 0.2); s.y = lerp(s.y, oy, 0.2); s.face = { x: Math.cos(s.orbitA + 1.6), y: Math.sin(s.orbitA + 1.6) };
  s.cool = (s.cool || 0) - dt;
  if (s.cool > 0) return;
  const close = liveHeroes().find(h => dist(h, v) < VARN.shards.near + v.r);
  const fleeing = liveHeroes().find(h => dist(h, v) > VARN.shards.far);
  const t = close || fleeing;
  if (t) { shardDart(s, t); }
}
function shardDart(s, t) { s.dartAt = t; s.dartT = 0.6; s.cool = rnd(...VARN.shards.cool); sfx('dash'); }

/* ---------- The end: the earth takes him back ---------- */
function varnFalls() {
  const v = this && this.boss ? this : liveFoes().find(e => e.boss);
  if (!v || v.sinking != null) return;
  v.sinking = 0; v.hp = 0; v.st = {}; setFlag('varn_alive', true);
  for (const s of liveFoes()) if (s.shardOf) { s.dead = true; s.deadT = 0; burst(s.x, s.y, PAL.obsidian, 6); }
  G.cracks = []; G.arcs = [];
  shake(2.5, 1.2); sfx('doors');
}
function updateVarnSinking(dt) {
  const v = (G.enemies || []).find(e => e.boss && e.sinking != null);
  if (!v) return;
  v.sinking += dt;
  if (v.sinking > 2.2 && !v.dead) { v.dead = true; v.deadT = 0.79; }
}

/* ---------- Helpers ---------- */
function openSpot(x, y, r) {
  for (let d = 0; d < 80; d += 6) for (let a = 0; a < 6.28; a += 0.8) {
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    if (!circleHits(G.room, px, py, r)) return { x: px, y: py };
    if (!d) break;
  }
  return { x, y };
}
function farthestPoint(v) {
  const hs = liveHeroes(); let best = null, bd = -1;
  for (let i = 0; i < 24; i++) {
    const p = { x: rnd(TILE * 3, G.room.pw - TILE * 3), y: rnd(TILE * 3, G.room.ph - TILE * 3) };
    if (circleHits(G.room, p.x, p.y, v.r)) continue;
    const d = Math.min(...hs.map(h => dist(h, p)));
    if (d > bd && d < 160) { bd = d; best = p; }
  }
  return best || { x: v.x, y: v.y };
}
function nearestFissure(u) {
  let best = { x: u.x, y: u.y + 30 }, bd = Infinity;
  G.room.grid.forEach((row, y) => row.forEach((c, x) => { if (c !== '~') return; const p = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }, d = dist(u, p); if (d < bd) { bd = d; best = p; } }));
  return best;
}
