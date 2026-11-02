/**
 * Renders comparison/features.json into the README, the homepage, and compare.html.
 * Every row is a Grand Fireworks feature, so the first library column is always yes.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataPath = path.join(root, 'comparison', 'features.json');
const START = '<!-- comparison:start -->';
const END = '<!-- comparison:end -->';
const STRIP_START = '<!-- comparison-strip:start -->';
const STRIP_END = '<!-- comparison-strip:end -->';
const FULL_START = '<!-- comparison-full:start -->';
const FULL_END = '<!-- comparison-full:end -->';

function load() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function rowsOf(data) {
  return data.groups.flatMap(group => group.rows.map(row => ({ ...row, group: group.name })));
}

function mark(state, detail) {
  if (state === 'yes') return { html: '✅', md: '✅', cls: 'yes' };
  if (state === 'no') return { html: '❌', md: '❌', cls: 'no' };
  if (state === 'part') {
    const note = detail ? ` ${detail}` : '';
    return { html: `⚠️${note}`, md: `⚠️${note}`, cls: 'part' };
  }
  throw new Error(`Unknown comparison state: ${state}`);
}

function tableHtml(data, { glance = false } = {}) {
  const head = `<thead><tr><th>Feature</th><th>${data.us.name}</th><th>${data.them.name}</th></tr></thead>`;
  const body = data.groups.map(group => {
    const rows = group.rows.filter(row => !glance || row.glance);
    if (!rows.length) return '';
    const label = `<tr class="group"><th colspan="3">${group.name}</th></tr>`;
    const items = rows.map(row => {
      const ours = mark('yes');
      const theirs = mark(row.them, row.detail);
      return `<tr><th scope="row">${row.feature}</th><td class="${ours.cls}">${ours.html}</td><td class="${theirs.cls}">${theirs.html}</td></tr>`;
    }).join('');
    return label + items;
  }).join('');
  return `<div class="table-wrap compare-table"><div class="compare-scroll"><table id="comparison">${head}<tbody>${body}</tbody></table></div></div>`;
}

function sourceName(href) {
  if (href.includes('#readme')) return 'README';
  return href.split('/').pop();
}

function legend(data) {
  const links = data.sources.map(href => `<a href="${href}">${sourceName(href)}</a>`).join(', ');
  return `<p class="compare-legend">✅ supported · ⚠️ partial · ❌ not supported</p><p class="compare-note">Verified ${data.verified} against <a href="${data.them.source}">${data.them.name} ${data.them.version}</a> and Grand Fireworks JS ${data.us.version}. Sources: ${links}.</p>`;
}

function tableMarkdown(data, { glance = false } = {}) {
  const lines = [
    `| Feature | ${data.us.name} | ${data.them.name} |`,
    '| --- | :---: | :---: |',
  ];
  for (const group of data.groups) {
    const rows = group.rows.filter(row => !glance || row.glance);
    if (!rows.length) continue;
    lines.push(`| **${group.name}** | | |`);
    for (const row of rows) {
      const ours = mark('yes');
      const theirs = mark(row.them, row.detail);
      lines.push(`| ${row.feature} | ${ours.md} | ${theirs.md} |`);
    }
  }
  return lines.join('\n');
}

function readmeSection(data) {
  const sourceLinks = data.sources.map(href => `[${sourceName(href)}](${href})`).join(', ');
  return `${START}
## Grand Fireworks or fireworks-js

Every row is a Grand Fireworks feature. A mark in the fireworks-js column means [fireworks-js](${data.them.source}) ${data.them.version} has that feature too.

${tableMarkdown(data, { glance: true })}

✅ supported · ⚠️ partial · ❌ not supported

Verified ${data.verified} against fireworks-js ${data.them.version} and Grand Fireworks JS ${data.us.version}. Sources: ${sourceLinks}.

The full feature list is on the [comparison page](compare.html).
${END}`;
}

function stripHtml() {
  return `${STRIP_START}<section class="compare-strip" id="compare-strip"><p class="compare-pills"><span class="pill">WebGL 2</span><span class="pill">15 shells</span><span class="pill">Text fireworks</span><span class="pill">Sound engine</span><span class="pill">Guided workbench</span><a href="#compare">Every feature, compared</a></p></section>${STRIP_END}`;
}

function fullHtml(data) {
  return `${FULL_START}<section class="compare-strip" id="compare"><h2>How it compares</h2><p class="compare-note">Every row is a Grand Fireworks feature. fireworks-js gets a mark only where version ${data.them.version} has that same feature. <a href="compare.html">Open the comparison on its own page</a>.</p>${tableHtml(data)}${legend(data)}</section>${FULL_END}`;
}

function pageHtml(data) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Grand Fireworks JS compared with fireworks-js</title>
  <meta name="description" content="Every Grand Fireworks JS feature, checked against fireworks-js ${data.them.version}.">
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="site-navigation.css">
</head>
<body>
  <nav class="section-nav" aria-label="Documentation sections">
    <a href="index.html#quick-start">Start</a>
    <a href="index.html#examples">Experiences</a>
    <a href="index.html#compare" class="active" aria-current="page">Compare</a>
    <a href="detailed-config-guide.html">Guide</a>
    <a href="examples/guided-builder.html?mode=workbench">Workbench</a>
  </nav>
  <main class="page-content compare-page">
    <h1>Grand Fireworks or fireworks-js</h1>
    <p class="lead">Every row is a feature Grand Fireworks has. fireworks-js gets a mark only where version ${data.them.version} has that same feature.</p>
    ${tableHtml(data)}
    ${legend(data)}
  </main>
</body>
</html>
`;
}

function replaceBlock(source, start, end, block) {
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  if (from !== -1 && to !== -1 && to > from) {
    return source.slice(0, from) + block + source.slice(to + end.length);
  }
  return null;
}

function write() {
  const data = load();
  const readmePath = path.join(root, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');
  const nextReadme = replaceBlock(readme, START, END, readmeSection(data));
  if (nextReadme) readme = nextReadme;
  else {
    const old = readme.indexOf('## Grand Fireworks or tsParticles');
    const life = readme.indexOf('## Show lifecycle');
    if (old === -1 || life === -1) throw new Error('README comparison section was not found');
    readme = readme.slice(0, old) + readmeSection(data) + '\n\n' + readme.slice(life);
  }
  readme = readme.replace('[tsParticles](#grand-fireworks-or-tsparticles)', '[fireworks-js](#grand-fireworks-or-fireworks-js)');
  fs.writeFileSync(readmePath, readme);

  const indexPath = path.join(root, 'index.html');
  let index = fs.readFileSync(indexPath, 'utf8');
  const nextStrip = replaceBlock(index, STRIP_START, STRIP_END, stripHtml());
  if (nextStrip) index = nextStrip;
  else {
    const from = index.indexOf('<section class="compare-strip"');
    const to = index.indexOf('<h2 id="quick-start">');
    if (from === -1 || to === -1) throw new Error('Homepage comparison strip was not found');
    index = index.slice(0, from) + stripHtml() + index.slice(to);
  }
  const nextFull = replaceBlock(index, FULL_START, FULL_END, fullHtml(data));
  if (nextFull) index = nextFull;
  else {
    const main = index.indexOf('</main>');
    if (main === -1) throw new Error('Homepage main was not found');
    index = index.slice(0, main) + fullHtml(data) + index.slice(main);
  }
  index = index.replace(
    '<a href="#examples">Experiences</a><a href="detailed-config-guide.html">Guide</a>',
    '<a href="#examples">Experiences</a><a href="#compare">Compare</a><a href="detailed-config-guide.html">Guide</a>'
  );
  fs.writeFileSync(indexPath, index);
  fs.writeFileSync(path.join(root, 'compare.html'), pageHtml(data));
  return data;
}

module.exports = { load, rowsOf, tableHtml, tableMarkdown, readmeSection, fullHtml, pageHtml, write };

if (require.main === module) {
  const data = write();
  const count = rowsOf(data).length;
  console.log(`comparison rendered: ${count} features`);
}
