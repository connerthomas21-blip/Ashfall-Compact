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
- A headless Playwright test for every milestone (`node test/smoke.js <dir>`, `node test/dialogue.js <dir>`, `node test/doors.js <dir>`, `node test/library.js <dir>`) that plays the slice and saves screenshots.
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
- `js/scenes.js`: `roomScene` helper, `narrate`, one entry per story scene, the doors puzzle (`CLUES`, `speakName`, `drawDoors`), Thyken (`drawThyken`)
- `js/ui.js`: DOM overlay (title, menu, story text box), frozen-world keys, boot

## Controls
WASD or arrows move. 1/2/3 or Tab (Shift+Tab goes back) changes hero. E examines or advances text. Space pauses. M mutes. Esc opens the menu.

## Milestones
1. **Scaffold** (done): scene manager, two rooms (escape cavern, sealed doors), a party of three with swap and followers, Will carrying the lantern, lighting, auto-save on every scene change, continue and save codes, Ichabod's sensing beat.
2. **Dialogue and flag engine** (done): data-driven conversations with flag conditions and voiced choices. The Thyken conversation is fully scripted, with variants for a missing Ichabod or Will and for each Mariveth name source. Thyken's chamber (the future Varn arena) has its fissure and chains. `node test/dialogue.js <dir>` plays the conversation with and without Ichabod and Will. `#scene=<id>` in the URL starts a new game in that scene.
3. **Sealed doors** (done): three seals (mountain, flame, scrubbed) and a naming panel where you type names. Spelling, case and apostrophes don't matter. Kael'Vahr comes from Will or the mural, Dinas from Ichabod or the altar. Mariveth has three routes, each recorded in `mariveth_name_source` (the first one found wins):
   - `tome`: Ichabod can hide the scrap and show it later (`ichabod_revealed_tome`, `ichabod_hid_tome`).
   - `clues`: the wine stains, the sailor's charm and the scrubbed carving, pieced together by Kieran.
   - `whisper`: Dinas speaks through Ichabod and he gets a nosebleed (`dinas_whisper`, permanent).

   A player who already knows the name and types it gets `spoken`. Wrong names add to `door_wrong`, and milestone 5 spawns that many extra undead. The doors open with a shake and lead on (to Thyken until milestone 4). `node test/doors.js <dir>` plays all three routes.
4. **The Library** (done): a buried domed archive with shelf rows, a broken floor inlay, the fissure, a collapsed far wall (`Z`), candle stands, and an ember-lit stair down to Thyken. Four loot shelves fill `S.relics` (`ember_ink`, `whetstone`, `litany`) and `S.inv.draught` (2); their effects arrive in milestone 5. Mariveth's dry shelf lets you take a sea prayer or leave it (`took_sea_prayer` / `left_sea_prayers`, a sequel hook). The reading stand holds the Keeper's ledger, whose last entry is about Varn coming through the floor. Procedural ambient audio (`js/audio.js`): a rumble bed per scene, settling earth, paper, the fissure breathing, and door and seal sounds. M mutes. `node test/library.js <dir>` checks every interactable can be reached on foot.
5. Combat core plus Scene 1's undead tail: attacks, two abilities per hero, cooldowns, prone/hexed/invulnerable, ally AI, pause for orders.
6. The Choice: both branches and the permanent-loss rule.
7. Varn: Obsidian Blade, Shard-Blades, Earthen Step, Diamond Skin, the mid-fight terrain clock, `varn_alive`.
8. Ending, the end card, and save/load polish.
9. Polish: lighting, audio hooks, tuning Varn with a bot (hard but winnable with 3 heroes, and with 2).

## Story decisions
- Will's wife lives in Olgareth: kept for now (the spec marks it as an editorial addition, not campaign canon).

## Open questions
- The spec's Sneak Attack condition, "when a shard is not adjacent", reads oddly. Probably "when no enemy is adjacent to Kieran" or "when flanking". Confirm at milestone 5.
