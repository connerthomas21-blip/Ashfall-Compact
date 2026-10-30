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
