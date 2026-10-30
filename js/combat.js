'use strict';
/* ============================== COMBAT: stats, abilities, damage, statuses, enemy and ally AI, encounters ==============================
  Real time. The controlled hero acts on J (basic), K and L (abilities), H (Raiden's Lay on Hands), Q (a draught).
  The other two heroes act on their own (allyAI). Space pauses; while paused you can change hero and queue an ability as an order.
  Statuses live in unit.st as seconds remaining: prone, hexed, invuln, guard ({ by, t }).
  A hero at 0 HP is downed, not dead: Lay on Hands revives, and the fight's end gets everyone back up.
  If every hero is downed, the encounter restarts from the moment it began (G.snap).
*/

const TUNE = {
  heroes: {
    raiden:  { hp: 60, armor: 0.25, basic: { range: 18, cd: 0.8, dmg: [6, 9] } },
    ichabod: { hp: 38, armor: 0.05, basic: { range: 150, cd: 1.0, dmg: [6, 9], bolt: true } },
    kieran:  { hp: 44, armor: 0.12, basic: { range: 16, cd: 0.55, dmg: [4, 6] } },
  },
  smite:  { faith: 3, cd: 4, range: 20, dmg: [16, 22] },
  hands:  { pool: 30, amount: 10, cd: 1.2, range: 44 },
  shield: { cd: 9, dur: 3.5, take: 0.5, range: 130, leap: 46 },
  hex:    { cd: 10, dur: 12, mult: 1.35, range: 170 },
  pull:   { cd: 6, dist: 76 },
  sneak:  { cd: 2.5, range: 18, dmg: [7, 10], bonus: [10, 14] },
  dash:   { cd: 3.5, dist: 64, time: 0.22, invuln: 0.3 },
  draught: 22,
  reviveAt: 0.3,
};
const FOES = {
  risen: { name: 'Risen', hp: 16, r: 5.5, speed: 42, armor: 0, reach: 13, windup: 0.45, recover: 1.0, dmg: [5, 8], aggro: 125 },
  husk:  { name: 'Husk', hp: 36, r: 7.5, speed: 28, armor: 0.1, reach: 18, windup: 0.9, recover: 1.6, dmg: [9, 13], aoe: 22, prone: 1.0, aggro: 125 },
};
// What each key does, per hero (for the HUD and for orders).
const SKILLS = {
  raiden:  { j: 'Sword', k: 'Smite', l: 'Shield Ally', h: 'Lay on Hands' },
  ichabod: { j: 'Eldritch Blast', k: 'Hex', l: 'Dinas\'s Pull' },
  kieran:  { j: 'Dagger', k: 'Sneak Attack', l: 'Cunning Dash' },
};
const SKILL_CD = { raiden: { j: TUNE.heroes.raiden.basic.cd, k: TUNE.smite.cd, l: TUNE.shield.cd, h: TUNE.hands.cd },
  ichabod: { j: TUNE.heroes.ichabod.basic.cd, k: TUNE.hex.cd, l: TUNE.pull.cd }, kieran: { j: TUNE.heroes.kieran.basic.cd, k: TUNE.sneak.cd, l: TUNE.dash.cd } };

const roll = ([a, b]) => a + Math.random() * (b - a);
const alive = u => u && !u.down && !u.dead;
const heroes = () => HERO_ORDER.map(id => G.party[id]).filter(Boolean);
const liveHeroes = () => heroes().filter(alive);
const liveFoes = () => (G.enemies || []).filter(e => !e.dead);

/* ---------- Setup ---------- */
function armHeroes() {
  for (const h of heroes()) {
    const t = TUNE.heroes[h.id];
    Object.assign(h, { maxHp: t.hp, hp: t.hp, down: false, cd: { j: 0, k: 0, l: 0, h: 0 }, st: {}, flash: 0, queued: null });
  }
  const r = G.party.raiden;
  if (r) { r.faith = TUNE.smite.faith; r.pool = Math.round(TUNE.hands.pool * (S.relics.litany ? 1.5 : 1)); }
  G.enemies = []; G.shots = []; G.fx = []; G.combat = false; G.snap = null; G.wipe = null; G.clearT = 0;
}
function makeFoe(kind, x, y) {
  const d = FOES[kind];
  return { id: 'foe', kind, def: d, x, y, r: d.r, hp: d.hp, maxHp: d.hp, face: { x: -1, y: 0 }, walk: 0, moving: false,
    state: 'chase', t: 0, aggro: false, st: {}, flash: 0, target: null, home: { x, y } };
}
function spawnFoes(list, aggro = false) {   // list: [{ kind, x, y }]
  for (const f of list) { const e = makeFoe(f.kind, f.x, f.y); e.aggro = aggro; G.enemies.push(e); }
}

/* ---------- Damage ---------- */
function hurt(u, amount, o = {}) {
  if (!u || u.dead || u.down || amount <= 0) return 0;
  if (u.st.invuln > 0) { floatText(u, 'Nothing', PAL.boneDim); return 0; }
  if (u.st.guard && u.st.guard.t > 0 && alive(u.st.guard.by) && u.st.guard.by !== u) {   // Shield Ally: Raiden takes it instead
    const by = u.st.guard.by; sfx('thud');
    return hurt(by, amount * TUNE.shield.take, { ...o, guarded: true });
  }
  let d = amount;
  if (u.st.hexed > 0) d *= TUNE.hex.mult;
  if (u.st.prone > 0) d *= 1.25;
  if (o.aoe && u.id === 'kieran') d *= 0.5;                       // Evasion
  d *= 1 - (u.def.armor ?? (TUNE.heroes[u.id] || {}).armor ?? 0);
  d = Math.max(1, Math.round(d));
  u.hp -= d; u.flash = 0.14;
  floatText(u, d, u.id === 'foe' || u.boss ? PAL.bone : '#e06a5a', o.big);
  if (u.hp <= 0) {
    u.hp = 0;
    if (u.id === 'foe') { if (u.onZero) u.onZero(); else { u.dead = true; u.deadT = 0; burst(u.x, u.y, PAL.boneDim, 10); } }
    else { u.down = true; u.st = {}; floatText(u, 'Down', '#e06a5a'); if (u.id === S.lead) autoLead(); }
  }
  if (u.id === 'foe') u.aggro = true;
  return d;
}
function heal(h, n) {
  if (!h || h.dead) return;
  const was = h.down; if (was) { h.down = false; h.hp = 0; }
  const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + n);
  floatText(h, '+' + Math.round(h.hp - before), '#c9d6a0');
}
function autoLead() { const next = liveHeroes()[0]; if (next) S.lead = next.id; }

/* ---------- Targeting ---------- */
// Nearest live foe within range of u, leaning toward where u is facing.
function pickTarget(u, range) {
  let best = null, bs = Infinity;
  for (const e of liveFoes()) {
    const d = dist(u, e) - e.r; if (d > range) continue;
    const dot = ((e.x - u.x) * u.face.x + (e.y - u.y) * u.face.y) / (dist(u, e) || 1);
    const s = d - dot * 12; if (s < bs) { bs = s; best = e; }
  }
  return best;
}
const faceTo = (u, t) => { const d = dist(u, t) || 1; u.face = { x: (t.x - u.x) / d, y: (t.y - u.y) / d }; };
function adjacentFoes(u, pad = 8) { return liveFoes().filter(e => dist(u, e) <= u.r + e.r + pad); }

// Sneak Attack: flanking (an ally on the far side of the target) or no other enemy beside Kieran.
function sneakReady(k, t) {
  if (!t) return false;
  const others = adjacentFoes(k).filter(e => e !== t && !e.shardOf);
  const shards = adjacentFoes(k).filter(e => e.shardOf);
  if (!others.length && !shards.length) return true;
  return liveHeroes().some(a => a !== k && dist(a, t) <= a.r + t.r + 12 &&
    ((k.x - t.x) * (a.x - t.x) + (k.y - t.y) * (a.y - t.y)) / ((dist(k, t) * dist(a, t)) || 1) < -0.2);
}

/* ---------- Abilities ---------- */
// Returns true if the ability fired (and starts its cooldown).
function useSkill(h, slot) {
  if (!alive(h) || h.st.prone > 0 || h.dashing) return false;
  if (!SKILLS[h.id][slot] || h.cd[slot] > 0) return false;
  const fn = SKILL_FN[h.id][slot]; if (!fn) return false;
  if (fn(h) === false) return false;
  h.cd[slot] = SKILL_CD[h.id][slot];
  return true;
}
function melee(h, t, dmg, o = {}) {
  faceTo(h, t); h.swing = { t: 0.18, big: !!o.big };
  return hurt(t, dmg, o);
}
const SKILL_FN = {
  raiden: {
    j: h => { const t = pickTarget(h, TUNE.heroes.raiden.basic.range); h.swing = { t: 0.18 }; if (t) { melee(h, t, roll(TUNE.heroes.raiden.basic.dmg)); sfx('hit'); } },
    k: h => {   // Smite: spend faith for a big radiant hit
      if (h.faith <= 0) { floatText(h, 'No faith left', PAL.boneDim); return false; }
      const t = pickTarget(h, TUNE.smite.range); if (!t) return false;
      h.faith--; melee(h, t, roll(TUNE.smite.dmg), { big: true }); fxRing(t.x, t.y, PAL.bone, 18); sfx('smite');
    },
    l: h => {   // Shield Ally: leap toward an ally and take their hits for a few seconds
      const w = shieldWard(h); if (!w) return false;
      const d = dist(h, w), go = Math.min(TUNE.shield.leap, Math.max(0, d - 14));
      if (go > 0) moveActor(h, (w.x - h.x) / d * go, (w.y - h.y) / d * go);
      w.st.guard = { by: h, t: TUNE.shield.dur }; floatText(w, 'Shielded', PAL.bone); sfx('seal');
    },
    h: h => {   // Lay on Hands: heal (or revive) from a pool
      if (h.pool <= 0) { floatText(h, 'Pool spent', PAL.boneDim); return false; }
      const near = heroes().filter(a => !a.dead && dist(a, h) <= TUNE.hands.range && (a.down || a.hp < a.maxHp));
      const t = near.sort((a, b) => (a.down ? -1 : a.hp / a.maxHp) - (b.down ? -1 : b.hp / b.maxHp))[0];
      if (!t) return false;
      const n = Math.min(h.pool, TUNE.hands.amount); h.pool -= n; heal(t, n); fxRing(t.x, t.y, '#c9d6a0', 12);
    },
  },
  ichabod: {
    j: h => {   // Eldritch Blast
      const t = pickTarget(h, TUNE.heroes.ichabod.basic.range);
      const dir = t ? (faceTo(h, t), h.face) : h.face;
      G.shots.push({ x: h.x + dir.x * 6, y: h.y - 3 + dir.y * 6, vx: dir.x * 260, vy: dir.y * 260, t: 0.7, target: t,
        dmg: roll(TUNE.heroes.ichabod.basic.dmg) * (S.relics.ember_ink ? 1.3 : 1), owner: h });
      h.swing = { t: 0.12 }; sfx('blast');
    },
    k: h => {   // Hex: marked target takes more from everyone
      const t = liveFoes().filter(e => dist(h, e) <= TUNE.hex.range).sort((a, b) => b.hp - a.hp)[0];
      if (!t) return false;
      t.st.hexed = TUNE.hex.dur; t.aggro = true; floatText(t, 'Hexed', PAL.ember); faceTo(h, t); sfx('hex');
    },
    l: h => {   // Dinas's Pull: short teleport, in the direction held or away from the nearest foe
      let dx = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0), dy = (held('KeyS', 'ArrowDown') ? 1 : 0) - (held('KeyW', 'ArrowUp') ? 1 : 0);
      if (h.id !== S.lead || (!dx && !dy)) { const n = nearestFoe(h); if (n) { dx = h.x - n.x; dy = h.y - n.y; } else { dx = h.face.x; dy = h.face.y; } }
      const m = Math.hypot(dx, dy) || 1; burst(h.x, h.y, PAL.ember, 8);
      teleport(h, dx / m, dy / m, TUNE.pull.dist); burst(h.x, h.y, PAL.ember, 8); sfx('pull');
    },
  },
  kieran: {
    j: h => { const t = pickTarget(h, TUNE.heroes.kieran.basic.range); h.swing = { t: 0.12 }; if (t) { melee(h, t, roll(TUNE.heroes.kieran.basic.dmg)); sfx('hit'); } },
    k: h => {   // Sneak Attack
      const t = pickTarget(h, TUNE.sneak.range); if (!t) return false;
      const sneaky = sneakReady(h, t);
      const d = roll(TUNE.sneak.dmg) + (sneaky ? roll(TUNE.sneak.bonus) * (S.relics.whetstone ? 1.4 : 1) : 0);
      melee(h, t, d, { big: sneaky }); if (sneaky) { floatText(h, 'Sneak Attack', PAL.bone); sfx('smite'); } else sfx('hit');
    },
    l: h => {   // Cunning Dash: disengage, untouchable for a moment
      let dx = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0), dy = (held('KeyS', 'ArrowDown') ? 1 : 0) - (held('KeyW', 'ArrowUp') ? 1 : 0);
      if (h.id !== S.lead || (!dx && !dy)) { const n = nearestFoe(h); if (n) { dx = h.x - n.x; dy = h.y - n.y; } else { dx = h.face.x; dy = h.face.y; } }
      const m = Math.hypot(dx, dy) || 1;
      h.dashing = { vx: dx / m * TUNE.dash.dist / TUNE.dash.time, vy: dy / m * TUNE.dash.dist / TUNE.dash.time, t: TUNE.dash.time };
      h.st.invuln = TUNE.dash.invuln; sfx('dash');
    },
  },
};
function shieldWard(h) {
  const others = liveHeroes().filter(a => a !== h && dist(a, h) <= TUNE.shield.range);
  const threatened = others.filter(a => liveFoes().some(e => e.state === 'windup' && e.target === a));
  return (threatened.length ? threatened : others).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}
function nearestFoe(u) { let b = null, bd = Infinity; for (const e of liveFoes()) { const d = dist(u, e); if (d < bd) { bd = d; b = e; } } return b; }
// Blink up to d along (ux, uy); if a wall cuts it short, try angled directions and take whichever goes furthest.
function teleport(u, ux, uy, d) {
  let best = null;
  for (const da of [0, 0.5, -0.5, 1, -1]) {
    const c = Math.cos(da), s0 = Math.sin(da), vx = ux * c - uy * s0, vy = ux * s0 + uy * c;
    for (let s = d; s > 4; s -= 4) {
      const x = u.x + vx * s, y = u.y + vy * s;
      if (!circleHits(G.room, x, y, u.r)) { if (!best || s > best.s + 8) best = { x, y, s }; break; }
    }
  }
  if (best) { u.x = best.x; u.y = best.y; }
}
function drinkDraught(h) {
  if (!alive(h) || !(S.inv.draught > 0) || h.hp >= h.maxHp || h.drinkCd > 0) return;
  S.inv.draught--; heal(h, TUNE.draught); h.drinkCd = 1; sfx('drink');
}

/* ---------- Per-frame update ---------- */
function updateCombat(dt) {
  const foes = G.enemies || [];
  // Aggro: the fight begins when any foe notices the party.
  for (const e of liveFoes()) if (!e.aggro && liveHeroes().some(h => dist(h, e) < e.def.aggro)) e.aggro = true;
  const engaged = liveFoes().some(e => e.aggro);
  if (engaged && !G.combat) startEncounter();
  if (G.combat && !liveFoes().length) endEncounter();

  for (const h of heroes()) tickUnit(h, dt);
  for (const e of foes) tickUnit(e, dt);
  for (const h of heroes()) for (const k in h.cd) h.cd[k] = Math.max(0, h.cd[k] - dt);
  for (const h of heroes()) if (h.drinkCd) h.drinkCd = Math.max(0, h.drinkCd - dt);

  for (const h of heroes()) if (h.dashing) {
    const d = h.dashing; moveActor(h, d.vx * dt, d.vy * dt); d.t -= dt; h.moving = true; h.walk += dt * 20;
    if (d.t <= 0) h.dashing = null;
  }
  for (const e of foes) if (!e.dead && e.aggro && !(e.st.prone > 0)) (e.brain || foeBrain)(e, dt);
  for (const e of foes) if (e.dead) e.deadT += dt;
  G.enemies = foes.filter(e => !e.dead || e.deadT < 0.8);

  // Bolts
  for (const s of G.shots) {
    if (s.target && !s.target.dead) { const d = dist(s, s.target) || 1, sp = Math.hypot(s.vx, s.vy); s.vx = lerp(s.vx, (s.target.x - s.x) / d * sp, 0.15); s.vy = lerp(s.vy, (s.target.y - 4 - s.y) / d * sp, 0.15); }
    s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt;
    const hitFoe = liveFoes().find(e => Math.hypot(e.x - s.x, e.y - 3 - s.y) < e.r + 3);
    if (hitFoe) { hurt(hitFoe, s.dmg); burst(s.x, s.y, PAL.ember, 6); s.t = 0; }
    else if (tileAtPx(G.room, s.x, s.y) === '#' || tileAtPx(G.room, s.x, s.y) === 'E') { burst(s.x, s.y, PAL.ember, 4); s.t = 0; }
  }
  G.shots = G.shots.filter(s => s.t > 0);
  if (G.combat) separate([...liveHeroes(), ...liveFoes().filter(e => !e.ghost)]);

  if (!liveHeroes().length && G.combat && !G.wipe) { G.wipe = { t: 0 }; renderUI(); }
  if (G.wipe) { G.wipe.t += dt; if (G.wipe.t > 2.2) restoreSnap(); }
}
function tickUnit(u, dt) {
  u.flash = Math.max(0, (u.flash || 0) - dt);
  if (u.swing) { u.swing.t -= dt; if (u.swing.t <= 0) u.swing = null; }
  for (const k in u.st) {
    if (k === 'guard') { u.st.guard.t -= dt; if (u.st.guard.t <= 0) delete u.st.guard; }
    else { u.st[k] -= dt; if (u.st[k] <= 0) delete u.st[k]; }
  }
}

function startEncounter() {
  G.combat = true;
  for (const e of liveFoes()) e.aggro = true;
  G.snap = { S: clone(S), heroes: heroes().map(h => ({ id: h.id, x: h.x, y: h.y })), foes: liveFoes().map(e => ({ kind: e.kind, x: e.x, y: e.y, boss: e.boss })),
    will: G.will && { x: G.will.x, y: G.will.y } };
  if (G.scene.onCombat) G.scene.onCombat();
}
function endEncounter() {
  G.combat = false; G.snap = null;
  for (const h of heroes()) if (h.down) { h.down = false; h.hp = Math.round(h.maxHp * TUNE.reviveAt); floatText(h, 'Up', PAL.bone); }
  if (G.scene.onClear) G.scene.onClear();
  save();
}
// Every hero down: the encounter starts again from the moment it began.
function restoreSnap() {
  const snap = G.snap; G.wipe = null; if (!snap) return;
  S = clone(snap.S);
  armHeroes();
  for (const p of snap.heroes) { const h = G.party[p.id]; if (h) { h.x = p.x; h.y = p.y; } }
  if (snap.will && G.will) Object.assign(G.will, snap.will);
  if (G.scene.respawn) G.scene.respawn(snap); else spawnFoes(snap.foes, false);
  G.trail = []; renderUI();
}

/* ---------- Enemy AI (risen, husks) ---------- */
function foeBrain(e, dt) {
  const d = e.def;
  if (e.state === 'windup') {
    e.t -= dt;
    if (e.t <= 0) {
      const sx = e.x + e.aim.x * d.reach * 0.8, sy = e.y + e.aim.y * d.reach * 0.8;
      if (d.aoe) {
        for (const h of liveHeroes()) if (Math.hypot(h.x - sx, h.y - sy) < d.aoe + h.r) { hurt(h, roll(d.dmg), { aoe: true }); if (d.prone && !(h.st.invuln > 0)) h.st.prone = d.prone; }
        fxRing(sx, sy, PAL.dust, d.aoe); shake(1.2, 0.15); sfx('thud');
      } else {
        const t = e.target;
        if (alive(t) && dist(e, t) <= d.reach + t.r + 6 && ((t.x - e.x) * e.aim.x + (t.y - e.y) * e.aim.y) > 0) { hurt(t, roll(d.dmg)); sfx('hit'); }
      }
      e.state = 'recover'; e.t = d.recover;
    }
    return;
  }
  if (e.state === 'recover') { e.t -= dt; e.moving = false; if (e.t <= 0) e.state = 'chase'; return; }
  // chase: stick with the current target unless someone is much closer
  const hs = liveHeroes(); if (!hs.length) return;
  const near = hs.reduce((a, b) => dist(e, a) <= dist(e, b) ? a : b);
  if (!alive(e.target) || dist(e, near) < dist(e, e.target) * 0.7) e.target = near;
  const t = e.target, dd = dist(e, t);
  if (dd <= d.reach + t.r) { faceTo(e, t); e.aim = { ...e.face }; e.state = 'windup'; e.t = d.windup; e.moving = false; return; }
  stepToward(e, t.x, t.y, d.speed, dt);
}

/* ---------- Ally AI ---------- */
function allyAI(h, dt) {
  if (!alive(h) || h.st.prone > 0 || h.dashing) { h.moving = false; return; }
  if (h.queued) { if (useSkill(h, h.queued)) h.queued = null; }
  const foes = liveFoes().filter(e => e.aggro); if (!foes.length) return false;
  AI[h.id](h, dt, foes);
  return true;
}
const AI = {
  raiden(h, dt, foes) {
    const hurtAlly = heroes().filter(a => !a.dead && dist(a, h) < 120 && (a.down || a.hp / a.maxHp < 0.35)).sort((a, b) => (a.down ? -1 : a.hp) - (b.down ? -1 : b.hp))[0];
    if (hurtAlly && h.pool > 0 && h.cd.h <= 0) {
      if (dist(hurtAlly, h) > TUNE.hands.range - 4) return stepToward(h, hurtAlly.x, hurtAlly.y, h.def.speed, dt);
      if (useSkill(h, 'h')) return;
    }
    if (h.cd.l <= 0 && liveFoes().some(e => e.state === 'windup' && e.target !== h && alive(e.target) && dist(e.target, h) < TUNE.shield.range && (e.boss || e.def.aoe))) useSkill(h, 'l');
    // Protect the most fragile ally: fight whatever is closest to them.
    const ward = liveHeroes().filter(a => a !== h).sort((a, b) => a.hp - b.hp)[0] || h;
    const t = foes.reduce((a, b) => dist(ward, a) <= dist(ward, b) ? a : b);
    h.target = t;
    if (dist(h, t) > TUNE.heroes.raiden.basic.range + t.r - 2) return stepToward(h, t.x, t.y, h.def.speed, dt);
    h.moving = false; faceTo(h, t);
    if (h.faith > 0 && t.hp >= 20 && h.cd.k <= 0) useSkill(h, 'k'); else useSkill(h, 'j');
  },
  ichabod(h, dt, foes) {
    const n = nearestFoe(h), d = n ? dist(h, n) : 999;
    if (d < 24 && h.cd.l <= 0) return void useSkill(h, 'l');
    if (h.cd.k <= 0 && !foes.some(e => e.st.hexed > 0)) useSkill(h, 'k');
    if (d < 60) { const away = { x: h.x + (h.x - n.x), y: h.y + (h.y - n.y) }; stepToward(h, away.x, away.y, h.def.speed * 0.9, dt); }
    const t = foes.find(e => e.st.hexed > 0 && dist(h, e) < TUNE.heroes.ichabod.basic.range) || pickTarget(h, TUNE.heroes.ichabod.basic.range);
    if (t) { faceTo(h, t); if (d >= 60) h.moving = false; useSkill(h, 'j'); }
    else if (n) stepToward(h, n.x, n.y, h.def.speed, dt);
  },
  kieran(h, dt, foes) {
    if (h.hp / h.maxHp < 0.3 && adjacentFoes(h).length && h.cd.l <= 0) return void useSkill(h, 'l');
    const r = G.party.raiden, t = (alive(r) && r.target && !r.target.dead && r.target) || nearestFoe(h);
    if (!t) return;
    // Aim for the far side of the target from whoever else is fighting it.
    const ally = liveHeroes().filter(a => a !== h && dist(a, t) < 30)[0];
    let gx = t.x, gy = t.y;
    if (ally) { const d = dist(ally, t) || 1; gx = t.x - (ally.x - t.x) / d * (t.r + h.r + 3); gy = t.y - (ally.y - t.y) / d * (t.r + h.r + 3); }
    if (Math.hypot(gx - h.x, gy - h.y) > 5 && dist(h, t) > t.r + h.r + 2) return stepToward(h, gx, gy, h.def.speed, dt);
    if (dist(h, t) > TUNE.sneak.range + t.r) return stepToward(h, t.x, t.y, h.def.speed, dt);
    h.moving = false; faceTo(h, t);
    if (h.cd.k <= 0 && sneakReady(h, t)) useSkill(h, 'k'); else useSkill(h, 'j');
  },
};

// The controlled hero's combat keys (called from updateParty).
function leaderCombatKeys(L) {
  if (!alive(L)) return;
  if (L.queued && useSkill(L, L.queued)) L.queued = null;
  if (held('KeyJ')) useSkill(L, 'j');
  if (hit('KeyK')) useSkill(L, 'k');
  if (hit('KeyL')) useSkill(L, 'l');
  if (hit('KeyH')) useSkill(L, 'h');
  if (hit('KeyQ')) drinkDraught(L);
}

/* ---------- Effects (drawn in render.js) ---------- */
function shake(amount, time) { G.shakeAmt = amount; G.shakeT = time; }
function floatText(u, text, color, big) { (G.fx = G.fx || []).push({ kind: 'text', x: u.x + rnd(-3, 3), y: u.y - u.r - 6, text: String(typeof text === 'number' ? Math.round(text) : text), color, big, t: 0, life: 0.9 }); }
function burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), s = rnd(20, 70); (G.fx = G.fx || []).push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, t: 0, life: rnd(0.25, 0.5) }); } }
function fxRing(x, y, color, r) { (G.fx = G.fx || []).push({ kind: 'ring', x, y, r, color, t: 0, life: 0.4 }); }
function updateFx(dt) {
  if (G.shakeT > 0) G.shakeT -= dt;
  for (const f of G.fx || []) { f.t += dt; if (f.kind === 'text') f.y -= 18 * dt; if (f.kind === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.9; f.vy *= 0.9; } }
  G.fx = (G.fx || []).filter(f => f.t < f.life);
}
