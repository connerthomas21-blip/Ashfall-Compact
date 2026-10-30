'use strict';
/* ============================== DATA: palette, heroes, maps ============================== */

// Muted grimdark palette; ember is the single accent (Dinas, Varn's seams, fire).
const PAL = {
  void: '#070606', earth: '#2a231d', earthLit: '#3b3128', dust: '#6b5a46', bone: '#d8cdb4', boneDim: '#a89c84',
  obsidian: '#141012', rock: '#171310', rockTop: '#3a3027', ember: '#e0702a', emberHot: '#ffb36b', blood: '#6e1f1a',
  steel: '#8a8780', leather: '#5e4a36', moss: '#4f574a',
};

// Playable heroes. Abilities and stats are filled in at the combat milestone.
const HEROES = {
  raiden:  { name: 'Raiden',  role: 'Paladin', key: '1', speed: 74, r: 6.5, body: PAL.steel,    trim: PAL.bone,   light: 22 },
  ichabod: { name: 'Ichabod', role: 'Warlock', key: '2', speed: 78, r: 6,   body: '#2b2226',    trim: PAL.ember,  light: 34, lightColor: PAL.ember },
  kieran:  { name: 'Kieran',  role: 'Rogue',   key: '3', speed: 88, r: 5.5, body: PAL.leather,  trim: PAL.dust,   light: 22 },
};
const HERO_ORDER = ['raiden', 'ichabod', 'kieran'];
const WILL = { name: 'Will', speed: 76, r: 5.5, body: PAL.moss, trim: PAL.boneDim, light: 78, lightColor: '#f0a050' };

/* ---------- Maps ----------
  #  rock wall          .  dirt floor        ,  rubble (slow)       ~  fissure (impassable, glows)
  t  torch (light)      b  bones (decor)     o  boulder (solid)     P  party start     w  Will start
  S  Ichabod's sensing trigger              X  exit to the next scene
  D  sealed doors (solid)                   i  inscription (interact)
  U  stairs up (solid for now)              K  Thyken in his chains (solid, interact)
  Library: B shelf (solid)  E collapsed earth (solid)  k fallen books (decor)  h candle stand (light)  v stair down
           L loot shelf  M Mariveth's shelf  R reading stand  (all solid, interact)   Z the buried wall (interact)
  Clues at the doors (interact): c  Kael'Vahr mural   a  scorched altar   m  wine stains   n  sailor's charm   q  scrubbed carving
*/
const MAPS = {
  escape: {
    dark: 0.93,
    rows: [
      '##############################################################',
      '#######.....######################......######################',
      '#####.........#####........######.........#####.....##########',
      '####...b........##...........##.....,,.....###.......#########',
      '###.....,,.......,......t.......,,,,,,........,,......########',
      '##...P.....w.........................,,.......o.......,S######',
      '##.......o..............###..............b.......,,,,..S..####',
      '###.......,,.....##....#####......,,,.......###........S....X#',
      '####..........######...######.........,,...#####.......S....X#',
      '#####....b...########...####...t...........######...t..S....X#',
      '######......##########.........#####..,...########.....S.#####',
      '########...############.......#######.....#########....#######',
      '##############################################################',
    ],
  },
  doors: {
    dark: 0.9,
    rows: [
      '####################################',
      '#############XXXX###################',
      '##########DDDDDDDDDD################',
      '#########.....i.....#####...q..#####',
      '########..t.......t..###.........###',
      '#######..............,.....,.....###',
      '######....,.....b...........t.n..###',
      '#####............................###',
      '####c..,,.............o......,...###',
      '###P.w.....................#########',
      '####.....b.......,,,,........#######',
      '######......a..........m..##########',
      '####################################',
    ],
  },
  // The Deep Echo Library: a buried domed archive. Entry from the doors at the bottom; the stair down is at the centre.
  library: {
    dark: 0.92, inlay: { x: 21, y: 12, r: 9.5 },
    rows: [
      '############################################',
      '##########EEEEEEEEEEEEEEEEEEEEEEEE##########',
      '########EEEEEE,k,,EEEEEE,,k,EEEEEEEE########',
      '######EEEE,,,k,,,,,,,,,,,,,,,,,,k,EEEEE#####',
      '#####EE,,,,BBBB,,,,Z,,,,,,~~,BBBB,,,,,EE####',
      '####E,,..............,,,,~~,,,.......,,,E###',
      '###....BBBBBB...h......~~~....BBBBBB....####',
      '###..L.k...............~~...........k...####',
      '##....BBBBBB..........~~~.....BBBBBB.L...###',
      '##.....................~~................###',
      '##...BBBBB.....h.....~~.....h....BBBBB...###',
      '##..................vv~..................###',
      '##...BBBBB..........vv...........BBBBB...###',
      '##M......................................###',
      '##...BBBBB.....h...........h.....BBBBB...###',
      '##.......................................###',
      '###...BBBBBB.....k............BBBBBB.L..####',
      '###..........................R..........####',
      '####..BBBBBB.....t.......t...BBBBBB....#####',
      '#####...............................k..#####',
      '######...........L...w...............#######',
      '########.................................###',
      '###########..........P......################',
      '##############............##################',
      '############################################',
    ],
  },
  // Base of the stair: Thyken's chamber, and later Varn's arena.
  deep: {
    dark: 0.9,
    rows: [
      '##########################',
      '###########UUUU###########',
      '########....UU....########',
      '######...,..Pw..,,..######',
      '#####..t..........t..#####',
      '####.....,....~~.......###',
      '###.....,,...~~~~..,....##',
      '##...........~~~..,,....##',
      '##........K...~~~~......##',
      '###...........~~~.......##',
      '####...,,......~~~...,.###',
      '#####..........~~~~..#####',
      '#######...,.....~~...#####',
      '##########......~~########',
      '##########################',
    ],
  },
};
