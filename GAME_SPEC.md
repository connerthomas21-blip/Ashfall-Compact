# The Ashfall Compact: The Deep Echo Library
### Game Design and Build Spec (for Claude Code)

## 1. What this is

A grimdark, top-down 2D action-RPG vertical slice built as a browser game (HTML5 canvas with TypeScript, Vite, and Phaser 3). Playtime is 45 to 60 minutes. It adapts the Deep Echo Library arc of the tabletop campaign "The Ashfall Compact": a three-hero party descends into a buried archive, makes an irreversible moral choice about a sacrifice, and fights an earth avatar if they choose to pay the price. Choices carry visible consequences, and the game ends on a hook for the Inquisition arc rather than a clean resolution.

Design pillars: decisions must matter and stay visible; the moral choice is the centerpiece, not the combat; combat is genuinely hard and tactical, never hand-holdy; pacing is fast, with no filler dungeon crawl.

## 2. Setting and lore (canonical, do not alter)

Four gods once shared the world: Kael'Vahr (earth), Mariveth (water), Dinas (fire), and a fourth whose identity is not yet established in the campaign (Varn was originally written as a storm god, but he is now the avatar of Kael'Vahr, so leave the fourth unnamed and do not invent one). The Omnisiah, a plotting and scheming old demon worshipped as the one true god, rose to power through conquest the Church calls "the Unification." Kael'Vahr was bound beneath the Ironpeak Mountains and still dreams, which is why the earth trembles. Mariveth was erased: every temple, text, and prayer destroyed until the world forgot her. She endures, dispersed through all water. Dinas bargained with the Omnisiah and was allowed to work through individual warlocks. Varn is the avatar of Kael'Vahr and works with earth. He is not a storm god.

Dinas is an old and vengeful god who was once a mortal. She powered herself up through human sacrifice, mass-burning captured enemies of her worship. She is now dwindling and at risk of succumbing to her mortality.

The Omnisiah has sensed Kael'Vahr stirring and sent an Inquisition to root out the corrupted, including Thyken. It is headed for the town of Olgareth. Right now all the gods are vulnerable: the Omnisiah is weakened for reasons unknown, Dinas is exposed, and Kael'Vahr, though awakening, can still be chained again. This vulnerable-gods window is the campaign's spine.

The Deep Echo Library is an archive swallowed by the earth. Its doors are sealed with the inscription: "The Forgotten Ones, Once Sharing in this Dominion, Now Finding Themselves Enslaved…" Speaking the names Kael'Vahr, Dinas, and Mariveth opens them. Inside is the smell of old paper replaced by fresh dirt, endless rows of books, and a once-ornate dome broken by a central fissure, with the far side collapsed and burying untold books. A staircase at the center descends to Thyken, the ancient Keeper, one of Dinas's oldest servants, who remembers Mariveth's forgetting firsthand.

## 3. Playable characters (level 5, party of three)

Raiden, paladin. Frontline tank. Abilities: Smite (spend a resource for a big radiant hit), Lay on Hands (heal pool), Shield Ally (take a hit meant for a teammate). His faith is the Omnisiah's, so the story pressures him hardest.

Ichabod, warlock. Ranged damage. Abilities: Eldritch Blast (reliable ranged hit), Hex (marked target takes extra damage), Dinas's Pull (short-range teleport). He carries the Tome of Four Corners and has a patron connection to Dinas that senses Thyken and the ancient power below.

Kieran, rogue. Mobile striker. Abilities: Sneak Attack (bonus damage when flanking or when a shard is not adjacent), Cunning Dash (disengage and move free), Evasion (halve area damage). His sister, now a Black Chain assassin working with Victor, is a dialogue thread.

Will, NPC. Not controllable and not a fighter. He guides the party in, hides during combat, and can be offered or can volunteer as a sacrifice. His wife lives in Olgareth (an editorial addition for the game, not established campaign canon, so cut it if it conflicts with your table).

Control scheme: the player controls one hero at a time, swaps instantly with number keys or Tab, and the other two follow on simple AI. Each hero has two active abilities on cooldown plus a basic attack. Real-time with an optional pause-for-orders key.

## 4. Game flow (scenes)

Scene 1, Escape. Short combat tail: the last of the undead raised by Ichabod's book. A catch-your-breath beat where Ichabod senses Thyken and a spiking, waning ancient power pulling toward the Library. Auto-save at the end.

Scene 2, The Sealed Doors. Puzzle. The player reads the inscription and must enter three names. Kael'Vahr and Dinas are easily found. Mariveth is the hard one because she was erased. Give three solvable routes, any one of which works: a scrap in the Tome that Ichabod can choose to reveal, a set of context clues in the cavern (wine-offering stains, a sailors' charm, scrubbed carvings) assembled into a hint, or Ichabod's Dinas connection whispering it, at a cost of a small permanent reaction line. Wrong guesses are allowed but add a mild consequence (a few more undead stirring). When all three are spoken, the doors fly open.

Scene 3, The Library. Exploration hub with atmospheric lighting and ambient audio. Optional loot shelves, a preserved shelf of tide-charts and sea prayers (Mariveth's section), and a book open on a reading stand. A buried far wall and a visible fissure. Staircase at center leads down.

Scene 4, Thyken. Dialogue scene with a branching conversation tree. Thyken is bound by obsidian chains. He delivers the full exposition: Varn has returned and intends to sacrifice him to fully awaken Kael'Vahr, which would bring the gods into direct confrontation and destroy everything. If Ichabod asks about Dinas, he tells the party her true nature. He warns of the Inquisition marching to Olgareth, and says the gods are vulnerable. No one argues him into a choice.

Scene 5, The Choice. A long, unhurried decision screen with no timer. Two paths. Release Thyken: the chains shatter, the immediate awakening is prevented, no boss fight, weaker long-term position. Sacrifice Thyken plus one other life: Kael'Vahr is chained longer and Varn is weakened, but Varn's ambush is triggered. The second life can be Will (if he is present, he can volunteer, and Ichabod, Raiden, or Kieran each get a distinct reaction line), or a party member offering themselves, which means that hero is permanently lost for the rest of the save. Thyken's last line if sacrificed: "Remember her name. Remember all of them. That is the whole of my religion, and now it is yours."

Scene 6, Varn (boss, sacrifice path only). See section 5.

Scene 7, The Quiet After. Walk-out with one reflective line per surviving hero. Fade to the surface and the final image: smoke on the northern horizon, toward Olgareth. End card: "To be continued: The Inquisition."

## 5. Boss: Varn

Appearance: towering figure of cracked basalt and packed earth, seams glowing like cooling magma, one long black obsidian blade. Arena: the broken chamber at the base of the stairs, with a live fissure, difficult-terrain rubble, and the staircase blocked at the start of the fight.

Stats: roughly 155 HP, armor equivalent to AC 17, and scaled so three level-5 heroes can win with good play and are punished for sloppy play. Varn takes his action plus a free bonus-action beat after each player-side turn, so he never sits idle.

Obsidian Blade: his signature attack. Long reach, very heavy damage, enough to nearly down a hero in one hit. Telegraph it with a clear wind-up so a skilled player can dodge or intercept with Raiden's Shield Ally. Consecutive blade hits on the same target should be fatal, so the player learns fast to rotate targets.

Conjured Shard-Blades: on cooldown he summons three small floating obsidian blades that orbit him and dart at whoever gets close or tries to flee. Each has low HP and can be destroyed. They punish kiting and force Kieran to earn his mobility.

Earthen Step: a misty-step-style teleport across the arena. He uses it right after a big blade hit to vanish before the party can punish, or to close instantly on the backline.

Diamond Skin: once, the first time he is bloodied (half HP), he crystallizes and takes no damage for one round. Telegraph with a clear visual and audio cue so a wasted round is the player's choice, not a gotcha.

Environment: at the halfway point, residual magic from the sacrifice arcs from the floor, dealing small recurring damage to everyone including Varn, creating a rising clock. Free bonus beats: a shard attack, a short shift, or a floor crack that knocks a target prone.

End of fight: at 0 HP Varn does not die. The earth swallows him back down. Set a persistent flag `varn_alive = true` for the sequel.

## 6. Systems to build

A dialogue and choice engine driven by JSON or YAML scripts with flags (for example `sacrificed_thyken`, `sacrificed_will`, `mariveth_name_source`, `ichabod_revealed_tome`). A flag-and-consequence tracker that changes later lines and the ending card. A simple real-time combat system with cooldowns, status effects (prone, hexed, invulnerable), AI for the two non-controlled heroes, and boss pattern scripting. Save and load via localStorage with one auto-save per scene. A lightweight lighting system (dark library, warm torch pools, glowing seams on Varn). Placeholder art is fine, using colored shapes and simple sprite sheets, with asset slots so real art can be dropped in later.

## 7. Tone and presentation

Grimdark, quiet, heavy. Muted palette: dust brown, bone, obsidian black, and one ember orange accent for Dinas and Varn's seams. Sparse music, strong ambient sound (paper, settling earth, distant rumbling). Writing is dry, precise, and unhurried. No jokes at the expense of the sacrifice scene. No bullet-point UI for story text; use paragraphs.

## 8. Build milestones for Claude Code

First, scaffold the project (Vite, TypeScript, Phaser 3), a single scene manager, and a player that moves and swaps heroes. Second, build the dialogue and flag engine with the Thyken conversation fully scripted. Third, build the sealed-door puzzle with all three Mariveth routes. Fourth, build the Library scene with exploration and the staircase. Fifth, build the combat core and the Scene 1 undead tail. Sixth, build the choice scene with both branches and the permanent-loss rule. Seventh, build the full Varn fight with all four moves and the mid-fight terrain clock. Eighth, build the ending, credits card, and save and load. Ninth, polish: lighting, audio hooks, tuning Varn so it is hard but winnable.

## 9. Out of scope for this slice

Olgareth, the Inquisition, Kieran's sister's full storyline, Mariveth's restoration arc, and anything past the smoke-on-the-horizon ending card. These are sequel hooks, planned but not built.

## 10. Kickoff prompt to paste into Claude Code

> Read GAME_SPEC.md in this folder. Build the vertical slice described there as a browser game using Vite, TypeScript, and Phaser 3. Work through the milestones in section 8 in order. After each milestone, run the game, confirm it works, and commit. Use placeholder art. Treat section 2 lore as canonical and do not change names, relationships, or facts. Ask me before making any choice that changes the story. Start with milestone one and tell me what you built when it runs.
