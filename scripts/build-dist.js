'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const terser = require('terser');
const pkg = require('../package.json');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const sourcePath = path.join(root, 'GrandFireworks.js');
const baseName = `GrandFireworks-v${pkg.version}`;
const banner = `/*! Grand Fireworks JS v${pkg.version} | Travis MacDonald | MIT License */`;

async function build() {
  const source = fs.readFileSync(sourcePath, 'utf8');
  if (!source.includes(`GrandFireworks.VERSION='${pkg.version}'`)) {
    throw new Error(`GrandFireworks.VERSION does not match package version ${pkg.version}`);
  }

  fs.mkdirSync(dist, { recursive: true });
  for (const entry of fs.readdirSync(dist)) {
    if (/^GrandFireworks-v.*\.js(?:\.gz)?$/.test(entry)) fs.rmSync(path.join(dist, entry));
  }

  const fullPath = path.join(dist, `${baseName}.js`);
  const minPath = path.join(dist, `${baseName}.min.js`);
  const gzipPath = `${minPath}.gz`;
  fs.writeFileSync(fullPath, source);

  const result = await terser.minify(source, {
    compress: true,
    mangle: true,
    format: { comments: false }
  });
  if (!result.code) throw new Error('Terser produced no output');
  const minified = `${banner}\n${result.code}\n`;
  fs.writeFileSync(minPath, minified);
  fs.writeFileSync(gzipPath, zlib.gzipSync(minified, { level: 9 }));

  for (const file of [fullPath, minPath, gzipPath]) {
    const size = fs.statSync(file).size;
    console.log(`${path.relative(root, file)} ${size} bytes`);
  }
}

build().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
