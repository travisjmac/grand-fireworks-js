'use strict';
// Compile in an isolated temporary package; framework tooling stays out of core.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grand-fireworks-angular-'));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run through npm run build:angular.');
function run(args, cwd = temp) {
  return execFileSync(process.execPath, [npm, ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}
fs.writeFileSync(path.join(temp, 'package.json'), JSON.stringify({ name: 'angular-release-build', private: true }));
const [packed] = JSON.parse(run(['pack', '--json', '--pack-destination', temp], root));
run(['install', '--ignore-scripts', '--no-audit', '--no-fund',
  '@angular/compiler-cli@19.2.25', '@angular/core@19.2.25', '@angular/common@19.2.25',
  'typescript@5.8.3', 'rxjs@7', 'tslib@2', path.join(temp, packed.filename)]);
fs.copyFileSync(path.join(root, 'packages/angular/index.ts'), path.join(temp, 'index.ts'));
fs.writeFileSync(path.join(temp, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2022', module: 'ES2022', moduleResolution: 'node', experimentalDecorators: true,
    declaration: true, outDir: 'dist', skipLibCheck: true, strict: true, esModuleInterop: true },
  angularCompilerOptions: { compilationMode: 'partial', strictTemplates: true }, files: ['index.ts']
}));
execFileSync(process.execPath, [path.join(temp, 'node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js'), '-p', 'tsconfig.json'], { cwd: temp, stdio: 'inherit' });
fs.cpSync(path.join(temp, 'dist'), path.join(root, 'packages/angular/dist'), { recursive: true });
console.log('Angular partial compilation complete. Temporary build:', temp);
