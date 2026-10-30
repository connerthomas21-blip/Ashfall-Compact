'use strict';
/* ============================== UI: DOM overlay (title, menu, story text) and its keys ============================== */

const uiEl = document.getElementById('ui');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let U = { screen: 'title', code: null };

function renderUI() {
  let h = '';
  if (U.screen === 'title') {
    const saved = loadSaved();
    h = `<div class="screen">
      <h1>The Ashfall Compact</h1><h2>The Deep Echo Library</h2>
      <div class="menu">
        ${saved ? '<button data-a="continue">Continue</button>' : ''}
        <button data-a="new">New game</button>
        <button data-a="load-code">Load a save code</button>
      </div>
      ${U.code === 'load' ? '<textarea id="code" placeholder="Paste a save code"></textarea><button data-a="load-go">Load</button>' : ''}
      ${U.err ? `<p>${esc(U.err)}</p>` : ''}
    </div>`;
  } else if (G.menu) {
    h = `<div class="screen"><h2>The Ashfall Compact</h2>
      <div class="menu">
        <button data-a="resume">Resume</button>
        <button data-a="show-code">Save code</button>
        <button data-a="to-title">Return to title</button>
      </div>
      ${U.code === 'show' ? `<p>Copy this to keep your save somewhere else.</p><textarea readonly>${esc(encodeSave())}</textarea>` : ''}
      <p>WASD or arrows to move. 1, 2, 3 or Tab to change hero. E to examine. Space to pause. Esc for this menu.</p>
    </div>`;
  } else if (G.say) {
    const b = G.say.blocks[G.say.i], last = G.say.i >= G.say.blocks.length - 1, ch = last && G.say.choices;
    h = `<div id="say" ${ch ? '' : 'data-a="advance"'}>${b.who ? `<div class="who">${esc(b.who)}</div>` : ''}<p>${esc(b.text)}</p>
      ${ch ? `<div class="choices">${ch.map((c, k) => `<button data-a="choose" data-i="${k}"><span>${k + 1}</span>${c.by ? `<em>${esc(HEROES[c.by].name)}:</em> ` : ''}${esc(c.text)}</button>`).join('')}</div>`
        : `<div class="more">${last ? 'Close' : 'Continue'} (E, Enter or click)</div>`}</div>`;
  } else if (G.sceneId === 'escape' && S.playtime < 25) {
    h = '<div class="hint">WASD or arrows to move · 1 2 3 or Tab to change hero · Space to pause · Esc for menu</div>';
  }
  uiEl.innerHTML = h;
  const first = uiEl.querySelector('button'); if (first && U.screen === 'title' && !U.code) first.focus();
}

uiEl.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  act(el.dataset.a, el.dataset);
});

function act(a, data = {}) {
  if (a === 'new') {
    const dev = (location.hash.match(/scene=(\w+)/) || [])[1];   // #scene=thyken jumps straight to a scene for testing
    S = fresh(); U = { screen: 'game' }; go(SCENES[dev] ? dev : S.scene, { fromTitle: true });
  }
  if (a === 'continue') { S = Object.assign(fresh(), loadSaved()); U = { screen: 'game' }; go(S.scene, { noSave: true }); }
  if (a === 'load-code') { U.code = 'load'; U.err = null; renderUI(); }
  if (a === 'load-go') {
    try { S = decodeSave(document.getElementById('code').value); save(); U = { screen: 'game' }; go(S.scene, { noSave: true }); }
    catch (e) { U.err = 'That code could not be read.'; renderUI(); }
  }
  if (a === 'resume') { G.menu = false; U.code = null; renderUI(); }
  if (a === 'show-code') { U.code = 'show'; renderUI(); }
  if (a === 'to-title') { G.menu = false; G.scene = null; G.room = null; U = { screen: 'title' }; renderUI(); }
  if (a === 'advance') advanceSay();
  if (a === 'choose') chooseOption(+data.i);
}

function advanceSay() {
  const s = G.say; if (!s) return;
  if (s.choices && s.i >= s.blocks.length - 1) return;
  if (++s.i >= s.blocks.length) { G.say = null; s.then && s.then(); }
  renderUI();
}

// Keys that work while the world is frozen. Called every frame by the loop.
let hintShown = true;
function uiKeys() {
  if (U.screen !== 'game') return;
  if (G.say) {
    const s = G.say, choosing = s.choices && s.i >= s.blocks.length - 1;
    if (choosing) { for (let k = 0; k < s.choices.length; k++) if (hit('Digit' + (k + 1), 'Numpad' + (k + 1))) { chooseOption(k); pressed.clear(); break; } }
    else if (hit('KeyE', 'Enter', 'Space')) { advanceSay(); pressed.clear(); }
    return;
  }
  if (hit('Escape')) { G.menu = !G.menu; U.code = null; renderUI(); return; }
  if (G.menu) return;
  if (hit('Space')) G.paused = !G.paused;
  // Drop the controls hint once it has had its time on screen.
  const want = G.sceneId === 'escape' && S.playtime < 25;
  if (want !== hintShown) { hintShown = want; renderUI(); }
}

/* ---------- Boot ---------- */
resize();
renderUI();
requestAnimationFrame(frame);
