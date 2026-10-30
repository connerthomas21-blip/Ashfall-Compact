'use strict';
/* ============================== RENDER: canvas, room layer, actors, lighting, HUD ============================== */

const cv = document.getElementById('view'), ctx = cv.getContext('2d');
const lc = document.createElement('canvas'), lx = lc.getContext('2d');   // darkness / light mask
let SCALE = 1;

function resize() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(3, devicePixelRatio || 1);
  cv.width = lc.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = lc.height = Math.max(1, Math.round(r.height * dpr));
  SCALE = cv.width / W;
  if (G.room) G.room.layer = null;   // rebuild the static layer at the new resolution
}
addEventListener('resize', resize);

// Deterministic noise so the cached floor doesn't change between rebuilds.
function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/* ---------- Static room layer (floor, walls, decor), cached per room ---------- */
function buildLayer(room) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(room.pw * SCALE); c.height = Math.ceil(room.ph * SCALE);
  const g = c.getContext('2d'); g.scale(SCALE, SCALE);
  const T = TILE, solid = (x, y) => SOLID.has(tileAt(room, x, y)) && tileAt(room, x, y) !== '~';
  for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
    const c0 = room.grid[y][x], px = x * T, py = y * T, n = hash(x, y);
    // floor everywhere first
    g.fillStyle = n < 0.5 ? PAL.earth : '#2e261f'; g.fillRect(px, py, T, T);
    for (let k = 0; k < 4; k++) { const h1 = hash(x, y, k + 1); g.fillStyle = h1 < 0.5 ? 'rgba(0,0,0,.25)' : 'rgba(120,100,80,.12)'; g.fillRect(px + hash(x, y, k + 9) * T, py + hash(x, y, k + 17) * T, 1.2, 1.2); }
    if (c0 === ',') for (let k = 0; k < 5; k++) {
      const sx = px + 2 + hash(x, y, k + 30) * 12, sy = py + 2 + hash(x, y, k + 40) * 12, sr = 1 + hash(x, y, k + 50) * 2.2;
      g.fillStyle = '#4a3f34'; g.beginPath(); g.ellipse(sx, sy, sr, sr * 0.75, 0, 0, 7); g.fill();
      g.fillStyle = '#1a1512'; g.fillRect(sx - sr * 0.6, sy + sr * 0.4, sr * 1.2, 0.8);
    }
    if (c0 === 'b') {
      g.strokeStyle = PAL.boneDim; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px + 3, py + 10); g.lineTo(px + 11, py + 7); g.moveTo(px + 6, py + 12); g.lineTo(px + 13, py + 13); g.stroke();
      g.fillStyle = PAL.bone; g.beginPath(); g.arc(px + 12, py + 5, 2.2, 0, 7); g.fill();
    }
    if (c0 === 'o') {
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(px + 8, py + 12, 7.5, 3.5, 0, 0, 7); g.fill();
      g.fillStyle = '#433830'; g.beginPath(); g.ellipse(px + 8, py + 8, 7, 6.5, 0, 0, 7); g.fill();
      g.fillStyle = '#5a4c40'; g.beginPath(); g.ellipse(px + 6.5, py + 6, 3.5, 2.5, -0.5, 0, 7); g.fill();
    }
    if (c0 === '~') {
      // Dark chasm with ragged lips; the glowing vein is drawn afterwards so it runs continuously between tiles.
      g.fillStyle = '#070505'; g.fillRect(px, py, T, T);
      const lip = (dx, dy) => tileAt(room, x + dx, y + dy) !== '~';
      g.fillStyle = '#3b3128';
      for (let k = 0; k < 4; k++) {
        const o = hash(x, y, 100 + k) * 12, w = 2 + hash(x, y, 110 + k) * 3;
        if (lip(0, -1)) g.fillRect(px + o, py, w, 1.5 + hash(x, y, 120 + k) * 2);
        if (lip(0, 1)) g.fillRect(px + o, py + T - 2 - hash(x, y, 130 + k) * 2, w, 3);
        if (lip(-1, 0)) g.fillRect(px, py + o, 1.5 + hash(x, y, 140 + k) * 2, w);
        if (lip(1, 0)) g.fillRect(px + T - 2 - hash(x, y, 150 + k) * 2, py + o, 3, w);
      }
    }
    if (c0 === 'c') {   // hand-cut slab with a mountain and a name
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px + 2, py + 12, 13, 3);
      g.fillStyle = '#4a4038'; g.fillRect(px + 2, py + 1, 12, 12); g.fillStyle = '#5a4e44'; g.fillRect(px + 2, py + 1, 12, 2);
      g.strokeStyle = 'rgba(216,205,180,.5)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(px + 4, py + 9); g.lineTo(px + 6, py + 5); g.lineTo(px + 8, py + 7); g.lineTo(px + 10, py + 4); g.lineTo(px + 12, py + 9); g.stroke();
      g.fillStyle = 'rgba(216,205,180,.45)'; g.fillRect(px + 4, py + 11, 8, 0.8);
    }
    if (c0 === 'a') {   // scorched altar
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(px + 8, py + 11, 9, 4, 0, 0, 7); g.fill();
      g.fillStyle = '#1b1614'; g.fillRect(px + 1, py + 3, 14, 9); g.fillStyle = '#2a221d'; g.fillRect(px + 1, py + 3, 14, 2);
      g.fillStyle = 'rgba(120,110,100,.35)'; for (let k = 0; k < 6; k++) g.fillRect(px + 2 + hash(x, y, k + 300) * 12, py + 4 + hash(x, y, k + 310) * 6, 1.5, 1);
    }
    if (c0 === 'm') {   // wine stains and tipped cups
      g.fillStyle = 'rgba(70,24,40,.65)'; g.beginPath(); g.ellipse(px + 7, py + 8, 6, 4, 0.3, 0, 7); g.fill();
      g.fillStyle = 'rgba(70,24,40,.4)'; g.beginPath(); g.ellipse(px + 12, py + 5, 3, 1.5, 0.8, 0, 7); g.fill();
      g.fillStyle = '#7a5a44'; for (const [cx2, cy2] of [[3, 4], [5, 13], [13, 11]]) { g.beginPath(); g.ellipse(px + cx2, py + cy2, 1.6, 1.1, 0.6, 0, 7); g.fill(); }
    }
    if (c0 === 'n') {   // bones with a tin charm
      g.strokeStyle = PAL.boneDim; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px + 2, py + 6); g.lineTo(px + 12, py + 9); g.moveTo(px + 4, py + 12); g.lineTo(px + 13, py + 13); g.moveTo(px + 6, py + 4); g.lineTo(px + 8, py + 13); g.stroke();
      g.fillStyle = PAL.bone; g.beginPath(); g.arc(px + 13, py + 4, 2.3, 0, 7); g.fill();
      g.fillStyle = '#9aa3a0'; g.beginPath(); g.arc(px + 8, py + 8, 1.6, 0, 7); g.fill();
    }
    if (c0 === 'q') {   // scrubbed carving: a pale scar on the rock face above
      g.fillStyle = 'rgba(160,150,135,.22)'; g.fillRect(px + 1, py - 5, 14, 6);
      g.strokeStyle = 'rgba(30,24,20,.6)'; g.lineWidth = 0.5; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(px + 1 + k * 2, py - 5); g.lineTo(px + 3 + k * 2, py + 1); g.stroke(); }
      g.fillStyle = 'rgba(216,205,180,.5)'; g.fillRect(px + 2, py - 3, 1, 2); g.fillRect(px + 4, py - 3, 1, 2);
    }
    if (c0 === 'k') {   // fallen books
      for (let k = 0; k < 3; k++) {
        const bx = px + 2 + hash(x, y, k + 400) * 10, by = py + 2 + hash(x, y, k + 410) * 10, cols = ['#5a3a2a', '#3f4a3a', '#6b5a46', '#4a2f2f'];
        g.save(); g.translate(bx, by); g.rotate(hash(x, y, k + 420) * 3);
        g.fillStyle = cols[k % 4]; g.fillRect(-2.5, -1.8, 5, 3.6); g.fillStyle = 'rgba(216,205,180,.5)'; g.fillRect(-2.2, -1.5, 0.6, 3); g.restore();
      }
    }
    if (c0 === 'E') {   // collapsed earth: packed dirt with buried spines showing
      g.fillStyle = '#3a2e24'; g.fillRect(px, py, T, T);
      g.fillStyle = '#4a3b2e'; g.beginPath(); g.ellipse(px + 8, py + 6, 8, 5, hash(x, y, 430), 0, 7); g.fill();
      if (hash(x, y, 431) < 0.45) { g.fillStyle = ['#5a3a2a', '#3f4a3a', '#6b5a46'][Math.floor(hash(x, y, 432) * 3)]; g.save(); g.translate(px + 4 + hash(x, y, 433) * 8, py + 6 + hash(x, y, 434) * 6); g.rotate(hash(x, y, 435) * 2 - 1); g.fillRect(-1.2, -3, 2.4, 6); g.restore(); }
      if (!SOLID.has(tileAt(room, x, y + 1))) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, py + T - 2, T, 2); }
    }
    if ('BLM'.includes(c0)) {   // bookshelf seen from above: dark wood frame packed with spines
      g.fillStyle = '#1f1611'; g.fillRect(px, py + 1, T, T - 2);
      const spines = c0 === 'M' ? ['#4e5f63', '#5d6e6a', '#6f7f7a', '#3f5156'] : ['#4a2f24', '#3b3a2c', '#5a4632', '#2e3330', '#5b3a33', '#46402e'];
      for (let k = 0; k < 5; k++) {
        if (c0 === 'L' || c0 === 'M' || hash(x, y, k + 440) > 0.12) { g.fillStyle = spines[Math.floor(hash(x, y, k + 450) * spines.length)]; g.fillRect(px + 1 + k * 3, py + 3, 2.4, T - 6); }
      }
      g.fillStyle = '#2c2018'; g.fillRect(px, py + 1, T, 1.5); g.fillRect(px, py + T - 2.5, T, 1.5);
      if (c0 === 'M') { g.fillStyle = 'rgba(169,196,192,.35)'; g.fillRect(px + 1, py + 2, T - 2, 1); }
      if (c0 === 'L') { g.fillStyle = 'rgba(216,205,180,.55)'; g.fillRect(px + 6, py + 6, 4, 3); }   // something left on the shelf
    }
    if (c0 === 'R') {   // reading stand with an open book
      g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(px + 8, py + 13, 6, 2.5, 0, 0, 7); g.fill();
      g.fillStyle = '#2c2018'; g.fillRect(px + 7, py + 7, 2, 6);
      g.fillStyle = '#3a2a1e'; g.fillRect(px + 2, py + 3, 12, 6);
      g.fillStyle = '#d8cdb4'; g.fillRect(px + 3, py + 3.5, 4.8, 4.5); g.fillRect(px + 8.2, py + 3.5, 4.8, 4.5);
      g.fillStyle = 'rgba(40,30,24,.6)'; for (let k = 0; k < 3; k++) { g.fillRect(px + 3.6, py + 4.5 + k * 1.2, 3.6, 0.4); g.fillRect(px + 8.8, py + 4.5 + k * 1.2, 3.6, 0.4); }
    }
    if (c0 === 'h') {   // iron candle stand
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(px + 8, py + 12, 4, 1.8, 0, 0, 7); g.fill();
      g.fillStyle = '#2a2420'; g.fillRect(px + 7.4, py + 4, 1.2, 8); g.fillRect(px + 5, py + 4, 6, 1);
    }
    if (c0 === 'v') {   // stair down: steps darkening toward the bottom
      for (let k = 0; k < 4; k++) { g.fillStyle = `rgb(${50 - k * 11},${42 - k * 9},${34 - k * 8})`; g.fillRect(px, py + k * 4, T, 4); }
    }
    if (c0 === 'U') {
      for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#3d342b' : '#4a3f34'; g.fillRect(px, py + k * 4, T, 4); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px, py + k * 4 + 3, T, 1); }
    }
    if (c0 === '#' || c0 === 'D') {
      g.fillStyle = PAL.rock; g.fillRect(px, py, T, T);
      if (c0 === '#') for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(70,58,46,.18)'; g.fillRect(px + hash(x, y, k + 60) * 14, py + hash(x, y, k + 70) * 14, 2, 1); }
      // Rock face where a wall meets floor below: gives the room depth.
      if (!solid(x, y + 1)) {
        g.fillStyle = c0 === 'D' ? '#1d1a1c' : PAL.rockTop; g.fillRect(px, py + T - 6, T, 6);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px, py + T, T, 2);
        if (c0 === '#') { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + hash(x, y, 80) * 12, py + T - 6, 1, 6); }
      }
      if (!solid(x, y - 1) && y > 0) { g.fillStyle = 'rgba(90,75,60,.35)'; g.fillRect(px, py, T, 1); }
      if (!solid(x - 1, y)) { g.fillStyle = 'rgba(90,75,60,.25)'; g.fillRect(px, py, 1, T); }
      if (!solid(x + 1, y)) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px + T - 1, py, 1, T); }
    }
  }
  // Fissure vein: jittered centre points joined to each fissure neighbour, wide dim glow under a thin hot line.
  const vp = (x, y) => ({ x: (x + 0.5 + (hash(x, y, 200) - 0.5) * 0.5) * T, y: (y + 0.5 + (hash(x, y, 201) - 0.5) * 0.5) * T });
  for (const [w, col] of [[3.5, 'rgba(224,112,42,.18)'], [1.6, 'rgba(224,112,42,.55)'], [0.6, 'rgba(255,179,107,.85)']]) {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath();
    for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) {
      if (room.grid[y][x] !== '~') continue;
      const a = vp(x, y);
      // One link per tile, downward where possible, so the vein reads as a single crack rather than a mesh.
      const nb = [[0, 1], [1, 1], [-1, 1]].filter(([dx, dy]) => tileAt(room, x + dx, y + dy) === '~');
      const pick = nb.length ? nb[Math.floor(hash(x, y, 202) * nb.length)] : null;
      if (pick) { const b = vp(x + pick[0], y + pick[1]); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    }
    g.stroke();
  }
  if (MAPS[room.id].inlay) paintInlay(g, room, MAPS[room.id].inlay);
  return c;
}

// The Library's floor: concentric rings of pale inlay under the old dome, broken where the fissure and the shelves cut it.
function paintInlay(g, room, d) {
  const cx = d.x * TILE, cy = d.y * TILE;
  g.lineWidth = 0.8;
  for (const [r, a] of [[d.r * TILE, 0.22], [d.r * TILE - 5, 0.14], [d.r * TILE * 0.55, 0.16], [d.r * TILE * 0.3, 0.12]]) {
    for (let k = 0; k < 96; k++) {
      const a0 = k / 96 * Math.PI * 2, a1 = (k + 0.7) / 96 * Math.PI * 2, mx = cx + Math.cos(a0) * r, my = cy + Math.sin(a0) * r;
      const t = tileAtPx(room, mx, my);
      if (t !== '.' && t !== 'h' && t !== 'k') continue;
      if (hash(k, Math.round(r), 7) < 0.12) continue;   // missing tesserae
      g.strokeStyle = `rgba(216,205,180,${a})`; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    }
  }
  for (let k = 0; k < 16; k++) {   // spokes
    const an = k / 16 * Math.PI * 2;
    for (let s = 0.32; s < 0.95; s += 0.04) {
      const x0 = cx + Math.cos(an) * d.r * TILE * s, y0 = cy + Math.sin(an) * d.r * TILE * s;
      if (tileAtPx(room, x0, y0) !== '.') continue;
      g.fillStyle = 'rgba(216,205,180,.1)'; g.fillRect(x0 - 0.5, y0 - 0.5, 1, 1);
    }
  }
}

/* ---------- Actors (top-down, three-quarter) ---------- */
function drawActor(g, a) {
  const d = a.def, r = a.r, bob = a.moving ? Math.sin(a.walk) * 0.7 : 0, fa = Math.atan2(a.face.y, a.face.x);
  const isLead = a.hero && a.id === S.lead;
  if (a.down) return drawDowned(g, a);
  g.save(); g.translate(a.x, a.y);
  if (a.st && a.st.prone > 0) { g.scale(1.25, 0.6); }
  if (a.st && a.st.invuln > 0) g.globalAlpha = 0.55;
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(0, r * 0.55, r * 1.1, r * 0.5, 0, 0, 7); g.fill();
  if (isLead) { g.strokeStyle = 'rgba(224,112,42,.75)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, r * 0.55, r * 1.5, r * 0.75, 0, 0, 7); g.stroke(); }
  g.translate(0, -r * 0.4 + bob);
  const side = (dx, dy) => [Math.cos(fa) * dx - Math.sin(fa) * dy, Math.sin(fa) * dx + Math.cos(fa) * dy];
  const behind = a.face.y < -0.3;   // facing away: held items drawn under the body
  const items = () => DRAW_ITEM[a.id] && DRAW_ITEM[a.id](g, a, side);
  if (behind) items();
  // body
  g.fillStyle = d.body; g.beginPath(); g.ellipse(0, 0, r, r * 0.85, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.8; g.stroke();
  DRAW_BODY[a.id] && DRAW_BODY[a.id](g, a);
  // head
  const hx = a.face.x * 1.2, hy = -r * 0.75 + a.face.y * 0.8;
  g.fillStyle = HEAD[a.id] || '#2a2420'; g.beginPath(); g.arc(hx, hy, r * 0.55, 0, 7); g.fill(); g.stroke();
  if (a.id === 'raiden') { g.fillStyle = PAL.bone; g.fillRect(hx - 2 + a.face.x * 1.2, hy - 0.4 + a.face.y, 4, 0.9); }
  if (!behind) items();
  if (a.swing) drawSwing(g, a);
  if (a.flash > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,90,${a.flash * 3})`; g.beginPath(); g.ellipse(0, 0, r, r * 0.85, 0, 0, 7); g.fill(); }
  g.restore();
}
function drawDowned(g, a) {
  g.save(); g.translate(a.x, a.y);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(0, 1, a.r * 1.4, a.r * 0.6, 0, 0, 7); g.fill();
  g.fillStyle = a.def.body; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(0, 0, a.r * 1.3, a.r * 0.55, 0.2, 0, 7); g.fill();
  g.fillStyle = HEAD[a.id]; g.beginPath(); g.arc(a.r * 1.1, -1, a.r * 0.45, 0, 7); g.fill();
  g.restore();
}
function drawSwing(g, a) {
  const an = Math.atan2(a.face.y, a.face.x), k = a.swing.t / 0.18, rr = a.r + (a.swing.big ? 11 : 7);
  g.strokeStyle = a.swing.big ? `rgba(255,220,170,${k})` : `rgba(216,205,180,${k * 0.8})`; g.lineWidth = a.swing.big ? 2 : 1.2;
  g.beginPath(); g.arc(0, 0, rr, an - 0.9 + (1 - k) * 0.6, an + 0.9 - k * 0.4); g.stroke();
}
// Raiden's Shield Ally: a pale tether from the ward to Raiden.
function drawGuard(g, h) {
  const by = h.st.guard.by; if (!by || by.down) return;
  g.strokeStyle = 'rgba(216,205,180,.45)'; g.lineWidth = 0.8; g.setLineDash([2, 2]);
  g.beginPath(); g.moveTo(h.x, h.y - 2); g.lineTo(by.x, by.y - 2); g.stroke(); g.setLineDash([]);
  g.strokeStyle = 'rgba(216,205,180,.6)'; g.beginPath(); g.arc(h.x, h.y - 2, h.r + 3, 0, 7); g.stroke();
}
function drawBar(g, a) {
  const w = a.r * 2.6, x = a.x - w / 2, y = a.y - a.r * 2.2 - 3;
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - 0.5, y - 0.5, w + 1, 2.4);
  g.fillStyle = a.id === 'foe' ? '#a8462e' : '#9db06a'; g.fillRect(x, y, w * a.hp / a.maxHp, 1.4);
}

/* ---------- Foes ---------- */
// Risen: hunched, bone and rag, ember pinpoints for eyes. Husk: a bigger, earth-caked dead thing.
function drawFoe(g, e) {
  const r = e.r, husk = e.kind === 'husk', fade = e.dead ? 1 - e.deadT / 0.8 : 1;
  const bob = e.moving ? Math.sin(e.walk) * 0.6 : 0, wind = e.state === 'windup' ? 1 - e.t / e.def.windup : 0;
  g.save(); g.translate(e.x, e.y); g.globalAlpha = Math.max(0, fade);
  if (e.dead) g.scale(1 + e.deadT, 1 - e.deadT * 0.8);
  if (e.st.prone > 0) g.scale(1.25, 0.6);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(0, r * 0.55, r * 1.1, r * 0.5, 0, 0, 7); g.fill();
  g.translate(0, -r * 0.4 + bob - wind * 1.5);
  g.fillStyle = husk ? '#4a3d30' : '#8f846f'; g.beginPath(); g.ellipse(0, 0, r, r * 0.8, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.65)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = husk ? '#2e251d' : '#3a302a'; g.beginPath(); g.ellipse(0, r * 0.25, r * 0.95, r * 0.45, 0, 0, Math.PI); g.fill();   // rags / caked earth
  if (!husk) { g.strokeStyle = 'rgba(40,32,26,.8)'; g.lineWidth = 0.6; for (const yy of [-2, 0, 2]) { g.beginPath(); g.moveTo(-r * 0.5, yy); g.lineTo(r * 0.5, yy); g.stroke(); } }
  // arms raise during the wind-up
  const fa = Math.atan2(e.face.y, e.face.x);
  g.strokeStyle = husk ? '#5a4a3a' : '#a89c84'; g.lineWidth = husk ? 2.2 : 1.2; g.lineCap = 'round';
  for (const s of [-1, 1]) { const a2 = fa + s * (0.9 - wind * 0.6); g.beginPath(); g.moveTo(Math.cos(fa + s * 1.4) * r * 0.7, Math.sin(fa + s * 1.4) * r * 0.6); g.lineTo(Math.cos(a2) * (r + 2 + wind * 3), Math.sin(a2) * (r + 2 + wind * 3) - wind * 2); g.stroke(); }
  const hx = e.face.x * 1.2, hy = -r * 0.7 + e.face.y * 0.8;
  g.fillStyle = husk ? '#3d3228' : '#c8bda3'; g.beginPath(); g.arc(hx, hy, r * 0.5, 0, 7); g.fill(); g.stroke();
  if (e.face.y > -0.3) { g.fillStyle = PAL.ember; g.fillRect(hx - 1.6 + e.face.x, hy - 0.3, 0.9, 0.9); g.fillRect(hx + 0.7 + e.face.x, hy - 0.3, 0.9, 0.9); }
  if (e.st.hexed > 0) { g.strokeStyle = `rgba(224,112,42,${0.6 + Math.sin(G.time * 6) * 0.3})`; g.lineWidth = 0.7; g.beginPath(); g.arc(hx, hy - r * 0.9, 1.8, 0, 7); g.moveTo(hx - 2.5, hy - r * 0.9); g.lineTo(hx + 2.5, hy - r * 0.9); g.stroke(); }
  if (e.flash > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,240,220,${e.flash * 3})`; g.beginPath(); g.ellipse(0, 0, r, r * 0.8, 0, 0, 7); g.fill(); }
  g.restore();
}
// Wind-up warnings on the ground: a wedge for a strike, a filling circle for a slam.
function drawTelegraph(g, e) {
  if (e.dead || e.state !== 'windup' || !e.aim || e.drawTele === false) return;
  const k = 1 - e.t / e.def.windup, d = e.def;
  g.save();
  if (d.aoe) {
    const sx = e.x + e.aim.x * d.reach * 0.8, sy = e.y + e.aim.y * d.reach * 0.8;
    g.fillStyle = `rgba(224,112,42,${0.08 + k * 0.12})`; g.beginPath(); g.arc(sx, sy, d.aoe, 0, 7); g.fill();
    g.strokeStyle = 'rgba(224,112,42,.6)'; g.lineWidth = 0.8; g.beginPath(); g.arc(sx, sy, d.aoe * k, 0, 7); g.stroke();
  } else {
    const an = Math.atan2(e.aim.y, e.aim.x);
    g.fillStyle = `rgba(216,205,180,${0.06 + k * 0.14})`; g.beginPath(); g.moveTo(e.x, e.y); g.arc(e.x, e.y, d.reach + 8, an - 0.7, an + 0.7); g.closePath(); g.fill();
  }
  g.restore();
}
function drawShots(g) {
  for (const s of G.shots || []) {
    g.strokeStyle = 'rgba(224,112,42,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); g.lineTo(s.x, s.y); g.stroke();
    g.fillStyle = PAL.emberHot; g.beginPath(); g.arc(s.x, s.y, 1.8, 0, 7); g.fill();
  }
}
function drawFx(g) {
  for (const f of G.fx || []) {
    const k = f.t / f.life;
    if (f.kind === 'spark') { g.fillStyle = hexA(f.color, 1 - k); g.fillRect(f.x - 0.6, f.y - 0.6, 1.2, 1.2); }
    if (f.kind === 'ring') { g.strokeStyle = hexA(f.color, 0.7 * (1 - k)); g.lineWidth = 1; g.beginPath(); g.arc(f.x, f.y, f.r * (0.4 + k * 0.8), 0, 7); g.stroke(); }
    if (f.kind === 'text') {
      g.font = `${f.big ? 9 : 7}px "EB Garamond", Georgia, serif`; g.textAlign = 'center';
      g.fillStyle = 'rgba(0,0,0,.7)'; g.fillText(f.text, f.x + 0.5, f.y + 0.5);
      g.fillStyle = f.color.startsWith('#') ? hexA(f.color, 1 - k * k) : f.color; g.fillText(f.text, f.x, f.y); g.textAlign = 'left';
    }
  }
}
const HEAD = { raiden: '#6f6c66', ichabod: '#1c1619', kieran: '#3d3024', will: '#3f453a' };
const DRAW_BODY = {
  raiden: (g, a) => { g.fillStyle = PAL.bone; g.fillRect(-1.6, -a.r * 0.7, 3.2, a.r * 1.4); },
  ichabod: (g, a) => { g.fillStyle = '#8a3f1a'; g.fillRect(-2.2, -a.r * 0.6, 1.3, a.r * 1.3); g.fillRect(0.9, -a.r * 0.6, 1.3, a.r * 1.3); },
  kieran: (g, a) => { g.strokeStyle = '#2a1f17'; g.lineWidth = 1; g.beginPath(); g.moveTo(-a.r * 0.8, -a.r * 0.5); g.lineTo(a.r * 0.7, a.r * 0.6); g.stroke(); },
  will: (g, a) => { g.fillStyle = PAL.boneDim; g.fillRect(-a.r * 0.8, -1, a.r * 1.6, 1); },
};
const DRAW_ITEM = {
  raiden: (g, a, side) => {   // kite shield on the facing side
    const [x, y] = side(a.r * 0.9, -a.r * 0.5);
    g.save(); g.translate(x, y); g.rotate(Math.atan2(a.face.y, a.face.x));
    g.fillStyle = '#b9ad8f'; g.beginPath(); g.moveTo(-1.5, -4); g.lineTo(2, -3); g.lineTo(2.5, 0); g.lineTo(2, 3); g.lineTo(-1.5, 4); g.closePath(); g.fill();
    g.strokeStyle = '#5a5244'; g.lineWidth = 0.7; g.stroke(); g.restore();
  },
  ichabod: (g, a, side) => {  // the Tome of Four Corners, faintly burning
    const [x, y] = side(a.r * 0.8, a.r * 0.6), p = 0.6 + Math.sin(G.time * 3) * 0.2;
    g.fillStyle = '#3a2418'; g.fillRect(x - 2.2, y - 1.8, 4.4, 3.6);
    g.fillStyle = `rgba(224,112,42,${p})`; g.fillRect(x - 1.2, y - 1, 2.4, 2);
  },
  kieran: (g, a, side) => {   // paired daggers
    g.strokeStyle = PAL.steel; g.lineWidth = 0.9; g.lineCap = 'round';
    for (const s of [-1, 1]) { const [x, y] = side(a.r * 0.5, s * a.r * 0.8), [x2, y2] = side(a.r * 1.3, s * a.r * 0.9); g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); }
  },
  will: (g, a, side) => {     // the lantern
    const [x, y] = side(a.r * 0.4, a.r * 1.1);
    g.fillStyle = '#2a2420'; g.fillRect(x - 1.5, y - 2, 3, 3.5);
    g.fillStyle = '#ffc47a'; g.fillRect(x - 0.9, y - 1.3, 1.8, 2);
  },
};

/* ---------- Lighting ---------- */
// Darkness is a mask; each light punches a soft hole, then a warm additive pass tints what it touches.
function lightsInView() {
  const out = [], t = G.time;
  for (const l of G.room.lights) {
    const f = l.fissure ? 1 + Math.sin(t * 1.3 + l.flicker) * 0.18 : l.torch ? 1 + Math.sin(t * 9 + l.flicker) * 0.04 + Math.sin(t * 23 + l.flicker * 3) * 0.025 : 1;
    out.push({ x: l.x, y: l.y, r: l.r * f, color: l.color, warm: l.torch ? 0.22 : l.fissure ? 0.3 : 0.08 });
  }
  for (const a of G.actors) if (a.def.light) out.push({ x: a.x, y: a.y - 3, r: a.def.light, color: a.def.lightColor, warm: a.def.lightColor ? 0.14 : 0 });
  for (const sh of G.shots || []) out.push({ x: sh.x, y: sh.y, r: 26, color: PAL.ember, warm: 0.25 });
  if (G.scene.lights) out.push(...G.scene.lights());
  return out.filter(l => l.x + l.r > G.cam.x && l.x - l.r < G.cam.x + W && l.y + l.r > G.cam.y && l.y - l.r < G.cam.y + H);
}
function drawLighting(lights) {
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, lc.width, lc.height);
  lx.setTransform(SCALE, 0, 0, SCALE, -G.cam.x * SCALE, -G.cam.y * SCALE);
  lx.fillStyle = `rgba(4,3,3,${G.room.dark})`; lx.fillRect(G.cam.x, G.cam.y, W, H);
  lx.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const gr = lx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lx.fillStyle = gr; lx.beginPath(); lx.arc(l.x, l.y, l.r, 0, 7); lx.fill();
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lc, 0, 0); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) if (l.warm && l.color) {
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
    gr.addColorStop(0, hexA(l.color, l.warm)); gr.addColorStop(1, hexA(l.color, 0));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(l.x, l.y, l.r * 0.8, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

function drawTorch(g, l) {
  const t = G.time + l.flicker;
  if (l.candle) {
    for (const dx of [-2.2, 0, 2.2]) { g.fillStyle = PAL.bone; g.fillRect(l.x + dx - 0.6, l.y + 2, 1.2, 2.2); g.fillStyle = PAL.emberHot; g.beginPath(); g.ellipse(l.x + dx, l.y + 1.2, 0.6, 1 + Math.sin(t * 11 + dx) * 0.2, 0, 0, 7); g.fill(); }
    return;
  }
  g.fillStyle = '#2a1f17'; g.fillRect(l.x - 1, l.y - 2, 2, 7);
  const fh = 4 + Math.sin(t * 13) * 0.8;
  g.fillStyle = PAL.ember; g.beginPath(); g.ellipse(l.x, l.y - 3, 2.2, fh, 0, 0, 7); g.fill();
  g.fillStyle = PAL.emberHot; g.beginPath(); g.ellipse(l.x, l.y - 2.5, 1, fh * 0.5, 0, 0, 7); g.fill();
}

/* ---------- Frame ---------- */
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  const room = G.room; if (!room) return;
  if (!room.layer) room.layer = buildLayer(room);
  const sh = RM ? 0 : Math.max(G.shake || 0, G.shakeT > 0 ? G.shakeAmt : 0);
  const cx = Math.round((G.cam.x + (Math.random() - 0.5) * sh * 2) * SCALE) / SCALE, cy = Math.round((G.cam.y + (Math.random() - 0.5) * sh * 2) * SCALE) / SCALE;
  const cam0 = { ...G.cam }; G.cam.x = cx; G.cam.y = cy;   // lighting uses the shaken camera too
  ctx.setTransform(SCALE, 0, 0, SCALE, -cx * SCALE, -cy * SCALE);
  ctx.drawImage(room.layer, 0, 0, room.layer.width / SCALE, room.layer.height / SCALE);
  for (const l of room.lights) if (l.torch) drawTorch(ctx, l);
  if (G.scene.drawUnder) G.scene.drawUnder(ctx);
  for (const e of G.enemies || []) drawTelegraph(ctx, e);
  for (const h of heroes()) if (h.st && h.st.guard) drawGuard(ctx, h);
  [...G.actors, ...(G.enemies || [])].sort((a, b) => a.y - b.y).forEach(a => a.id === 'foe' ? (a.draw || drawFoe)(ctx, a) : drawActor(ctx, a));
  if (G.scene.drawOver) G.scene.drawOver(ctx);
  drawShots(ctx);
  drawLighting(lightsInView());
  drawFx(ctx);
  for (const a of [...heroes(), ...(G.enemies || [])]) if (G.combat && !a.dead && !a.boss && a.hp < a.maxHp) drawBar(ctx, a);
  Object.assign(G.cam, cam0);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  drawHUD(ctx);
}

// The controlled hero's keys with cooldown shading, plus faith, the healing pool and draughts.
function drawSkillBar(g) {
  const L = leader(); if (!L || !L.cd) return;
  const keys = ['j', 'k', 'l', 'h'].filter(k => SKILLS[L.id][k]);
  let x = 6; const y = H - 24;
  g.font = '6.5px "EB Garamond", Georgia, serif'; g.textBaseline = 'middle';
  for (const k of keys) {
    const name = SKILLS[L.id][k], w = g.measureText(name).width + 16, cd = L.cd[k] / SKILL_CD[L.id][k];
    const spent = (k === 'k' && L.id === 'raiden' && L.faith <= 0) || (k === 'h' && L.pool <= 0);
    g.fillStyle = 'rgba(16,13,12,.85)'; g.fillRect(x, y, w, 13);
    if (cd > 0) { g.fillStyle = 'rgba(224,112,42,.18)'; g.fillRect(x, y, w * cd, 13); }
    g.strokeStyle = L.queued === k ? PAL.ember : '#3a3027'; g.lineWidth = 0.6; g.strokeRect(x + 0.3, y + 0.3, w - 0.6, 12.4);
    g.fillStyle = PAL.ember; g.fillText(k.toUpperCase(), x + 4, y + 7);
    g.fillStyle = spent ? '#5a5046' : cd > 0 ? PAL.boneDim : PAL.bone; g.fillText(name, x + 12, y + 7);
    x += w + 3;
  }
  const extra = [];
  if (L.id === 'raiden') extra.push(`Faith ${L.faith}`, `Pool ${L.pool}`);
  if (S.inv.draught) extra.push(`Q Draught ×${S.inv.draught}`);
  if (extra.length) { g.fillStyle = PAL.boneDim; g.fillText(extra.join('   '), x + 4, y + 7); }
  g.textBaseline = 'alphabetic';
}

function drawHUD(g) {
  g.font = '7px "EB Garamond", Georgia, serif'; g.textBaseline = 'middle';
  HERO_ORDER.forEach((id, i) => {
    const x = 6 + i * 62, y = 6, alive = S.party[id].alive, lead = id === S.lead;
    g.fillStyle = 'rgba(16,13,12,.82)'; g.fillRect(x, y, 58, 18);
    g.strokeStyle = lead ? PAL.ember : '#3a3027'; g.lineWidth = lead ? 0.8 : 0.5; g.strokeRect(x + 0.25, y + 0.25, 57.5, 17.5);
    g.fillStyle = lead ? PAL.ember : PAL.boneDim; g.fillText(HEROES[id].key, x + 4, y + 7.5);
    g.fillStyle = alive ? (lead ? PAL.bone : PAL.boneDim) : '#5a5046'; g.fillText(HEROES[id].name, x + 11, y + 7.5);
    if (!alive) { g.fillStyle = '#5a5046'; g.fillRect(x + 10, y + 7, 30, 0.5); }
    const h = G.party && G.party[id];
    if (h && h.maxHp) {
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x + 1, y + 15, 56, 2);
      g.fillStyle = h.down ? '#5a5046' : h.hp / h.maxHp < 0.35 ? '#c2563c' : '#8fa05c'; g.fillRect(x + 1, y + 15, 56 * h.hp / h.maxHp, 2);
      if (h.down) { g.fillStyle = '#c2563c'; g.fillText('down', x + 40, y + 7.5); }
    }
  });
  if (G.party && (G.combat || (G.enemies || []).some(e => !e.dead))) drawSkillBar(g);
  if (G.wipe) {
    g.fillStyle = `rgba(0,0,0,${Math.min(0.85, G.wipe.t / 1.5)})`; g.fillRect(0, 0, W, H);
    g.font = '12px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center'; g.fillStyle = PAL.bone;
    g.fillText('The dark closes over you.', W / 2, H / 2 - 4);
    g.font = '7px "EB Garamond", Georgia, serif'; g.fillStyle = PAL.boneDim; g.fillText('The fight begins again.', W / 2, H / 2 + 10); g.textAlign = 'left';
  }
  if (G.prompt && !G.say && !G.naming && !G.menu) {
    g.font = '8px "EB Garamond", Georgia, serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(16,13,12,.8)';
    const w = g.measureText(G.prompt).width + 12; g.fillRect(W / 2 - w / 2, H - 22, w, 13);
    g.fillStyle = PAL.bone; g.fillText(G.prompt, W / 2, H - 15.5); g.textAlign = 'left';
  }
  if (G.paused && !G.say && !G.menu) {
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
    g.font = '12px "IM Fell English SC", Georgia, serif'; g.textAlign = 'center'; g.fillStyle = PAL.bone;
    g.fillText('Paused', W / 2, H / 2 - 6);
    g.font = '7px "EB Garamond", Georgia, serif'; g.fillStyle = PAL.boneDim; g.fillText(G.combat || liveFoes().length ? 'Change hero with 1 2 3, queue an order with J K L H, Space to resume' : 'Space to resume', W / 2, H / 2 + 8);
    g.textAlign = 'left';
  }
}
