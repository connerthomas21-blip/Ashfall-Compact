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

/* ---------- Scene 2: The Sealed Doors (puzzle arrives in milestone 3) ---------- */
SCENES.doors = roomScene('doors', {
  onInteract() {
    narrate([
      { text: 'The doors are a single slab of black stone, split down the middle by a seam too fine to fit a blade into. Letters run across them in a hand that was patient and is long dead.' },
      { who: 'Inscription', text: '"The Forgotten Ones, Once Sharing in this Dominion, Now Finding Themselves Enslaved…"' },
      { text: 'The doors do not move. They are waiting to be told something.' },
    ]);
  },
});

/* ---------- Scene 4: Thyken (the Library hub above arrives in milestone 4) ---------- */
SCENES.thyken = roomScene('deep', {
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
