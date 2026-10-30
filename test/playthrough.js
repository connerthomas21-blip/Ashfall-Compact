// Full playthrough from the title screen to the end card through real scene transitions, down both branches.
// Fights are played by the ally AI on autopilot, stepped quickly while the frame loop is held.
// Usage: node test/playthrough.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  const frames = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const press = async k => { await pg.keyboard.press(k); await frames(); };
  const say = () => pg.evaluate(() => G.say && { ch: G.say.i >= G.say.blocks.length - 1 && G.say.choices && G.say.choices.map(c => c.go) });
  const skip = async () => { for (let i = 0; i < 80; i++) { const s = await say(); if (!s || s.ch) return s; await press('Enter'); } };
  const choose = async go => { const s = await skip(); if (!s || !s.ch || !s.ch.includes(go)) { fail(`choice ${go} not offered in ${await pg.evaluate(() => G.sceneId)}: ${s && s.ch}`); return; } await press('Digit' + (s.ch.indexOf(go) + 1)); };
  const scene = () => pg.evaluate(() => G.sceneId);
  // Walk the leader along tile waypoints with the real controls (pathing around walls is the player's job, so waypoints are chosen by hand).
  const walk = async pts => {
    for (const [tx, ty] of pts) for (let i = 0; i < 200; i++) {
      if (await pg.evaluate(() => !!G.say)) { await skip(); if (await say()) return; continue; }
      const st = await pg.evaluate(() => ({ x: leader().x, y: leader().y }));
      const dx = tx * 16 + 8 - st.x, dy = ty * 16 + 8 - st.y; if (Math.hypot(dx, dy) < 6) break;
      const k = []; if (dx > 3) k.push('KeyD'); if (dx < -3) k.push('KeyA'); if (dy > 3) k.push('KeyS'); if (dy < -3) k.push('KeyW');
      for (const c of k) await pg.keyboard.down(c); await pg.waitForTimeout(70); for (const c of k) await pg.keyboard.up(c);
    }
  };
  // Win the current fight on autopilot by stepping the scene fast.
  const fight = () => pg.evaluate(() => {
    G.autopilot = true; G.paused = true;
    for (const e of liveFoes()) e.aggro = true;   // the walk may stop short of their notice: bring them on
    let res = 'unfinished';
    for (let t = 0; t < 400; t += 1 / 30) {
      G.scene.update(1 / 30);
      if (G.wipe) { while (G.wipe) G.scene.update(1 / 30); res = 'wipe'; break; }   // let the encounter restart
      if (!G.combat && !liveFoes().length) { res = 'won'; break; }
      if (G.sceneId !== 'varn' && G.sceneId !== 'escape' && G.sceneId !== 'doors') { res = 'won'; break; }
    }
    G.paused = false; G.autopilot = false; return res;
  });
  const fightUntilWon = async () => { for (let i = 0; i < 6; i++) { const r = await fight(); console.log('fight in ' + await scene() + ': ' + r); if (r === 'won') return true; await pg.waitForTimeout(300); } return false; };
  const examine = async kind => {
    await pg.evaluate(k => { const t = G.room.triggers.find(t => t.kind === k); const sp = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 0]].find(([dx, dy]) => !SOLID.has(tileAt(G.room, t.tx + dx, t.ty + dy))); leader().x = (t.tx + sp[0] + 0.5) * 16; leader().y = (t.ty + sp[1] + 0.5) * 16; }, kind);
    await frames(); await press('KeyE');
  };

  await pg.goto(server.url); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(200);
  await pg.screenshot({ path: out + '/play-title.png' });
  await pg.click('[data-a="new"]'); await skip();

  // Scene 1
  await walk([[14, 5], [20, 5]]);
  if (!(await fightUntilWon())) fail('escape fight not won');
  await skip();
  await walk([[34, 4], [44, 5], [52, 7], [57, 8], [61, 8]]);
  await skip();
  if (await scene() !== 'doors') { await walk([[61, 8]]); }
  if (await scene() !== 'doors') fail('did not reach the doors: ' + await scene());

  // Scene 2: clues, then the names (one wrong first)
  for (const k of ['c', 'a', 'm', 'n', 'q']) { await examine(k); await skip(); }
  const speak = async name => { await examine('i'); await choose('speak'); await skip(); await pg.fill('#name-in', name); await pg.keyboard.press('Enter'); await frames(); };
  await speak('Omnisiah'); await skip();
  if (!(await fightUntilWon())) fail('door undead not beaten');
  await skip();
  for (const n of ["Kael'Vahr", 'Dinas', 'Mariveth']) { await speak(n); await skip(); }
  await pg.waitForTimeout(2800);
  await walk([[14, 4], [14, 2], [14, 1]]);
  if (await scene() !== 'library') fail('did not enter the Library: ' + await scene());

  // Scene 3: loot, the sea shelf, then down
  await skip();
  for (let i = 0; i < 4; i++) { await pg.evaluate(i => { const t = G.room.triggers.filter(t => t.kind === 'L')[i]; const sp = [[0, 1], [1, 0], [-1, 0], [0, -1]].find(([dx, dy]) => !SOLID.has(tileAt(G.room, t.tx + dx, t.ty + dy))); leader().x = (t.tx + sp[0] + 0.5) * 16; leader().y = (t.ty + sp[1] + 0.5) * 16; }, i); await frames(); await press('KeyE'); await skip(); }
  await examine('M'); await choose('take'); await skip();
  await pg.evaluate(() => { leader().x = 20.5 * 16; leader().y = 14 * 16; });
  await walk([[20, 13], [20, 12]]);
  if (await scene() !== 'thyken') fail('did not descend: ' + await scene());

  // Scene 4: the whole conversation
  await pg.evaluate(() => { const k = G.room.triggers.find(t => t.kind === 'K'); leader().x = k.x - 18; leader().y = k.y; }); await frames(); await press('KeyE');
  for (const go of ['who', 'varn', 'inquisition', 'gods', 'dinas', 'mariveth', 'raiden', 'ask', 'close']) await choose(go);
  await skip();
  const saved = await pg.evaluate(() => localStorage.getItem(SAVE_KEY));
  await pg.screenshot({ path: out + '/play-choice.png' });

  // Branch A: release
  await choose('release_confirm'); await choose('release'); for (let i = 0; i < 8 && await say(); i++) await press('Enter');
  await pg.evaluate(() => { const x = G.room.triggers.find(t => t.kind === 'X'); leader().x = x.x; leader().y = x.y + 20; });
  await walk([[12, 1]]);
  if (await scene() !== 'after') fail('release: did not leave by the stair: ' + await scene());
  await pg.evaluate(() => { leader().x = 21 * 16; leader().y = 21 * 16; G.barkT = 0; });
  await walk([[21, 23]]);
  if (await scene() !== 'surface') fail('release: did not reach the surface');
  await pg.evaluate(() => { G.t0 -= 10; }); await pg.waitForTimeout(400);
  const cardA = await pg.evaluate(() => document.querySelector('.endcard') && document.querySelector('.endcard').innerText);
  if (!cardA || !cardA.includes('To be continued: The Inquisition.')) fail('release: no end card');

  // Branch B: from the save before the Choice, sacrifice Will, fight Varn
  await pg.evaluate(s => localStorage.setItem(SAVE_KEY, s), saved); await pg.reload(); await pg.waitForTimeout(200);
  await pg.click('[data-a="continue"]'); await frames();
  if (await scene() !== 'thyken') fail('continue did not return to Thyken: ' + await scene());
  await pg.evaluate(() => { const k = G.room.triggers.find(t => t.kind === 'K'); leader().x = k.x - 18; leader().y = k.y; }); await frames(); await press('KeyE');
  await choose('sacrifice'); await choose('will_react'); await choose('sac_will');
  for (let i = 0; i < 20 && await say(); i++) await press('Enter');
  if (await scene() !== 'varn') fail('sacrifice did not lead to Varn: ' + await scene());
  await skip(); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '/play-varn.png' });
  if (!(await fightUntilWon())) fail('Varn not beaten in six tries');
  for (let i = 0; i < 8 && await say(); i++) await press('Enter');
  if (await scene() !== 'after') fail('no Quiet After after Varn: ' + await scene());
  await pg.evaluate(() => { leader().x = 21 * 16; leader().y = 21 * 16; });
  await walk([[21, 23]]);
  await pg.evaluate(() => { G.t0 -= 10; }); await pg.waitForTimeout(400);
  const cardB = await pg.evaluate(() => document.querySelector('.endcard') && document.querySelector('.endcard').innerText);
  if (!cardB || !cardB.includes('Will went with him') || !cardB.includes('he is not dead')) fail('sacrifice: end card');
  const flags = await pg.evaluate(() => S.flags);
  for (const k of ['varn_alive', 'sacrificed_thyken', 'sacrificed_will', 'chapter_complete', 'took_sea_prayer', 'dinas_truth']) if (!flags[k]) fail('missing flag at the end: ' + k);
  console.log('play time (s):', await pg.evaluate(() => Math.round(S.playtime)));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
