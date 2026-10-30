# The Ashfall Compact: The Deep Echo Library — build plan

Design: `GAME_SPEC.md` (section 2 lore is canonical; ask before any choice that changes the story).

## Decisions (agreed at kickoff)
- **Stack:** plain JS, no build step, same as Starbreaker Saga (`index.html` + `js/*.js`, loaded in order). This replaces the spec's Vite/TS/Phaser.
- **Combat:** real-time with cooldowns and a Space pause. Varn acts on a fixed rhythm (an action, then a free bonus beat every few seconds). "One round" in the spec means about 6 seconds.
- **Art:** muted shapes and lighting, text-only dialogue in paragraphs, real art dropped in later. Visuals stay as they are until the systems are done, so we avoid another round of art redos.
- **Repo:** a new GitHub repo created by the user, committed after each milestone.

## Lessons carried over from Starbreaker Saga
- A headless Playwright test for every milestone (`node test/smoke.js <dir>`) that plays the slice and saves screenshots.
- A `window.__fast`-style hook for balance bots once combat exists (milestone 5).
- Save codes as well as localStorage.

## Files
- `js/core.js`: constants, saved state `S` and runtime state `G`, save/load and save codes, input, scene manager (`go`), main loop
- `js/data.js`: palette `PAL`, `HEROES`, `WILL`, ASCII `MAPS` (legend at the top)
- `js/render.js`: canvas scaling, cached room layer, top-down actors, darkness mask and warm light pass, HUD
- `js/world.js`: rooms, circle-vs-tile collision, leader movement, breadcrumb followers, hero swap, triggers, camera
- `js/scenes.js`: `roomScene` helper, `narrate`, one entry per story scene
- `js/ui.js`: DOM overlay (title, menu, story text box), frozen-world keys, boot

## Controls
WASD or arrows move. 1/2/3 or Tab (Shift+Tab goes back) changes hero. E examines or advances text. Space pauses. Esc opens the menu.

## Milestones
1. **Scaffold** (done): scene manager, two rooms (escape cavern, sealed doors), a party of three with swap and followers, Will carrying the lantern, lighting, auto-save on every scene change, continue and save codes, Ichabod's sensing beat.
2. Dialogue and flag engine (scripts as data, branches, conditions on flags), with the Thyken conversation fully scripted.
3. Sealed-door puzzle with all three Mariveth routes and the wrong-guess consequence.
4. The Library hub: exploration, loot shelves, Mariveth's shelf, the reading stand, fissure, staircase.
5. Combat core plus Scene 1's undead tail: attacks, two abilities per hero, cooldowns, prone/hexed/invulnerable, ally AI, pause for orders.
6. The Choice: both branches and the permanent-loss rule.
7. Varn: Obsidian Blade, Shard-Blades, Earthen Step, Diamond Skin, the mid-fight terrain clock, `varn_alive`.
8. Ending, the end card, and save/load polish.
9. Polish: lighting, audio hooks, tuning Varn with a bot (hard but winnable with 3 heroes, and with 2).

## Story decisions
- Will's wife lives in Olgareth: kept for now (the spec marks it as an editorial addition, not campaign canon).

## Open questions
- The spec's Sneak Attack condition, "when a shard is not adjacent", reads oddly. Probably "when no enemy is adjacent to Kieran" or "when flanking". Confirm at milestone 5.
