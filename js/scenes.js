'use strict';
/* ============================== SCENES ============================== */

// Walk-around scene on a map. hooks: enter(), update(dt), onTrigger(t), onInteract(t), lights(), drawUnder/drawOver(g).
function roomScene(mapId, hooks = {}) {
  return {
    ...hooks,
    enter(opts) {
      G.room = buildRoom(mapId);
      spawnParty();
      hooks.enter && hooks.enter(opts);
    },
    update(dt) {
      updateParty(dt);
      updateCamera(dt);
      const L = leader(), t = triggerUnder(L);
      if (t && t !== G.lastTrigger && hooks.onTrigger) hooks.onTrigger(t);
      G.lastTrigger = t;
      const it = nearestInteract(L);
      G.prompt = it ? 'E  Examine' : null;
      if (it && hit('KeyE') && hooks.onInteract) hooks.onInteract(it);
      hooks.update && hooks.update(dt);
    },
  };
}

// Show story text one block at a time. Each block is { who?, text } and pauses the world.
function narrate(blocks, then) { G.say = { blocks, i: 0, then }; renderUI(); }

/* ---------- Scene 1: Escape (combat tail arrives in milestone 5) ---------- */
SCENES.escape = roomScene('escape', {
  amb: 'cavern',
  enter(opts) {
    if (opts.fromTitle && !flag('escape_intro')) {
      setFlag('escape_intro');
      narrate([
        { text: 'The last of the dead lie still. Whatever Ichabod\'s book woke in the barrow, it has stopped answering the call, and the passage behind you is quiet except for the dust still settling.' },
        { who: 'Will', text: 'The Library is this way. Stay near the lantern. The ground down here moves when it likes.' },
      ]);
    }
  },
  onTrigger(t) {
    if (t.kind === 'S' && !flag('ichabod_sensed')) {
      setFlag('ichabod_sensed');
      narrate([
        { text: 'Ichabod stops walking. The Tome of Four Corners is warm against his ribs, warmer than a book has any right to be.' },
        { who: 'Ichabod', text: 'Something is below us. Old. It flares and then it gutters, like a fire someone keeps feeding that will not stay lit. And there is someone near it. One of hers. I can feel her attention on him the way you feel a stranger looking at you in a crowd.' },
        { who: 'Raiden', text: 'Hers.' },
        { who: 'Ichabod', text: 'Dinas. Don\'t ask me to explain it twice.' },
      ]);
    }
    if (t.kind === 'X') go('doors');
  },
});

/* ---------- Scene 2: The Sealed Doors ----------
  Speak Kael'Vahr, Dinas and Mariveth (any order) into the naming panel to open the doors.
  Mariveth has three routes: the Tome scrap or Dinas's whisper (both in DIALOGUES.doors), or the three clues below.
  Wrong names count up in S.flags.door_wrong; milestone 5 turns them into extra undead.
*/
const GOD_NAMES = { kaelvahr: "Kael'Vahr", dinas: 'Dinas', mariveth: 'Mariveth' };
const normName = s => String(s).toLowerCase().replace(/[^a-z]/g, '');
const CLUES = {
  c: { flag: 'clue_mural', lines: [
    { text: 'A slab of rock has been smoothed by hand and cut with a figure: a giant of stone lying beneath three peaks, chains drawn across his chest. Under him, deep enough to have outlasted everything else, is a name.' },
    { who: 'Carving', text: 'KAEL\'VAHR' },
  ], set: { knows_kaelvahr: true } },
  a: { flag: 'clue_altar', lines: [
    { text: 'An altar, or what fire left of one. The stone is black to the depth of a finger. Ash has gathered in the cracks and never been swept out.' },
    { who: 'ichabod', text: 'Dinas. She was fed here, once. The stone still remembers being warm.', if: { alive: 'ichabod' } },
  ], set: { knows_dinas: true } },
  m: { flag: 'clue_stains', mariveth: true, lines: [
    { text: 'A shallow bowl worn into the rock, stained the dark purple of old wine. Three clay cups lie beside it, all tipped the same way: toward a seam in the wall where water beads and runs.' },
    { text: 'Someone poured these out for the water. Not into it. For it.' },
  ] },
  n: { flag: 'clue_charm', mariveth: true, lines: [
    { text: 'Bones, long settled, with a tin charm still caught on the cord around the neck. It is a sailor\'s charm, the kind fishermen nail above a door, stamped with a wave.' },
    { text: 'Letters were stamped around the rim. Most have worn away. The last of them survive: …VETH.' },
  ] },
  q: { flag: 'clue_carving', mariveth: true, lines: [
    { text: 'A carving on the wall has been scraped away with real care, by someone who meant it never to be read again. They were thorough with all of it except the very start, where the chisel slipped or tired.' },
    { text: 'M A R I, and then nothing but scars.' },
  ] },
};
function examineClue(kind) {
  const c = CLUES[kind];
  const blocks = c.lines.filter(l => cond(l.if)).map(toBlock);
  setFlag(c.flag); if (c.set) Object.assign(S.flags, c.set);
  if (c.mariveth && ['clue_stains', 'clue_charm', 'clue_carving'].every(flag) && !flag('clue_assembled')) {
    setFlag('clue_assembled');
    const by = S.party.kieran.alive ? 'kieran' : S.lead;
    blocks.push({ who: whoName(by), text: 'Wine poured out for the water. A sailor\'s charm, …veth. A name scrubbed off a wall, Mari… Somebody came all the way down here to pray to the sea, and somebody else came after them to make sure nobody ever did again.' },
                { who: whoName(by), text: 'Mari. Veth. Mariveth.' });
    S.flags.knows_mariveth = true;
    if (S.flags.mariveth_name_source === undefined) S.flags.mariveth_name_source = 'clues';
  }
  narrate(blocks);
  save();
}

SCENES.doors = roomScene('doors', {
  amb: 'cavern',
  enter() {
    G.doorOpen = flag('doors_open') ? 1 : 0;
    if (flag('doors_open')) openDoorTiles();
    G.doorSpan = { x0: 10 * TILE, x1: 20 * TILE, y: 2 * TILE };
  },
  update(dt) {
    if (G.opening) {
      G.doorOpen = Math.min(1, G.doorOpen + dt / 2.4);
      G.shake = 1.5 * (1 - G.doorOpen);
      if (G.doorOpen >= 1) { G.opening = false; G.shake = 0; openDoorTiles(); }
    }
  },
  onInteract(t) {
    if (t.kind === 'i') {
      runDialogue('doors', act => { if (act === 'naming') openNaming(); }, flag('doors_read') ? 'hub' : 'intro');
      setFlag('doors_read');
    } else if (CLUES[t.kind]) examineClue(t.kind);
  },
  onTrigger(t) { if (t.kind === 'X') go('library'); },
  drawUnder: g => drawDoors(g),
  lights: () => G.doorOpen > 0 ? [{ x: (G.doorSpan.x0 + G.doorSpan.x1) / 2, y: G.doorSpan.y, r: 40 + G.doorOpen * 50, color: PAL.bone, warm: 0.06 * G.doorOpen }] : [],
});

function openDoorTiles() {
  for (let x = 0; x < G.room.w; x++) if (G.room.grid[2][x] === 'D') G.room.grid[2][x] = '.';
  G.room.layer = null;
}

// The naming panel (js/ui.js renders it). Names persist in S.flags.named.
function openNaming() { G.naming = { msg: null }; renderUI(); }
function speakName(raw) {
  const n = normName(raw), named = S.flags.named || (S.flags.named = {});
  if (!n) return;
  G.naming = null;
  if (GOD_NAMES[n]) {
    if (n === 'mariveth' && S.flags.mariveth_name_source === undefined) S.flags.mariveth_name_source = 'spoken';   // the player knew it already
    const fresh = !named[n]; named[n] = true; save(); sfx('seal');
    const left = Object.keys(GOD_NAMES).filter(k => !named[k]);
    const seal = { kaelvahr: 'mountain', dinas: 'flame', mariveth: 'scrubbed' }[n];
    if (!left.length) return narrate([
      { text: `"${GOD_NAMES[n]}."` },
      { text: 'The scrubbed seal fills with a pale light, like moonlight seen from underwater. For a moment all three seals burn together.' },
      { text: 'Then the seam down the middle of the doors cracks open with a sound like a bone set back into place, and the two halves of the slab grind apart, and the air that comes out of the dark beyond is cold and smells of old paper and fresh earth.' },
    ], () => { setFlag('doors_open'); G.opening = true; save(); sfx('doors'); });
    return narrate([{ text: fresh ? `"${GOD_NAMES[n]}." The ${seal} seal warms, and a faint light settles into its lines and stays there.` : `"${GOD_NAMES[n]}." The ${seal} seal is already lit. It does not need telling twice.` }]);
  }
  S.flags.door_wrong = (S.flags.door_wrong || 0) + 1; save(); sfx('thud');
  narrate([
    { text: 'The name falls flat against the stone and goes nowhere.' },
    { text: S.flags.door_wrong === 1 ? 'Somewhere behind you, in the dark you came through, something that was lying still is no longer lying still.' : 'Behind you, in the dark, more of the dead are getting up. You can hear the dry knock of them finding their feet.' },
  ]);
}

// Doors drawn live so they can open: two halves of the slab slide apart, three seals light as names are spoken.
function drawDoors(g) {
  const sp = G.doorSpan, o = G.doorOpen, named = S.flags.named || {}, half = (sp.x1 - sp.x0) / 2, mid = sp.x0 + half;
  const ox = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  for (const side of [-1, 1]) {
    const w = half - 2, x = side < 0 ? sp.x0 + 2 - o * (w - 6) : mid + o * (w - 6);
    g.save(); g.beginPath(); g.rect(sp.x0, sp.y - 12, sp.x1 - sp.x0, TILE + 12); g.clip();
    g.fillStyle = PAL.obsidian; g.fillRect(x + ox, sp.y - 10, w, TILE + 10);
    g.strokeStyle = '#2c2629'; g.lineWidth = 1; g.strokeRect(x + ox + 0.5, sp.y - 9.5, w - 1, TILE + 9);
    g.fillStyle = 'rgba(216,205,180,.35)';
    for (let i = 0; i < 12; i++) g.fillRect(x + ox + 6 + i * ((w - 12) / 12), sp.y - 6 + (i % 3), 3, 1);
    g.restore();
  }
  if (o < 0.15) {
    const seals = [['kaelvahr', mid - 22], ['dinas', mid], ['mariveth', mid + 22]];
    for (const [k, x] of seals) {
      const lit = named[k], y = sp.y + 6;
      g.fillStyle = '#0a0809'; g.beginPath(); g.arc(x + ox, y, 4.5, 0, 7); g.fill();
      g.strokeStyle = lit ? (k === 'mariveth' ? '#a9c4c0' : PAL.ember) : k === 'mariveth' ? 'rgba(160,150,135,.25)' : 'rgba(216,205,180,.45)';
      g.lineWidth = 0.9; g.beginPath();
      if (k === 'kaelvahr') { g.moveTo(x - 3 + ox, y + 2); g.lineTo(x - 1 + ox, y - 2); g.lineTo(x + ox, y); g.lineTo(x + 1.5 + ox, y - 2.5); g.lineTo(x + 3 + ox, y + 2); }
      else if (k === 'dinas') { g.moveTo(x + ox, y + 2.5); g.quadraticCurveTo(x - 3 + ox, y, x + ox, y - 3); g.quadraticCurveTo(x + 3 + ox, y, x + ox, y + 2.5); }
      else g.arc(x + ox, y, 2.6, 0, 7);
      g.stroke();
    }
  }
}

/* ---------- Scene 3: The Library ---------- */
SCENES.library = roomScene('library', {
  amb: 'library',
  enter() {
    G.loot = G.room.triggers.filter(t => t.kind === 'L');   // map order = LOOT order
    const vs = G.room.triggers.filter(t => t.kind === 'v');
    G.room.stair = { x: vs.reduce((a, t) => a + t.x, 0) / vs.length, y: vs.reduce((a, t) => a + t.y, 0) / vs.length };
    if (!flag('library_entered')) { setFlag('library_entered'); runDialogue('library_enter'); }
  },
  onInteract(t) {
    if (t.kind === 'L') return takeLoot(G.loot.indexOf(t));
    if (t.kind === 'M') return runDialogue('mariveth_shelf', null, flag('took_sea_prayer') || flag('left_sea_prayers') ? 'again' : 'a');
    if (t.kind === 'R') return runDialogue('reading_stand');
    if (t.kind === 'Z') return runDialogue('buried_wall');
  },
  onTrigger(t) { if (t.kind === 'v') go('thyken'); },
  // The stair breathes up light from the fissure below it.
  lights: () => { const s = G.room.stair; return [{ x: s.x, y: s.y, r: 70 + Math.sin(G.time * 1.1) * 8, color: PAL.ember, warm: 0.2 }]; },
});

function takeLoot(i) {
  const L = LOOT[i], key = 'loot_' + i;
  if (flag(key)) return narrate([{ text: 'The shelf has nothing else worth taking. Only books, and the books are not yours.' }]);
  setFlag(key);
  if (L.item) S.inv[L.item] = (S.inv[L.item] || 0) + (L.n || 1);
  if (L.relic) S.relics[L.relic] = true;
  save();
  narrate([...L.lines.filter(l => cond(l.if)).map(toBlock), { who: 'Taken', text: `${L.name}. ${L.note}` }]);
}

/* ---------- Scene 4: Thyken (the Library hub above arrives in milestone 4) ---------- */
SCENES.thyken = roomScene('deep', {
  amb: 'deep',
  enter() {
    const k = G.room.triggers.find(t => t.kind === 'K');
    G.thyken = { x: k.x, y: k.y + 2 };
  },
  onInteract(t) {
    if (t.kind !== 'K') return;
    if (flag('thyken_heard')) {
      narrate([{ who: 'Thyken', text: 'Take as long as you need.' }, { text: 'The Choice is built in milestone 6.' }]);
      return;
    }
    runDialogue('thyken');
  },
  lights: () => [{ x: G.thyken.x, y: G.thyken.y - 4, r: 30, color: PAL.bone, warm: 0.05 }],
  drawUnder: g => drawThyken(g, G.thyken),
});

// Thyken: seated, robed, bound at wrists and throat by obsidian chains running to rings in the floor.
function drawThyken(g, p) {
  const t = G.time, sheen = 0.25 + Math.sin(t * 2) * 0.12;
  const anchors = [[-22, -10], [22, -12], [-20, 14], [24, 12]], holds = [[-5, 0], [5, 0], [-2, -6], [2, -6]];
  g.save(); g.translate(p.x, p.y);
  for (const [ax, ay] of anchors) { g.strokeStyle = '#3b332b'; g.lineWidth = 1.4; g.beginPath(); g.arc(ax, ay, 2.2, 0, 7); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(0, 5, 10, 4.5, 0, 0, 7); g.fill();
  // robe, seated
  g.fillStyle = '#6d604f'; g.beginPath(); g.ellipse(0, 1, 8.5, 6, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 0.8; g.stroke();
  g.fillStyle = '#5a4e40'; g.fillRect(-5.5, 2, 11, 3);
  g.fillStyle = '#c9bca2'; g.beginPath(); g.arc(-5, 1, 1.6, 0, 7); g.arc(5, 1, 1.6, 0, 7); g.fill();   // hands on knees
  // head: bald, bowed slightly
  g.fillStyle = '#b8a98f'; g.beginPath(); g.arc(0, -6, 3.6, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#d8cdb4'; g.beginPath(); g.ellipse(0, -3.6, 2.2, 1.4, 0, 0, Math.PI); g.fill();   // beard
  // chains: links along each line
  anchors.forEach(([ax, ay], i) => {
    const [hx, hy] = holds[i], n = 7;
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = lerp(hx, ax, u), y = lerp(hy, ay, u) + Math.sin(u * Math.PI) * 2.5;
      g.fillStyle = '#0d0b0c'; g.beginPath(); g.ellipse(x, y, 1.5, 1, Math.atan2(ay - hy, ax - hx) + (k % 2) * 1.2, 0, 7); g.fill();
      g.fillStyle = `rgba(224,112,42,${sheen * (k % 2 ? 0.6 : 1)})`; g.fillRect(x - 0.3, y - 0.6, 0.6, 0.4);
    }
  });
  g.restore();
}
