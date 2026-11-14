'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grand-fireworks-solid-'));
if (!process.env.npm_execpath) throw new Error('Run through npm run build:solid.');
fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: 'solid-release-build', private: true }));
execFileSync(process.execPath, [process.env.npm_execpath, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '@babel/core@7', 'babel-preset-solid@1'], { cwd: temp, stdio: 'inherit' });
const { transformSync } = require(path.join(temp, 'node_modules/@babel/core'));
const preset = require(path.join(temp, 'node_modules/babel-preset-solid'));
const dir = path.join(root, 'packages/solid');
fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
for (const [file, generate] of [['client.js', 'dom'], ['server.js', 'ssr']]) {
  const output = transformSync(fs.readFileSync(path.join(dir, 'index.jsx'), 'utf8'), {
    filename: 'GrandFireworks.jsx', presets: [[preset, { generate }]]
  });
  fs.writeFileSync(path.join(dir, 'dist', file), output.code + '\n');
}
console.log('Solid browser/server compilation complete.');
