'use strict';
/* ============================== WORLD: rooms, collision, party movement, followers, camera ============================== */

const SOLID = new Set(['#', 'D', 'o', '~']);
const SLOW = new Set([',']);

function buildRoom(id) {
  const m = MAPS[id], rows = m.rows, h = rows.length, w = Math.max(...rows.map(r => r.length));
  const room = { id, w, h, pw: w * TILE, ph: h * TILE, dark: m.dark, grid: [], lights: [], spawns: {}, triggers: [], layer: null };
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] || '#', cx = (x + 0.5) * TILE, cy = (y + 0.5) * TILE;
      row.push(c);
      if (c === 't') room.lights.push({ x: cx, y: cy, r: 92, color: PAL.ember, flicker: Math.random() * 10, torch: true });
      if (c === 'P' || c === 'w') room.spawns[c] = { x: cx, y: cy };
      if ('SXi'.includes(c)) room.triggers.push({ kind: c, x: cx, y: cy, tx: x, ty: y });
    }
    room.grid.push(row);
  }
  return room;
}
const tileAt = (room, tx, ty) => (tx < 0 || ty < 0 || tx >= room.w || ty >= room.h) ? '#' : room.grid[ty][tx];
const tileAtPx = (room, px, py) => tileAt(room, Math.floor(px / TILE), Math.floor(py / TILE));

// Does a circle at (x, y) overlap any solid tile?
function circleHits(room, x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE), y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!SOLID.has(tileAt(room, tx, ty))) continue;
    const nx = clamp(x, tx * TILE, tx * TILE + TILE), ny = clamp(y, ty * TILE, ty * TILE + TILE);
    if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
  }
  return false;
}
// Axis-separated move so actors slide along walls.
function moveActor(a, dx, dy) {
  const room = G.room;
  if (dx && !circleHits(room, a.x + dx, a.y, a.r)) a.x += dx;
  if (dy && !circleHits(room, a.x, a.y + dy, a.r)) a.y += dy;
}
const slowAt = a => SLOW.has(tileAtPx(G.room, a.x, a.y)) ? 0.55 : 1;

/* ---------- Actors ---------- */
function makeActor(id, def, x, y) { return { id, def, x, y, r: def.r, face: { x: 1, y: 0 }, walk: 0, moving: false }; }

function spawnParty() {
  const room = G.room, p = room.spawns.P || { x: 40, y: 40 };
  G.party = {}; G.actors = [];
  HERO_ORDER.forEach((id, i) => {
    if (!S.party[id].alive) return;
    const a = makeActor(id, HEROES[id], p.x - i * 10, p.y + (i % 2 ? 8 : -8));
    a.hero = true; G.party[id] = a; G.actors.push(a);
  });
  if (!G.party[S.lead]) S.lead = Object.keys(G.party)[0];
  G.will = null;
  if (S.will && room.spawns.w && !G.noWill) { const w = room.spawns.w; G.will = makeActor('will', WILL, w.x, w.y); G.actors.push(G.will); }
  G.trail = [];
  snapCamera();
}
const leader = () => G.party[S.lead];
// Followers in the order they walk behind the leader.
const followers = () => [...HERO_ORDER.filter(id => id !== S.lead && G.party[id]).map(id => G.party[id]), ...(G.will ? [G.will] : [])];

function setLead(id) {
  if (!G.party[id] || id === S.lead) return;
  S.lead = id;
  G.trail.push({ x: G.party[id].x, y: G.party[id].y });
}
function cycleLead(dir = 1) {
  const live = HERO_ORDER.filter(id => G.party[id]);
  setLead(live[(live.indexOf(S.lead) + dir + live.length) % live.length]);
}

function stepToward(a, tx, ty, speed, dt) {
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { a.moving = false; return; }
  const s = Math.min(d, speed * slowAt(a) * dt);
  moveActor(a, dx / d * s, dy / d * s);
  a.face = { x: dx / d, y: dy / d }; a.moving = true; a.walk += dt * 10;
}

function updateParty(dt) {
  const L = leader(); if (!L) return;
  // Hero swap
  for (const id of HERO_ORDER) if (hit('Digit' + HEROES[id].key, 'Numpad' + HEROES[id].key)) setLead(id);
  if (hit('Tab')) cycleLead(keys.has('ShiftLeft') || keys.has('ShiftRight') ? -1 : 1);

  // Leader movement
  let ix = (held('KeyD', 'ArrowRight') ? 1 : 0) - (held('KeyA', 'ArrowLeft') ? 1 : 0);
  let iy = (held('KeyS', 'ArrowDown') ? 1 : 0) - (held('KeyW', 'ArrowUp') ? 1 : 0);
  const m = Math.hypot(ix, iy);
  L.moving = m > 0;
  if (m) {
    ix /= m; iy /= m;
    const sp = L.def.speed * slowAt(L) * dt;
    moveActor(L, ix * sp, iy * sp);
    L.face = { x: ix, y: iy }; L.walk += dt * 11;
  }
  // Breadcrumb trail so followers take the leader's path around corners.
  const tail = G.trail[G.trail.length - 1];
  if (!tail || Math.hypot(L.x - tail.x, L.y - tail.y) > 5) { G.trail.push({ x: L.x, y: L.y }); if (G.trail.length > 240) G.trail.shift(); }

  followers().forEach((f, k) => {
    const back = (k + 1) * 4, crumb = G.trail[G.trail.length - 1 - back] || G.trail[0] || L;
    const dL = dist(f, L);
    if (dL > 220) { f.x = crumb.x; f.y = crumb.y; return; }       // lost: catch up out of sight
    if (dL < 14 + k * 6 || dist(f, crumb) < 3) { f.moving = false; return; }
    stepToward(f, crumb.x, crumb.y, f.def.speed * (dL > 60 ? 1.35 : 1.05), dt);
  });
  separate(G.actors);
}

// Push overlapping actors apart (the leader yields least).
function separate(list) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
    if (d >= min) continue;
    const push = (min - d) / 2, ux = dx / d, uy = dy / d;
    const wa = a === leader() ? 0.2 : 1, wb = b === leader() ? 0.2 : 1;
    moveActor(a, -ux * push * wa, -uy * push * wa); moveActor(b, ux * push * wb, uy * push * wb);
  }
}

// Trigger the leader is standing on, and interactables within reach.
function triggerUnder(a) { return G.room.triggers.find(t => t.tx === Math.floor(a.x / TILE) && t.ty === Math.floor(a.y / TILE)); }
function nearestInteract(a, reach = 26) { return G.room.triggers.filter(t => t.kind === 'i').find(t => Math.hypot(t.x - a.x, t.y - a.y) < reach); }

/* ---------- Camera ---------- */
function camTarget() {
  const L = leader() || { x: G.room.pw / 2, y: G.room.ph / 2 }, room = G.room;
  return {
    x: room.pw <= W ? (room.pw - W) / 2 : clamp(L.x - W / 2, 0, room.pw - W),
    y: room.ph <= H ? (room.ph - H) / 2 : clamp(L.y - H / 2, 0, room.ph - H),
  };
}
function snapCamera() { Object.assign(G.cam, camTarget()); }
function updateCamera(dt) {
  const t = camTarget(), k = 1 - Math.exp(-dt * 6);
  G.cam.x = lerp(G.cam.x, t.x, k); G.cam.y = lerp(G.cam.y, t.y, k);
}
