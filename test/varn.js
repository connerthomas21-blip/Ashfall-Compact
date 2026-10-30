// Milestone 7: Varn. Mechanics checks, a rendered look at the fight, and a balance run: the fight simulated
// headless many times with every hero on autopilot (allyAI), for three heroes and for each two-hero party.
// Usage: node test/varn.js <screenshot-dir> [fights-per-party]
const { chromium } = require('playwright');
const out = process.argv[2] || '.', N = +process.argv[3] || 10;
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  await pg.goto(server.url); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(150);
  await pg.click('[data-a="new"]'); await pg.waitForTimeout(100);

  // Headless fight: step the scene by hand while the frame loop is held (paused) so nothing else moves.
  await pg.evaluate(() => {
    window.simFight = (lost, maxT = 420) => {
      S = fresh(); S.flags.sacrificed_thyken = true; S.relics = { ember_ink: true, whetstone: true, litany: true }; S.inv = { draught: 2 };   // a party that explored the Library
      if (lost === 'will') { S.flags.sacrificed_will = true; S.will = false; } else { S.party[lost].alive = false; S.flags.sacrificed_hero = lost; }
      go('varn', { noSave: true }); G.say = null; G.paused = true; G.autopilot = true;
      G.enemies.push(makeVarn(VARN_SPAWN.x, VARN_SPAWN.y));
      const log = { diamond: null, arcs: null, shards: 0, steps: 0, blades: 0, bladeHits: [], downs: 0 };
      const v0 = G.enemies[0]; let wasState = '';
      const dt = 1 / 30;
      for (let t = 0; t < maxT; t += dt) {
        const before = heroes().map(h => h.hp), downs = heroes().filter(h => h.down).length;
        G.scene.update(dt);
        const v = liveFoes().find(e => e.boss) || v0;
        if (v.state !== wasState) { if (v.state === 'sink') log.steps++; if (v.state === 'windup') log.blades++; wasState = v.state; }
        if (v.diamondUsed && log.diamond == null) log.diamond = { t, hp: v.hp, invuln: v.st.invuln };
        if (v.arcsOn && log.arcs == null) log.arcs = t;
        log.shards = Math.max(log.shards, liveFoes().filter(e => e.shardOf).length);
        log.downs += Math.max(0, heroes().filter(h => h.down).length - downs);
        if (G.wipe) return { win: false, t: Math.round(t), varnHp: v.hp, maxHp: v.maxHp, log };
        if (S.flags.varn_alive) return { win: true, t: Math.round(t), hp: heroes().map(h => h.hp), log };
      }
      return { win: false, timeout: true, varnHp: (liveFoes().find(e => e.boss) || {}).hp };
    };
  });

  // Mechanics on one fight
  const one = await pg.evaluate(() => simFight('will'));
  console.log('sample fight:', JSON.stringify(one));
  const L = one.log;
  if (!L || L.blades < 3) fail('Varn rarely swings his blade');
  if (L.steps < 1) fail('no Earthen Step');
  if (L.shards < 3) fail('no Shard-Blades');
  if (one.win || one.varnHp < (one.maxHp || 999) / 2) {
    if (!L.diamond || L.diamond.invuln < 5) fail('Diamond Skin did not trigger at half');
    if (L.arcs == null) fail('residual arcs did not start at half');
  }
  // Blade damage: nearly downs a hero, and a second hit is fatal
  const blade = await pg.evaluate(() => { const v = liveFoes().find(e => e.boss) || makeVarn(0, 0); const I = G.party.ichabod; I.down = false; I.hp = I.maxHp; I.st = {};
    const a = hurt(I, VARN.blade.dmg[0]); const left = I.hp; hurt(I, VARN.blade.dmg[0]); return { first: a, left, downAfterTwo: I.down }; });
  console.log('blade on Ichabod:', JSON.stringify(blade));
  if (blade.left > 8 || blade.left <= 0 || !blade.downAfterTwo) fail('blade should nearly down Ichabod, and two should drop him');

  // Rendered fight: real time, autopilot, a few screenshots
  await pg.evaluate(() => { S = fresh(); S.flags.sacrificed_thyken = true; S.flags.sacrificed_will = true; S.will = false; go('varn'); });
  for (let i = 0; i < 6 && await pg.evaluate(() => !!G.say); i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(60); }
  await pg.evaluate(() => { G.autopilot = true; });
  for (const [ms, name] of [[2500, 'varn-1'], [4000, 'varn-2']]) { await pg.waitForTimeout(ms); await pg.screenshot({ path: `${out}/${name}.png` }); }
  await pg.evaluate(() => { const v = liveFoes().find(e => e.boss); v.hp = v.maxHp / 2 + 1; hurt(v, 50); });
  await pg.waitForTimeout(400); await pg.screenshot({ path: `${out}/varn-diamond.png` });
  await pg.evaluate(() => { const v = liveFoes().find(e => e.boss); v.st = {}; hurt(v, 99999); });
  await pg.waitForTimeout(1200); await pg.screenshot({ path: `${out}/varn-sinking.png` });
  await pg.waitForTimeout(2500);
  const end = await pg.evaluate(() => ({ alive: S.flags.varn_alive, saved: JSON.parse(localStorage.getItem(SAVE_KEY)).flags.varn_alive, say: G.say && G.say.blocks[0].text }));
  if (end.alive !== true || end.saved !== true) fail('varn_alive not set and saved ' + JSON.stringify(end));
  if (!end.say || !end.say.includes('not fall')) fail('no ending narration for the fight');

  // Balance
  const parties = { will: 'Raiden, Ichabod, Kieran', raiden: 'Ichabod, Kieran', ichabod: 'Raiden, Kieran', kieran: 'Raiden, Ichabod' };
  for (const [lost, label] of Object.entries(parties)) {
    const res = []; for (let i = 0; i < N; i++) res.push(await pg.evaluate(l => simFight(l), lost));
    const wins = res.filter(r => r.win), ts = wins.map(r => r.t), lossHp = res.filter(r => !r.win).map(r => Math.round(100 * r.varnHp / r.maxHp));
    console.log(`${label.padEnd(24)} wins ${wins.length}/${N}  win time ${ts.length ? Math.min(...ts) + '-' + Math.max(...ts) + 's' : '-'}  Varn HP left on losses ${lossHp.join(',')}%`);
  }
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
