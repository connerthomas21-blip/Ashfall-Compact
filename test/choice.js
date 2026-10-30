// Milestone 6: the Choice. Plays each branch from Thyken's chamber and checks flags, the permanent-loss rule, and the save.
// Usage: node test/choice.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  const frames = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const press = async k => { await pg.keyboard.press(k); await frames(); };
  const say = () => pg.evaluate(() => G.say && { screen: G.say.screen, text: G.say.blocks.map(b => (b.who ? b.who + ': ' : '') + b.text), ch: G.say.i >= G.say.blocks.length - 1 && G.say.choices && G.say.choices.map(c => c.go) });
  const skip = async () => { for (let i = 0; i < 60; i++) { const s = await say(); if (!s || s.ch) return s; await press('Enter'); } };
  const choose = async go => { const s = await skip(); if (!s || !s.ch || !s.ch.includes(go)) { fail(`choice ${go} not offered: ${JSON.stringify(s && s.ch)}`); return; } await press('Digit' + (s.ch.indexOf(go) + 1)); };
  // Fresh game in Thyken's room, conversation already heard; opens the choice page.
  const begin = async (setup = () => {}) => {
    await pg.goto(server.url + '#scene=thyken'); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(150);
    await pg.click('[data-a="new"]'); await frames(); await skip();
    await pg.evaluate(setup);
    await pg.evaluate(() => { S.flags.thyken_heard = true; const k = G.room.triggers.find(t => t.kind === 'K'); leader().x = k.x - 18; leader().y = k.y; });
    await frames(); await press('KeyE');
  };
  const state = () => pg.evaluate(() => ({ scene: G.sceneId, flags: S.flags, party: Object.fromEntries(HERO_ORDER.map(id => [id, S.party[id].alive])), will: S.will,
    actors: G.actors ? G.actors.map(a => a.id) : [], saved: JSON.parse(localStorage.getItem(SAVE_KEY)) }));

  // Release
  await begin();
  let s = await say(); if (!s || !s.screen) fail('choice is not a full page');
  await pg.screenshot({ path: out + '/choice-open.png' });
  await choose('later'); await skip();
  if (await say()) fail('"Not yet" did not close the page');
  await press('KeyE'); await choose('release_confirm'); await choose('open'); await choose('release_confirm'); await choose('release');
  s = await say(); if (!s || !s.text.some(t => t.includes('Time, then'))) fail('release text');
  await pg.screenshot({ path: out + '/choice-release.png' });
  for (let i = 0; i < 5 && await say(); i++) await press('Enter');
  let st = await state();
  if (!st.flags.released_thyken || st.flags.sacrificed_thyken) fail('release flags ' + JSON.stringify(st.flags));
  await pg.evaluate(() => { const x = G.room.triggers.find(t => t.kind === 'X'); leader().x = x.x; leader().y = x.y + 16; });
  await pg.keyboard.down('KeyW'); await pg.waitForTimeout(400); await pg.keyboard.up('KeyW'); await frames();
  if ((await state()).scene !== 'after') fail('could not leave by the stair after release');

  // Sacrifice Will: every hero reacts, Will is gone, Varn follows
  await begin();
  await choose('sacrifice'); s = await skip();
  if (!s.text.some(t => t.startsWith('Will: Let it be me'))) fail('Will does not volunteer');
  await pg.screenshot({ path: out + '/choice-sacrifice.png' });
  await choose('will_react'); s = await skip();
  for (const h of ['Raiden', 'Ichabod', 'Kieran']) if (!s.text.some(t => t.startsWith(h + ':'))) fail('no reaction from ' + h);
  await choose('sac_will');
  const rite = []; for (let i = 0; i < 20; i++) { const x = await say(); if (!x) break; rite.push(...x.text); await press('Enter'); }
  if (!rite.includes('Thyken: Remember her name. Remember all of them. That is the whole of my religion, and now it is yours.')) fail('Thyken last line not exact');
  st = await state();
  if (!st.flags.sacrificed_thyken || !st.flags.sacrificed_will || st.will || st.actors.includes('will')) fail('Will sacrifice ' + JSON.stringify(st));
  if (st.scene !== 'varn' && st.scene !== 'after') fail('no Varn after sacrifice: ' + st.scene);
  if (st.saved.will !== false) fail('Will loss not saved');

  // Sacrifice a hero: permanent loss, survives save and reload
  await begin();
  await choose('sacrifice'); await choose('offer_kieran'); s = await skip();
  if (!s.text.some(t => t.includes('cannot be undone'))) fail('no confirmation for hero sacrifice');
  await choose('sacrifice'); await choose('offer_ichabod'); await choose('sac_ichabod');
  for (let i = 0; i < 20 && await say(); i++) await press('Enter');
  st = await state();
  if (st.party.ichabod !== false || st.flags.sacrificed_hero !== 'ichabod' || st.actors.includes('ichabod')) fail('hero loss ' + JSON.stringify(st.party));
  if (st.saved.party.ichabod.alive !== false || !st.will) fail('hero loss not saved or Will lost too');
  await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-a="continue"]'); await frames();
  const back = await pg.evaluate(() => ({ g: Object.keys(G.party || {}), lead: S.lead }));
  if (back.g.includes('ichabod') || back.lead === 'ichabod') fail('Ichabod came back after reload ' + JSON.stringify(back));

  // Without Will there is no Will option
  await begin(() => { S.will = false; });
  await choose('sacrifice'); s = await skip();
  if (s.ch.includes('will_react')) fail('Will offered when absent');

  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
