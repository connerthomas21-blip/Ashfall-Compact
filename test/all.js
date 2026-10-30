// Runs every milestone test in order and fails if any of them reports FAIL, a page error, or a non-zero exit.
// Usage: node test/all.js <screenshot-dir>     (run this before every commit)
const { spawnSync } = require('child_process'), path = require('path');
const out = process.argv[2] || '.';
const tests = ['smoke', 'dialogue', 'doors', 'library', 'combat', 'choice', ['varn', '3'], 'ending'];
let bad = 0;
for (const t of tests) {
  const [name, ...args] = [].concat(t);
  const r = spawnSync(process.execPath, [path.join(__dirname, name + '.js'), out, ...args], { encoding: 'utf8', env: process.env });
  const text = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0 && !/FAIL|ERRORS:/.test(text);
  if (!ok) bad++;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${name}`);
  if (!ok) console.log(text.split('\n').filter(l => /FAIL|ERROR|Error|rror:/.test(l)).slice(0, 8).map(l => '      ' + l).join('\n'));
}
console.log(bad ? `${bad} test file(s) failed` : 'all tests passed');
process.exit(bad ? 1 : 0);
