// Milestone 5: combat. Fights Scene 1 with the player holding J and the allies on AI, then checks each ability,
// statuses, a full wipe and restart, pause orders, and the undead that wrong names wake at the doors.
// Usage: node test/combat.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  const frames = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const press = async k => { await pg.keyboard.press(k); await frames(); };
  const closeSay = async () => { for (let i = 0; i < 20 && await pg.evaluate(() => !!G.say); i++) await press('Enter'); };
  const start = async scene => {
    await pg.goto(server.url + '#scene=' + scene); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(150);
    await pg.click('[data-a="new"]'); await frames(); await closeSay();
  };

  // 1. The real fight: walk in, hold J, let the AI work.
  await start('escape');
  await pg.keyboard.down('KeyD'); await pg.waitForTimeout(2600); await pg.keyboard.up('KeyD');
  await pg.keyboard.down('KeyJ');
  let t = 0, st;
  for (; t < 40; t++) {
    await pg.waitForTimeout(500);
    st = await pg.evaluate(() => ({ c: G.combat, foes: liveFoes().length, say: !!G.say, clear: !!S.flags.escape_clear, hp: heroes().map(h => h.hp | 0), wipe: !!G.wipe }));
    if (t === 3) await pg.screenshot({ path: out + '/combat-escape.png' });
    if (st.clear) break;
  }
  await pg.keyboard.up('KeyJ');
  if (!st.clear) fail('escape fight not won in 20s: ' + JSON.stringify(st));
  console.log(`escape fight won in ~${t / 2}s, hero HP after: ${st.hp}`);
  const lines = []; for (let i = 0; i < 5 && await pg.evaluate(() => !!G.say); i++) { lines.push(await pg.evaluate(() => G.say.blocks[G.say.i].text)); await press('Enter'); }
  if (!lines.some(l => l.includes('Library is this way'))) fail('Will line after the fight missing');

  // 2. Abilities and statuses, in a controlled arena: Thyken's room with risen dropped in.
  await start('thyken');
  const r = await pg.evaluate(async () => {
    const out = {}, R = G.party.raiden, I = G.party.ichabod, K = G.party.kieran;
    const place = (u, x, y) => { u.x = x; u.y = y; };
    const x0 = 6 * 16, y0 = 6 * 16;
    spawnFoes([{ kind: 'husk', x: x0 + 14, y: y0 }], true); const e = G.enemies[0];
    place(R, x0, y0); place(I, x0 - 40, y0); place(K, x0 + 28, y0);
    R.face = { x: 1, y: 0 };
    // Smite spends faith and hits hard
    const hp0 = e.hp; out.smite = useSkill(R, 'k'); out.faith = R.faith; out.smiteDmg = hp0 - e.hp;
    // Hex multiplies damage
    useSkill(I, 'k'); out.hexed = e.st.hexed > 0;
    const h1 = e.hp; hurt(e, 10); out.hexDmg = h1 - e.hp;
    // Sneak Attack: Kieran on the far side of the target from Raiden = flanking
    out.flank = sneakReady(K, e);
    place(K, x0 + 14, y0 - 16); out.notFlankButAlone = sneakReady(K, e);
    spawnFoes([{ kind: 'risen', x: x0 + 14, y: y0 - 30 }], true);
    out.crowded = sneakReady(K, e);
    G.enemies.pop();
    // Shield Ally: damage to Ichabod goes to Raiden at half
    I.st.guard = { by: R, t: 3 }; const ri = R.hp, ii = I.hp; hurt(I, 20); out.guard = { raidenLost: ri - R.hp, ichabodLost: ii - I.hp };
    delete I.st.guard;
    // Evasion: Kieran takes half from area damage
    const k0 = K.hp; hurt(K, 20, { aoe: true }); const k1 = K.hp; hurt(K, 20); out.evasion = [k0 - k1, k1 - K.hp];
    // Down and revive with Lay on Hands
    place(I, x0 - 10, y0); hurt(I, 999); out.down = I.down; R.cd.h = 0; useSkill(R, 'h'); out.revived = !I.down && I.hp > 0; out.pool = R.pool;
    // Dash makes Kieran untouchable for a moment
    K.cd.l = 0; useSkill(K, 'l'); const kd = K.hp; hurt(K, 10); out.dashInvuln = K.hp === kd;
    // Pull moves Ichabod
    const ix = I.x, iy = I.y; I.cd.l = 0; useSkill(I, 'l'); out.pulled = Math.hypot(I.x - ix, I.y - iy) > 30;
    // Draught
    S.inv.draught = 1; I.hp = 5; drinkDraught(I); out.draught = [I.hp, S.inv.draught];
    // Prone from a husk slam
    e.target = K; e.aim = { x: 1, y: 0 }; place(K, e.x + 14, e.y); K.st = {}; e.state = 'windup'; e.t = 0.0001;
    await new Promise(r => setTimeout(r, 80)); out.prone = K.st.prone > 0;
    return out;
  });
  console.log(JSON.stringify(r));
  if (!r.smite || r.faith !== 2 || r.smiteDmg < 12) fail('smite');
  if (!r.hexed || r.hexDmg <= 10 * 0.9) fail('hex');
  if (!r.flank || !r.notFlankButAlone || r.crowded) fail('sneak attack conditions');
  if (r.guard.ichabodLost !== 0 || r.guard.raidenLost < 5) fail('shield ally');
  if (!(r.evasion[0] < r.evasion[1])) fail('evasion');
  if (!r.down || !r.revived || r.pool !== 20) fail('down / lay on hands');
  if (!r.dashInvuln) fail('dash invulnerability');
  if (!r.pulled) fail("dinas's pull");
  if (r.draught[0] !== 27 || r.draught[1] !== 0) fail('draught');
  if (!r.prone) fail('husk slam prone');

  // 3. Wipe and restart
  await start('escape');
  await pg.evaluate(() => { for (const h of heroes()) { h.x = 20 * 16; h.y = 5.5 * 16; } });
  await frames(); await frames();
  const before = await pg.evaluate(() => ({ c: G.combat, n: liveFoes().length }));
  if (!before.c) fail('fight did not start on approach');
  await pg.evaluate(() => { S.flags.marker = 'after-start'; for (const h of heroes()) hurt(h, 999); });
  await pg.waitForTimeout(600); await pg.screenshot({ path: out + '/combat-wipe.png' });
  await pg.waitForFunction(() => !G.wipe, null, { timeout: 5000 });
  const after = await pg.evaluate(() => ({ wipe: !!G.wipe, n: liveFoes().length, hp: heroes().map(h => h.hp), marker: S.flags.marker }));
  if (after.wipe || after.n !== before.n || after.hp.some(h => h <= 0) || after.marker) fail('wipe restore ' + JSON.stringify(after));

  // 4. Pause orders: queue Smite while paused, it fires on resume
  await pg.evaluate(() => {
    const R = G.party.raiden, e = liveFoes()[0]; S.lead = 'raiden';
    for (const h of heroes()) { h.x = 21 * 16; h.y = 5.5 * 16; }
    G.party.kieran.x -= 30; G.party.ichabod.x -= 50;
    e.x = 22.2 * 16; e.y = 5.5 * 16; e.state = 'recover'; e.t = 3; R.face = { x: 1, y: 0 };
    G.paused = true;
  });
  await press('KeyK');
  const q = await pg.evaluate(() => G.party.raiden.queued);
  await pg.screenshot({ path: out + '/combat-paused.png' });
  await press('Space');
  await pg.waitForFunction(() => G.party.raiden.faith < 3, null, { timeout: 3000 }).catch(() => {});
  const fired = await pg.evaluate(() => G.party.raiden.faith);
  if (q !== 'k' || fired !== 2) fail(`pause order: queued ${q}, faith ${fired}`);

  // 5. Wrong names at the doors wake undead
  await start('doors');
  await pg.evaluate(() => speakName('Varn')); await closeSay();
  const n = await pg.evaluate(() => liveFoes().length);
  if (n < 2) fail('wrong name woke no undead');

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
