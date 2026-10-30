// Milestone 3: the sealed doors. Plays each Mariveth route (clues, Tome, Dinas's whisper), a wrong guess, and the doors opening.
// Usage: node test/doors.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  const frames = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const press = async k => { await pg.keyboard.press(k); await frames(); };
  const say = () => pg.evaluate(() => G.say && { i: G.say.i, n: G.say.blocks.length, text: G.say.blocks[G.say.i].text, ch: G.say.i >= G.say.blocks.length - 1 && G.say.choices && G.say.choices.map(c => c.go) });
  // Advance text until choices appear or the box closes.
  const skip = async () => { for (let i = 0; i < 60; i++) { const s = await say(); if (!s || s.ch) return s; await press('Enter'); } };
  const choose = async go => { const s = await skip(); if (!s || !s.ch || !s.ch.includes(go)) return fail(`choice ${go} not offered: ${JSON.stringify(s)}`); await press('Digit' + (s.ch.indexOf(go) + 1)); };
  const stand = async kind => { await pg.evaluate(k => { const t = G.room.triggers.find(t => t.kind === k); leader().x = t.x; leader().y = t.y + (k === 'i' ? 14 : 12); }, kind); await frames(); };
  const examine = async kind => { await stand(kind); await press('KeyE'); };
  const fresh = async () => {
    await pg.goto(server.url + '#scene=doors'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(200);
    await pg.click('[data-a="new"]'); await frames();
  };
  const speak = async name => {
    await examine('i'); await choose('speak'); await skip();
    if (!(await pg.$('#name-in'))) return fail('naming panel did not open');
    await pg.fill('#name-in', name); await pg.keyboard.press('Enter'); await frames();
  };
  const flags = () => pg.evaluate(() => S.flags);

  // Route 1: the three clues
  await fresh();
  for (const k of ['c', 'a', 'm', 'n']) { await examine(k); if (k === 'n') await pg.screenshot({ path: out + '/doors-clue.png' }); await skip(); }
  if ((await flags()).knows_mariveth) fail('Mariveth known before all three clues');
  await examine('q'); const assembled = []; for (let i = 0; i < 10; i++) { const s = await say(); if (!s) break; assembled.push(s.text); await press('Enter'); }
  let f = await flags();
  if (f.mariveth_name_source !== 'clues' || !f.knows_mariveth || !f.knows_kaelvahr || !f.knows_dinas) fail('clue route flags ' + JSON.stringify(f));
  if (!assembled.some(t => t.includes('Mari. Veth. Mariveth.'))) fail('assembled hint missing');

  await speak('Omnisiah');
  await skip();
  if ((await flags()).door_wrong !== 1) fail('wrong guess not counted');
  await speak("kael'vahr"); await skip();
  await speak('DINAS'); await skip();
  await examine('i'); await choose('speak'); await skip();
  await pg.fill('#name-in', 'Mari veth'); await pg.screenshot({ path: out + '/doors-naming.png' }); await pg.keyboard.press('Enter'); await frames();
  await press('Enter'); await press('Enter'); await press('Enter');
  await pg.waitForTimeout(1200); await pg.screenshot({ path: out + '/doors-opening.png' });
  await pg.waitForTimeout(1600);
  f = await flags();
  if (!f.doors_open || Object.keys(f.named).length !== 3) fail('doors did not open ' + JSON.stringify(f));
  if (await pg.evaluate(() => G.room.grid[2].includes('D'))) fail('door tiles still solid');
  await pg.screenshot({ path: out + '/doors-open.png' });
  // walk through the doors
  await pg.evaluate(() => { leader().x = 14.5 * 16; leader().y = 3.5 * 16; });
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(700); await pg.keyboard.up('KeyW'); await frames();
  if ((await pg.evaluate(() => G.sceneId)) !== 'library') fail('did not pass through the doors');

  // Route 2: the Tome, hidden first, then shown
  await fresh();
  await examine('i'); await choose('forgotten'); await choose('tome'); await choose('tome_hide');
  f = await flags(); if (f.knows_mariveth || !f.ichabod_hid_tome) fail('hiding the Tome ' + JSON.stringify(f));
  await choose('tome_show'); await skip();
  f = await flags(); if (f.mariveth_name_source !== 'tome' || !f.ichabod_revealed_tome) fail('tome route ' + JSON.stringify(f));
  const offered = (await say()).ch; if (offered.includes('whisper')) fail('whisper offered after the name is known');

  // Route 3: Dinas's whisper
  await fresh();
  await examine('i'); await choose('forgotten'); await choose('whisper'); await skip();
  f = await flags(); if (f.mariveth_name_source !== 'whisper' || !f.dinas_whisper) fail('whisper route ' + JSON.stringify(f));

  // Lint every script
  const lint = await pg.evaluate(() => Object.keys(DIALOGUES).flatMap(lintDialogue)); if (lint.length) fail('lint ' + lint);

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
