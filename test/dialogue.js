// Milestone 2: dialogue engine and the Thyken conversation.
// Plays the conversation through with the full party, then again without Ichabod and Will, and checks gating and flags.
// Usage: node test/dialogue.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const frames = () => pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const press = async k => { await pg.keyboard.press(k); await frames(); };
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  await pg.goto(server.url + '#scene=thyken'); await pg.waitForTimeout(300);

  const lint = await pg.evaluate(() => Object.keys(DIALOGUES).flatMap(lintDialogue));
  if (lint.length) fail('lint: ' + lint.join('; '));

  // Plays a whole conversation, recording every line shown and every choice offered.
  const play = async (setup, shots) => {
    await pg.evaluate(() => localStorage.clear());
    await pg.reload(); await pg.waitForTimeout(200);
    await pg.click('[data-a="new"]'); await pg.waitForTimeout(200);
    await pg.evaluate(setup);
    await pg.evaluate(() => { go('thyken'); const k = G.room.triggers.find(t => t.kind === 'K'); leader().x = k.x - 20; leader().y = k.y; });
    await pg.waitForTimeout(400);
    if (shots) await pg.screenshot({ path: out + '/thyken-room.png' });
    await press('KeyE');
    const first = await pg.evaluate(() => G.say && G.say.blocks[G.say.i].text);
    const log = { lines: [], offered: new Set(), first };
    let shot = 0;
    for (let step = 0; step < 400; step++) {
      const st = await pg.evaluate(() => G.say && { who: G.say.blocks[G.say.i].who, text: G.say.blocks[G.say.i].text, ch: G.say.i >= G.say.blocks.length - 1 && G.say.choices && G.say.choices.map(c => ({ go: c.go, text: c.text, by: c.by })) });
      if (!st || await pg.evaluate(() => D && D.id === 'choice')) break;
      log.lines.push((st.who ? st.who + ': ' : '') + st.text);
      if (!st.ch) { await press('Enter'); continue; }
      st.ch.forEach(c => log.offered.add(c.go));
      if (shots && shot++ < 1 && st.ch.length >= 3) await pg.screenshot({ path: out + '/thyken-choices.png' });
      const topics = st.ch.filter(c => !['ask', 'close', 'hub'].includes(c.go));
      let pick = topics[0] || st.ch.find(c => c.go === 'ask');
      if (!pick) {   // at the ask node: go back while topics remain, else finish
        const left = await pg.evaluate(() => DIALOGUES.thyken.nodes.hub.choices.filter((c, k) => cond(c.if) && (!c.by || S.party[c.by].alive) && c.go !== 'ask' && !D.seen.has('hub:' + k)).length);
        pick = st.ch.find(c => c.go === (left ? 'hub' : 'close'));
      }
      await press('Digit' + (st.ch.indexOf(pick) + 1));
      if (shots && pick.go === 'dinas') await pg.screenshot({ path: out + '/thyken-dinas.png' });
    }
    log.flags = await pg.evaluate(() => S.flags);
    log.saved = await pg.evaluate(() => JSON.parse(localStorage.getItem(SAVE_KEY)).flags.thyken_heard);
    return log;
  };

  const full = await play(() => { S.flags.mariveth_name_source = 'clues'; }, true);
  if (!full.first || !full.first.startsWith('The stair ends')) fail('first line skipped: ' + full.first);
  for (const f of ['thyken_told_who', 'thyken_told_varn', 'thyken_told_gods', 'thyken_told_inquisition', 'thyken_told_mariveth', 'dinas_truth', 'raiden_doubt', 'thyken_heard'])
    if (!full.flags[f]) fail('full run missing flag ' + f);
  if (!full.saved) fail('flags not saved at end of conversation');
  if (!full.lines.some(l => l.startsWith('Will: My wife'))) fail('Will Olgareth line missing');
  if (!full.lines.some(l => l.includes('stains and sailors'))) fail('clues variant of Mariveth line missing');
  if (full.lines.some(l => l.includes('The Tome kept it'))) fail('tome variant shown for clues source');
  if (!full.lines.some(l => l.startsWith('Kieran: And these chains'))) { fail('Kieran chain line missing'); console.log(full.lines.map(l => l.slice(0, 70)).join('\n')); }

  const lean = await play(() => { S.party.ichabod.alive = false; S.will = false; S.lead = 'raiden'; });
  if (lean.offered.has('dinas')) fail('Dinas topic offered without Ichabod');
  if (lean.lines.some(l => l.includes('smells of her') || l.startsWith('Will:') || l.includes('man with a lantern'))) fail('absent characters referenced');
  if (lean.flags.dinas_truth) fail('dinas_truth set without Ichabod');
  if (!lean.flags.thyken_heard) fail('lean run did not finish');

  console.log(`full run: ${full.lines.length} lines; lean run: ${lean.lines.length} lines`);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
