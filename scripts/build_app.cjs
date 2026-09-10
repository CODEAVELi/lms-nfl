// Compile the React source ahead of time so visitors do not download/run Babel.
// Usage: node scripts/build_app.cjs [path/to/babel-standalone.js]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
(async () => {
  const response = process.argv[2] ? null : await fetch('https://unpkg.com/@babel/standalone@8.0.4/babel.min.js', {signal: AbortSignal.timeout(30000)});
  if (response && !response.ok) throw new Error(`Babel download failed: ${response.status}`);
  const compiler = process.argv[2] ? fs.readFileSync(process.argv[2], 'utf8') : await response.text();
  const context = vm.createContext({});
  vm.runInContext(compiler, context);
  if (context.Babel.version !== '8.0.4') throw new Error('Build requires Babel standalone 8.0.4.');
  const source = fs.readFileSync(path.join(root, 'app.jsx'), 'utf8');
  const output = context.Babel.transform(source, {presets: [['react', {runtime: 'classic'}]], comments: false}).code;
  fs.writeFileSync(path.join(root, 'app.js'), '// Generated from app.jsx by scripts/build_app.cjs.\n' + output + '\n');
  console.log('Built app.js (React classic runtime).');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
