// Milestone 8: the Quiet After, the surface, and the end card, for each outcome. Checks the reflective lines,
// the final card text and the save code, and that Continue on a finished save returns to the end card.
// Usage: node test/ending.js <screenshot-dir>
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
(async () => {
  const server = await require('./serve')();
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 600 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  const fail = m => { console.log('FAIL', m); process.exitCode = 1; };
  const run = async (name, setup) => {
    await pg.goto(server.url); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(150);
    await pg.click('[data-a="new"]'); await pg.waitForTimeout(100);
    await pg.evaluate(setup); await pg.evaluate(() => go('after')); await pg.waitForTimeout(100);
    const barks = [];
    for (let i = 0; i < 40; i++) {
      await pg.evaluate(() => { G.barkT = Math.min(G.barkT, 0.05); });
      await pg.waitForTimeout(120);
      const b = await pg.evaluate(() => { const b = currentBark(); return b && b.who + ': ' + b.text; });
      if (b && barks[barks.length - 1] !== b) { barks.push(b); if (barks.length === 1) await pg.screenshot({ path: `${out}/after-${name}.png` }); }
      if (await pg.evaluate(() => G.barkI >= G.barks.length)) break;
    }
    // walk out the way you came in
    await pg.evaluate(() => { leader().x = 21 * 16; leader().y = 22 * 16; });
    await pg.keyboard.down('KeyS'); await pg.waitForTimeout(600); await pg.keyboard.up('KeyS');
    if (await pg.evaluate(() => G.sceneId) !== 'surface') fail(name + ': walking out did not reach the surface');
    await pg.waitForTimeout(3200); await pg.screenshot({ path: `${out}/surface-${name}.png` });
    await pg.evaluate(() => { G.t0 -= 10; }); await pg.waitForTimeout(300);
    const card = await pg.evaluate(() => document.querySelector('.endcard') && document.querySelector('.endcard').innerText);
    await pg.screenshot({ path: `${out}/endcard-${name}.png` });
    const code = await pg.evaluate(() => document.querySelector('.endcard textarea').value);
    const decoded = await pg.evaluate(c => decodeSave(c).flags, code);
    await pg.reload(); await pg.waitForTimeout(150); await pg.click('[data-a="continue"]'); await pg.waitForTimeout(400);
    const back = await pg.evaluate(() => ({ scene: G.sceneId, card: !!document.querySelector('.endcard') }));
    return { barks, card, decoded, back };
  };

  const rel = await run('release', () => { Object.assign(S.flags, { released_thyken: true, raiden_doubt: true, dinas_truth: true, mariveth_name_source: 'clues', took_sea_prayer: true }); });
  if (rel.barks.length !== 4) fail('release: expected 4 lines (3 heroes + Will), got ' + rel.barks.length);
  if (!rel.barks.some(b => b.startsWith('Raiden: We let him walk out. I think'))) fail('release: Raiden line');
  if (!rel.barks.some(b => b.startsWith('Ichabod: A woman who burned'))) fail('release: Ichabod dinas_truth line');
  if (!rel.barks.some(b => b.startsWith('Will: Olgareth'))) fail('release: Will line');
  if (!rel.card || !rel.card.includes('To be continued: The Inquisition.')) fail('end card text');
  if (!rel.card.includes('walked out of the Library') || !rel.card.includes('wine stains') || !rel.card.includes('prayer from her dry shelf')) fail('release card paragraphs');
  if (!rel.decoded.chapter_complete || !rel.decoded.released_thyken) fail('save code flags');
  if (rel.back.scene !== 'ending' || !rel.back.card) fail('continue after the end ' + JSON.stringify(rel.back));

  const will = await run('will', () => { Object.assign(S.flags, { sacrificed_thyken: true, sacrificed_will: true, varn_alive: true, mariveth_name_source: 'tome' }); S.will = false; });
  if (will.barks.length !== 3 || will.barks.some(b => b.startsWith('Will:'))) fail('will path lines ' + will.barks.length);
  if (!will.barks.some(b => b.includes('find his wife'))) fail('Kieran line on the Will path');
  if (!will.card.includes('and Will went with him') || !will.card.includes('he is not dead')) fail('will card');
  if (will.decoded.varn_alive !== true) fail('varn_alive not in the save code');

  const hero = await run('hero', () => { Object.assign(S.flags, { sacrificed_thyken: true, sacrificed_hero: 'kieran', varn_alive: true, mariveth_name_source: 'whisper', dinas_whisper: true }); S.party.kieran.alive = false; });
  if (hero.barks.some(b => b.startsWith('Kieran:'))) fail('the lost hero spoke');
  if (!hero.barks.some(b => b.startsWith('Ichabod: She has been quieter'))) fail('dinas_whisper permanent line missing');
  if (!hero.card.includes('and Kieran went with him') || !hero.card.includes('not yet been told the price')) fail('hero card');

  console.log(rel.barks.join('\n'));
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await b.close(); server.close();
})();
