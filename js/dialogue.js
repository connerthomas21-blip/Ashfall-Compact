'use strict';
/* ============================== DIALOGUE ENGINE ==============================
  Conversations are data (js/script.js): DIALOGUES[id] = { start, nodes }.
  node:   { lines: [line], again?: [line], set?: {flag: value}, setOnce?: {flag: value}, choices?: [choice], next?: nodeId, end?: true, act?: name }
            `again` replaces `lines` when the node is revisited (hub nodes). `setOnce` only sets flags that are still unset.
            `act` is handed to the conversation's onEnd callback, so a scene can react (e.g. open the naming panel).
  line:   { who?, text, if? }        who is a hero id, 'will', or any display name; no who = narration.
  choice: { text, go, by?, if?, set?, repeat? }
            by: the hero who says it (choice hidden if they're gone); otherwise the current leader says it.
            Choices disappear once taken unless repeat is true.
  if:     { has: flag|[flags], not: flag|[flags], eq: {flag: value}, alive: heroId, will: bool }  (all must hold)
*/

let D = null;   // live conversation: { id, seen: Set, onEnd }

const asList = v => v == null ? [] : Array.isArray(v) ? v : [v];
function cond(c) {
  if (!c) return true;
  if (asList(c.has).some(k => !flag(k))) return false;
  if (asList(c.not).some(k => flag(k))) return false;
  if (c.eq && Object.entries(c.eq).some(([k, v]) => S.flags[k] !== v)) return false;
  if (c.alive && !S.party[c.alive].alive) return false;
  if (c.will != null && !!S.will !== c.will) return false;
  return true;
}
const whoName = w => w == null ? null : HEROES[w] ? HEROES[w].name : w === 'will' ? WILL.name : w;
const toBlock = l => ({ who: whoName(l.who), text: l.text });

function runDialogue(id, onEnd, start) {
  D = { id, seen: new Set(), visited: new Set(), onEnd };
  enterNode(start || DIALOGUES[id].start);
}

function enterNode(nid, lead = []) {
  const node = DIALOGUES[D.id].nodes[nid];
  if (node.set) Object.assign(S.flags, node.set);
  if (node.setOnce) for (const [k, v] of Object.entries(node.setOnce)) if (S.flags[k] === undefined) S.flags[k] = v;
  D.act = node.act || null;
  const src = D.visited.has(nid) && node.again ? node.again : node.lines || [];
  D.visited.add(nid);
  const blocks = [...lead, ...src.filter(l => cond(l.if)).map(toBlock)];
  const choices = (node.choices || []).map((c, k) => ({ ...c, key: nid + ':' + k }))
    .filter(c => cond(c.if) && (!c.by || S.party[c.by].alive) && (c.repeat || !D.seen.has(c.key)));
  const after = node.next ? () => enterNode(node.next) : node.end || !choices.length ? endDialogue : null;
  G.say = { blocks: blocks.length ? blocks : [{ text: '…' }], i: 0, choices: choices.length ? choices : null, then: after, screen: !!DIALOGUES[D.id].screen };
  if (G.say.screen) G.say.i = G.say.blocks.length - 1;   // a page shows every paragraph at once
  renderUI();
}

function chooseOption(k) {
  const s = G.say, c = s && s.choices && s.choices[k];
  if (!c || s.i < s.blocks.length - 1) return;
  D.seen.add(c.key);
  if (c.set) Object.assign(S.flags, c.set);
  // The chosen line is spoken aloud by whoever asks it, then the reply follows.
  // On a full page (the Choice) a decision belongs to the whole party, so only a hero's own offer is voiced.
  const page = DIALOGUES[D.id].screen;
  enterNode(c.go, page && !c.by ? [] : [{ who: whoName(c.by || S.lead), text: c.text }]);
}

function endDialogue() {
  const d = D; D = null; G.say = null;
  save();
  renderUI();
  d && d.onEnd && d.onEnd(d.act);
}

// Checks a script for broken links and unknown speakers. Returns a list of problems (used by tests).
function lintDialogue(id) {
  const d = DIALOGUES[id], out = [];
  if (!d.nodes[d.start]) out.push(`${id}: missing start ${d.start}`);
  for (const [nid, n] of Object.entries(d.nodes)) {
    if (n.next && !d.nodes[n.next]) out.push(`${id}.${nid}: next -> ${n.next}`);
    for (const c of n.choices || []) {
      if (!d.nodes[c.go]) out.push(`${id}.${nid}: choice -> ${c.go}`);
      if (c.by && !HEROES[c.by]) out.push(`${id}.${nid}: unknown hero ${c.by}`);
    }
    if (!n.choices && !n.next && !n.end) out.push(`${id}.${nid}: dead end`);
  }
  return out;
}
