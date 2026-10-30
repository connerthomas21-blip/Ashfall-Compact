// Milestone smoke test: boots the game, walks the party through Scene 1, swaps heroes, reaches the doors, checks save/continue.
// Usage: node test/smoke.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  await pg.goto(server.url); await pg.waitForTimeout(400);
  await pg.screenshot({ path: out + '/title.png' });

  // Every map row the same width
  const bad = await pg.evaluate(() => Object.entries(MAPS).filter(([, m]) => new Set(m.rows.map(r => r.length)).size > 1).map(([k]) => k));
  if (bad.length) fail('ragged map rows: ' + bad);

  await pg.click('[data-a="new"]'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '/intro.png' });
  while (await pg.$('#say')) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(50); }

  await pg.evaluate(() => { for (const e of liveFoes()) { e.aggro = true; hurt(e, 999); } });
  await pg.waitForTimeout(200);
  while (await pg.$('#say')) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(50); }
  const pos = () => pg.evaluate(() => ({ lead: S.lead, x: leader().x, y: leader().y, f: followers().map(f => [f.id, Math.round(dist(f, leader()))]) }));
  const p0 = await pos();
  await pg.keyboard.down('KeyD'); await pg.waitForTimeout(900); await pg.keyboard.up('KeyD');
  const p1 = await pos();
  if (!(p1.x > p0.x + 30)) fail('leader did not move right ' + JSON.stringify([p0, p1]));
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: out + '/walk.png' });

  await pg.keyboard.press('Digit2'); await pg.waitForTimeout(100);
  if ((await pos()).lead !== 'ichabod') fail('swap to Ichabod failed');
  await pg.keyboard.press('Tab'); await pg.waitForTimeout(100);
  if ((await pos()).lead !== 'kieran') fail('Tab cycle failed');

  // Pause freezes movement
  await pg.keyboard.press('Space');
  const pp = await pos(); await pg.keyboard.down('KeyD'); await pg.waitForTimeout(300); await pg.keyboard.up('KeyD');
  if ((await pos()).x !== pp.x) fail('moved while paused');
  await pg.screenshot({ path: out + '/paused.png' });
  await pg.keyboard.press('Space');

  // Walk the path to the exit with a scripted route (tiles), letting followers keep up
  const route = [[12, 5], [22, 5], [34, 4], [44, 5], [52, 7], [57, 8], [61, 8]];
  for (const [tx, ty] of route) {
    for (let i = 0; i < 300; i++) {
      if (await pg.$('#say')) { if (i % 2 === 0) await pg.screenshot({ path: out + '/sense.png' }); await pg.keyboard.press('Enter'); continue; }
      const st = await pg.evaluate(() => ({ x: leader().x, y: leader().y, scene: G.sceneId }));
      if (st.scene !== 'escape') break;
      const gx = tx * 16 + 8, gy = ty * 16 + 8, dx = gx - st.x, dy = gy - st.y;
      if (Math.hypot(dx, dy) < 6) break;
      const k = []; if (dx > 3) k.push('KeyD'); if (dx < -3) k.push('KeyA'); if (dy > 3) k.push('KeyS'); if (dy < -3) k.push('KeyW');
      for (const c of k) await pg.keyboard.down(c); await pg.waitForTimeout(60); for (const c of k) await pg.keyboard.up(c);
    }
  }
  const fl = await pg.evaluate(() => ({ scene: G.sceneId, flags: S.flags, saved: JSON.parse(localStorage.getItem(SAVE_KEY)).scene, f: followers().map(f => Math.round(dist(f, leader()))) }));
  if (fl.scene !== 'doors') fail('did not reach the doors: ' + JSON.stringify(fl));
  if (!fl.flags.ichabod_sensed) fail('Ichabod sensing beat did not fire');
  if (fl.saved !== 'doors') fail('no auto-save on scene change');
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: out + '/doors.png' });

  // Examine the doors
  await pg.evaluate(() => { const t = G.room.triggers.find(t => t.kind === 'i'); leader().x = t.x; leader().y = t.y + 14; });
  await pg.waitForTimeout(100); await pg.keyboard.press('KeyE'); await pg.waitForTimeout(200);
  if (!(await pg.$('#say'))) fail('inscription did not open');
  await pg.keyboard.press('Enter'); await pg.keyboard.press('Enter');
  await pg.screenshot({ path: out + '/inscription.png' });

  // Continue from title restores the scene
  await pg.reload(); await pg.waitForTimeout(300); await pg.click('[data-a="continue"]'); await pg.waitForTimeout(200);
  if ((await pg.evaluate(() => G.sceneId)) !== 'doors') fail('continue did not restore the doors scene');

  console.log(JSON.stringify(fl));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
