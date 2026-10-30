# The Ashfall Compact: The Deep Echo Library — build plan

Design: `GAME_SPEC.md` (section 2 lore is canonical; ask before any choice that changes the story).

## Decisions (agreed at kickoff)
- **Stack:** plain JS, no build step, same as Starbreaker Saga (`index.html` + `js/*.js`, loaded in order). This replaces the spec's Vite/TS/Phaser.
- **Combat:** real-time with cooldowns and a Space pause. Varn acts on a fixed rhythm (an action, then a free bonus beat every few seconds). "One round" in the spec means about 6 seconds.
- **Art:** muted shapes and lighting, text-only dialogue in paragraphs, real art dropped in later. Visuals stay as they are until the systems are done, so we avoid another round of art redos.
- **Repo:** a new GitHub repo created by the user, committed after each milestone.

## Testing notes
- Tests that press keys must wait for animation frames between presses (see `press` in `test/dialogue.js`). Otherwise two presses can land in the same frame or skip one, and lines get skipped.

## Lessons carried over from Starbreaker Saga
- A headless Playwright test for every milestone (`node test/smoke.js <dir>`, `node test/dialogue.js <dir>`, `node test/doors.js <dir>`, `node test/library.js <dir>`, `node test/combat.js <dir>`) that plays the slice and saves screenshots.
- A `window.__fast`-style hook for balance bots once combat exists (milestone 5).
- Save codes as well as localStorage.

## Files
- `js/core.js`: constants, saved state `S` and runtime state `G`, save/load and save codes, input, scene manager (`go`), main loop
- `js/data.js`: palette `PAL`, `HEROES`, `WILL`, ASCII `MAPS` (legend at the top)
- `js/render.js`: canvas scaling, cached room layer, top-down actors, darkness mask and warm light pass, HUD
- `js/world.js`: rooms, circle-vs-tile collision, leader movement, breadcrumb followers, hero swap, triggers, camera
- `js/script.js`: conversations as data (`DIALOGUES`), one entry per conversation
- `js/dialogue.js`: dialogue engine with nodes, choices voiced by a named hero or the leader, flag conditions (`has`, `not`, `eq`, `alive`, `will`), hub revisits (`again`), and `lintDialogue`
- `js/audio.js`: WebAudio ambience (`ambience(kind)` per scene via `amb`), `sfx(name)` hooks, mute
- `js/combat.js`: tuning (`TUNE`, `FOES`), damage and statuses, abilities (`SKILL_FN`), enemy brain, ally AI (`AI`), encounters (snapshot and restore), effects
- `js/scenes.js`: `roomScene` helper, `narrate`, one entry per story scene, the doors puzzle (`CLUES`, `speakName`, `drawDoors`), Thyken (`drawThyken`)
- `js/ui.js`: DOM overlay (title, menu, story text box), frozen-world keys, boot

## Controls
WASD or arrows move. 1/2/3 or Tab (Shift+Tab goes back) changes hero. J attacks, K and L use abilities, H is Lay on Hands, Q drinks a draught. E examines or advances text. Space pauses. M mutes. Esc opens the menu.

## Milestones
1. **Scaffold** (done): scene manager, two rooms (escape cavern, sealed doors), a party of three with swap and followers, Will carrying the lantern, lighting, auto-save on every scene change, continue and save codes, Ichabod's sensing beat.
2. **Dialogue and flag engine** (done): data-driven conversations with flag conditions and voiced choices. The Thyken conversation is fully scripted, with variants for a missing Ichabod or Will and for each Mariveth name source. Thyken's chamber (the future Varn arena) has its fissure and chains. `node test/dialogue.js <dir>` plays the conversation with and without Ichabod and Will. `#scene=<id>` in the URL starts a new game in that scene.
3. **Sealed doors** (done): three seals (mountain, flame, scrubbed) and a naming panel where you type names. Spelling, case and apostrophes don't matter. Kael'Vahr comes from Will or the mural, Dinas from Ichabod or the altar. Mariveth has three routes, each recorded in `mariveth_name_source` (the first one found wins):
   - `tome`: Ichabod can hide the scrap and show it later (`ichabod_revealed_tome`, `ichabod_hid_tome`).
   - `clues`: the wine stains, the sailor's charm and the scrubbed carving, pieced together by Kieran.
   - `whisper`: Dinas speaks through Ichabod and he gets a nosebleed (`dinas_whisper`, permanent).

   A player who already knows the name and types it gets `spoken`. Wrong names add to `door_wrong`, and milestone 5 spawns that many extra undead. The doors open with a shake and lead on (to Thyken until milestone 4). `node test/doors.js <dir>` plays all three routes.
4. **The Library** (done): a buried domed archive with shelf rows, a broken floor inlay, the fissure, a collapsed far wall (`Z`), candle stands, and an ember-lit stair down to Thyken. Four loot shelves fill `S.relics` (`ember_ink`, `whetstone`, `litany`) and `S.inv.draught` (2); their effects arrive in milestone 5. Mariveth's dry shelf lets you take a sea prayer or leave it (`took_sea_prayer` / `left_sea_prayers`, a sequel hook). The reading stand holds the Keeper's ledger, whose last entry is about Varn coming through the floor. Procedural ambient audio (`js/audio.js`): a rumble bed per scene, settling earth, paper, the fissure breathing, and door and seal sounds. M mutes. `node test/library.js <dir>` checks every interactable can be reached on foot.
5. **Combat** (done, `js/combat.js`): real time. J is the basic attack (hold it), K and L are abilities, H is Raiden's Lay on Hands, Q drinks a draught.
   - Raiden: Smite (3 faith per fight), Shield Ally (leaps to an ally; for 3.5s Raiden takes their hits at half), Lay on Hands (a 30-point pool, or 45 with the Litany, which also revives).
   - Ichabod: Eldritch Blast (homing bolt, +30% with Ember ink), Hex (+35% damage taken for 12s), Dinas's Pull (a blink that slides around walls).
   - Kieran: Dagger, Sneak Attack (bonus when flanking or when no other enemy or shard is beside him, +40% with the whetstone), Cunning Dash (untouchable for 0.3s). Evasion halves area damage.
   - Statuses: prone, hexed, invulnerable, guard. Downed heroes get back up at 30% when the fight ends.
   - If every hero is downed, the encounter restarts from the moment it began.
   - Space pauses; while paused you can change hero and queue an ability as an order.
   - Allies fight on their own: Raiden protects the weakest ally and heals, Ichabod keeps his distance and hexes, Kieran flanks.
   - Undead: risen (a wedge warning before each strike) and husks (an area slam with a ring warning that knocks heroes prone).
   - Scene 1 is now the tail of the fight, and Will hides during combat. Each wrong name at the doors wakes 2 to 4 undead from the passage behind.

   Tuning lives in `TUNE` and `FOES`. `node test/combat.js <dir>` plays the opening fight (about 10s, the party ends at roughly 85% / 100% / 50% HP), checks every ability, a wipe and restart, a pause order, and the doors' undead.
6. The Choice: both branches and the permanent-loss rule.
7. Varn: Obsidian Blade, Shard-Blades, Earthen Step, Diamond Skin, the mid-fight terrain clock, `varn_alive`.
8. Ending, the end card, and save/load polish.
9. Polish: lighting, audio hooks, tuning Varn with a bot (hard but winnable with 3 heroes, and with 2).

## Story decisions
- Will's wife lives in Olgareth: kept for now (the spec marks it as an editorial addition, not campaign canon).

## Open questions
- Sneak Attack: implemented as "when flanking, or when no other enemy (or shard) is beside Kieran". Confirm this reading.
