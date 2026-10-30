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
- `node test/all.js <dir>` runs everything; run it before every commit.
- A headless Playwright test for every milestone (`node test/smoke.js <dir>`, `node test/dialogue.js <dir>`, `node test/doors.js <dir>`, `node test/library.js <dir>`, `node test/combat.js <dir>`, `node test/choice.js <dir>`, `node test/varn.js <dir>`, `node test/ending.js <dir>`, `node test/playthrough.js <dir>`) that plays the slice and saves screenshots.
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
- `js/varn.js`: the boss: tuning (`VARN`, `PARTY_SCALE`), his brain, shards, cracks, arcs, the ending
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
6. **The Choice** (done): once Thyken has been heard, going back to him opens a full-page decision (`screen: true` dialogues show every paragraph at once, with no timer). "Not yet" lets you walk away.
   - Release: a confirmation, then the chains shatter, Thyken leaves, and the stair becomes the way out (`released_thyken`).
   - Sacrifice: Will volunteers if present and each living hero gives a reaction line, or any hero offers themselves, with a "cannot be undone" confirmation. The rite ends with Thyken's line from the spec, then Varn rises (`sacrificed_thyken` + `sacrificed_will` or `sacrificed_hero`).
   - Permanent loss (`choiceMade`): the hero's `S.party[id].alive` becomes false and they are removed from the party for the rest of the save. Will's loss sets `S.will = false`.

   Placeholder scenes `varn` and `after` stand in for milestones 7 and 8. `node test/choice.js <dir>` plays release, sacrificing Will, and sacrificing a hero (including a reload check).
7. **Varn** (done, `js/varn.js`): he acts on beats, with an action every 3.2s and a free bonus beat 1s later.
   - Obsidian Blade: a 40px wedge with a 1.15s glowing wind-up that hits everyone in it for 32 to 36. That nearly downs Ichabod, and two hits drop anyone. He keeps pressing whoever he last hit.
   - Shard-Blades: three orbiting shards with 10 HP each. They dart at anyone who comes close or tries to get far away.
   - Earthen Step: he sinks and rises behind whoever hangs back, and often uses it right after a blade hit lands.
   - Bonus beats: a shard dart, a floor crack (a telegraphed ring that knocks heroes prone), or a short shift.
   - Diamond Skin: once, at half HP, he takes nothing for 6s, with a pale crystal look, a chime and "Diamond" pop-ups.
   - From half HP, residual arcs strike everyone every 3s and grow over time. Varn takes 8× the arc damage, so the clock cuts both ways.
   - At 0 HP the floor swallows him and sets `varn_alive`. The stair stays blocked by rock until then.
   - The ally AI sidesteps the blade after a reaction delay and not every time (75%). Movement uses grid pathfinding around the fissure and walls (`navTo`).

   **About the spec's numbers.** "~155 HP" is a tabletop figure. In real time the heroes act about every second, not every six, so a straight conversion gives a fight of 30 to 40 seconds. Varn has 1,500 HP against the full party, scaled by who was sacrificed (`PARTY_SCALE`). Over 14 fights per party the autopilot bot won 57% with all three heroes (56 to 65s), 64% with Ichabod and Kieran, 57% with Raiden and Kieran, and 71% with Raiden and Ichabod (a slow fight of about 2 minutes). Its losses usually end with Varn under 30%. `node test/varn.js <dir> [n]` runs the mechanics checks, screenshots and the balance table.
8. **Ending** (done):
   - The Quiet After: you walk back up through the Library from the stair. Each survivor, and Will if he lived, says one reflective line as a caption that doesn't pause play (`REFLECTIONS`, first matching condition wins). Ichabod's line after the whisper route is the permanent cost of `dinas_whisper`.
   - The surface: grey dawn, falling ash, the survivors at the cave mouth, and smoke on the northern horizon toward Olgareth.
   - The end card gives what carries forward as paragraphs (`endingParagraphs`), then "To be continued: The Inquisition.", then a save code for the sequel and a credits line.
   - `chapter_complete` is set, and Continue on a finished save returns to the end card.

   `node test/ending.js <dir>` covers the release, Will-sacrifice and hero-sacrifice endings.
9. **Polish** (done):
   - Title backdrop: the Library's inlay with the glowing fissure and falling ash.
   - Shard-Blades are summoned whenever their cooldown is up.
   - Varn rebalanced over 14 fights per party.
   - `node test/playthrough.js <dir>` plays from the title screen to the end card down both branches through real scene transitions.
   - The game is published as a private claude.ai artifact (index.html plus js/).

## Next ideas (not built)
- Touch controls, so the game is playable on a phone (it needs a keyboard today).
- Real art in the asset slots: the draw functions per hero (`DRAW_BODY`, `DRAW_ITEM`), `drawFoe`, `drawVarn`, `drawThyken`.
- A hand-played tuning pass on Varn. The bot dodges 75% of blades, and a person may do better or worse.

## Story decisions
- Will's wife lives in Olgareth: kept for now (the spec marks it as an editorial addition, not campaign canon).

## Open questions
- Sneak Attack: implemented as "when flanking, or when no other enemy (or shard) is beside Kieran". Confirm this reading.
