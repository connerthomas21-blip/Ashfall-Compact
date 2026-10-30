// Milestone 4: the Library hub. Checks every interactable is reachable on foot, takes all loot, reads everything, and descends.
// Usage: node test/library.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  const frames = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const press = async k => { await pg.keyboard.press(k); await frames(); };
  const say = () => pg.evaluate(() => G.say && { text: G.say.blocks[G.say.i].text, ch: G.say.i >= G.say.blocks.length - 1 && G.say.choices && G.say.choices.map(c => c.go) });
  const skip = async () => { const seen = []; for (let i = 0; i < 60; i++) { const s = await say(); if (!s || s.ch) return { s, seen }; seen.push(s.text); await press('Enter'); } };

  await pg.goto(server.url + '#scene=library'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(200);
  await pg.click('[data-a="new"]'); await frames();
  const intro = await skip();
  if (!intro.seen.some(t => t.includes('fresh dirt'))) fail('no Library entry narration');

  // Reachability: flood fill from the start over walkable tiles; every interactable must touch a reached tile, and the stair must be reached.
  const reach = await pg.evaluate(() => {
    const r = G.room, seen = new Set(), q = [[Math.floor(r.spawns.P.x / 16), Math.floor(r.spawns.P.y / 16)]];
    while (q.length) { const [x, y] = q.pop(), k = x + ',' + y; if (seen.has(k) || SOLID.has(tileAt(r, x, y))) continue; seen.add(k); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    const bad = r.triggers.filter(t => !(INTERACT.includes(t.kind) ? [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]].some(([dx, dy]) => seen.has((t.tx + dx) + ',' + (t.ty + dy))) : seen.has(t.tx + ',' + t.ty)));
    return bad.map(t => t.kind + '@' + t.tx + ',' + t.ty);
  });
  if (reach.length) fail('unreachable: ' + reach);
  await pg.screenshot({ path: out + '/library.png' });

  // Stand on a walkable tile next to an interactable (one the flood fill can reach) and press E.
  const use = async (kind, idx = 0) => {
    await pg.evaluate(([k, i]) => {
      const t = G.room.triggers.filter(t => t.kind === k)[i];
      const spot = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 0]].find(([dx, dy]) => !SOLID.has(tileAt(G.room, t.tx + dx, t.ty + dy)));
      leader().x = (t.tx + spot[0] + 0.5) * 16; leader().y = (t.ty + spot[1] + 0.5) * 16;
    }, [kind, idx]);
    await frames(); await press('KeyE');
  };
  for (let i = 0; i < 4; i++) { await use('L', i); if (i === 0) await pg.screenshot({ path: out + '/library-loot.png' }); await skip(); }
  const inv = await pg.evaluate(() => ({ inv: S.inv, relics: S.relics }));
  if (inv.inv.draught !== 2 || !inv.relics.ember_ink || !inv.relics.whetstone || !inv.relics.litany) fail('loot ' + JSON.stringify(inv));
  await use('L', 0); const again = await skip(); if (!again.seen[0].includes('nothing else')) fail('shelf looted twice');
  if ((await pg.evaluate(() => S.relics.ember_ink && Object.keys(S.relics).length)) !== 3) fail('relic count');

  await use('M'); const m = await skip(); await pg.screenshot({ path: out + '/library-sea.png' });
  if (!m.s || !m.s.ch.includes('take')) fail('sea shelf choices missing');
  await press('Digit1'); await skip();
  await use('R'); const r = await skip(); if (!r.seen.some(t => t.includes('through the floor'))) fail('ledger');
  await use('Z'); await skip();
  const f = await pg.evaluate(() => S.flags);
  for (const k of ['took_sea_prayer', 'read_ledger', 'saw_buried_wall']) if (!f[k]) fail('flag ' + k);
  await use('M'); const m2 = await skip(); if (m2.s && m2.s.ch) fail('sea shelf offered the choice twice');

  // Walk onto the stair
  await pg.evaluate(() => { const t = G.room.triggers.find(t => t.kind === 'v'); leader().x = t.x; leader().y = t.y + 20; });
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(500); await pg.keyboard.up('KeyW'); await frames();
  if ((await pg.evaluate(() => G.sceneId)) !== 'thyken') fail('stair did not lead down');
  await press('KeyM'); if (!(await pg.evaluate(() => AU.muted))) fail('mute toggle'); await press('KeyM');

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
