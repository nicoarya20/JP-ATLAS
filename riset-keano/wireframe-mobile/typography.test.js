// Typography & spacing lint for screen modules + UI kit. Run: node --test typography.test.js
// Contract: TYPO-BRIEF.md — sizes from --fs-*, line heights from --lh-*, spacing from --sp-*, no layout in style="".
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');

const DIR = __dirname;
const FILES = fs.readdirSync(DIR).filter(f => /^screens\..+\.js$/.test(f) || f === 'ui.kit.js');
const BASE = fs.readFileSync(path.join(DIR, 'mobile.base.css'), 'utf8');

/** Run fn(line, lineNo, file) over every module line; collect "file:line  match" hits. */
function scan(fn) {
  const hits = [];
  for (const f of FILES) {
    fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach((line, i) => {
      for (const m of fn(line)) hits.push(`${f}:${i + 1}  ${m}`);
    });
  }
  return hits;
}
const report = hits => `${hits.length} hit(s):\n${hits.join('\n')}`;

test('base defines the full type, line-height and spacing scale', () => {
  for (const t of ['caption', 'xs', 'sm', 'h3', 'h2', 'title', 'num', 'icon', 'display']) assert.match(BASE, new RegExp(`--fs-${t}:\\s*\\d+px`), `--fs-${t}`);
  assert.match(BASE, /--fs:\s*15px/);
  for (const t of ['tight', 'snug', 'body']) assert.match(BASE, new RegExp(`--lh-${t}:`), `--lh-${t}`);
  for (const n of [1, 2, 3, 4, 5, 6]) assert.match(BASE, new RegExp(`--sp-${n}:\\s*${n * 4}px`), `--sp-${n}`);
});

test('font-size only from the --fs-* scale', () => {
  const hits = scan(line => [...line.matchAll(/font-size\s*:\s*([^;"'`}]+)/g)]
    .filter(m => !/^\s*(var\(--fs(-[a-z0-9]+)?\)|inherit)\s*$/.test(m[1])).map(m => m[0]));
  assert.deepEqual(hits, [], report(hits));
});

test('line-height only from --lh-* (or 1)', () => {
  const hits = scan(line => [...line.matchAll(/line-height\s*:\s*([^;"'`}]+)/g)]
    .filter(m => !/^\s*(var\(--lh-[a-z]+\)|1)\s*$/.test(m[1])).map(m => m[0]));
  assert.deepEqual(hits, [], report(hits));
});

test('margin / padding / gap use --sp-* (0, 1px, 2px, 6px allowed for hairlines & micro gaps)', () => {
  // Rejoin whitespace-split pieces while inside parentheses, so `calc(a - b)` stays one value.
  const joinParens = (acc, part) => {
    const open = acc.length && (acc.at(-1).split('(').length - acc.at(-1).split(')').length) > 0;
    if (open) acc[acc.length - 1] += ` ${part}`; else acc.push(part);
    return acc;
  };
  const OK = /^(0|1px|2px|6px|auto|var\(--sp-\d\)|calc\(.*var\(--sp-\d\).*\)|-?var\(--sp-\d\))$/;
  const hits = scan(line => [...line.matchAll(/\b(margin|padding|gap|row-gap|column-gap)(-(?:top|right|bottom|left))?\s*:\s*([^;"'`}]+)/g)]
    .filter(m => !m[3].trim().split(/\s+/).reduce(joinParens, []).every(v => OK.test(v) || /^-var\(--sp-\d\)$/.test(v)))
    .map(m => m[0].trim()));
  assert.deepEqual(hits, [], report(hits));
});

test('style="" carries no typography or spacing (use classes: .small .h3 .mt-* .stack.* .link …)', () => {
  const BANNED = /\b(font-size|font-weight|line-height|letter-spacing|margin(-[a-z]+)?|padding(-[a-z]+)?|gap)\s*:/;
  const hits = scan(line => [...line.matchAll(/style="([^"]*)"/g)].filter(m => BANNED.test(m[1])).map(m => m[0]));
  assert.deepEqual(hits, [], report(hits));
});

test('no section-letter markers (A/B/C/D) on Home cards', () => {
  const home = fs.readFileSync(path.join(DIR, 'screens.home.js'), 'utf8');
  assert.doesNotMatch(home, /hm-tag/);
  assert.doesNotMatch(home, /head\([^)]*,\s*'[A-D]'\)/);
});

// No emoji anywhere in the UI (user decision 2026-10-15). Functional text glyphs stay: ✓ ✕ ← → › ▾ ▴ ⋯ ✎ ↻ ● ○ ◆ ✦ • and ①…⑬.
test('no emoji in screen modules, UI kit, sample data or index', () => {
  const files = fs.readdirSync(DIR).filter(f => /^(screens\..+|ui\.kit|data\.sample(\..+)?|app\.router)\.js$/.test(f) || f === 'index.html');
  const hits = [];
  for (const f of files) {
    fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/\p{Extended_Pictographic}|◷/gu)) hits.push(`${f}:${i + 1}  ${m[0]}`);
    });
  }
  assert.deepEqual(hits, [], report(hits));
});

// Regression: `.card { display:block }` sat after `.stack { display:grid }`, so every `card stack` lost its gap
// (chips touching the input, headings touching content). Mini-cascade over class-only selectors, in load order.
test('every element with .stack still resolves to display:grid', () => {
  const order = [...fs.readFileSync(path.join(DIR, 'index.html'), 'utf8').matchAll(/<script src="(screens\.[^"]+)"/g)].map(m => m[1]);
  const css = [BASE, ...order.map(f => fs.readFileSync(path.join(DIR, f), 'utf8'))].join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = []; // [classes[], display] in cascade order
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const d = (m[2].match(/(?:^|;)\s*display\s*:\s*([\w-]+)/) || [])[1];
    if (d) for (const sel of m[1].split(',')) if (/^(\.[\w-]+)+$/.test(sel.trim())) rules.push([sel.trim().slice(1).split('.'), d]);
  }
  const display = cls => rules.filter(([sel]) => sel.every(c => cls.includes(c)))
    .reduce((best, r) => (!best || r[0].length >= best[0].length ? r : best), null)?.[1];
  const hits = scan(line => [
    ...[...line.matchAll(/class="([^"]*\bstack\b[^"]*)"/g)].map(m => m[1]),
    ...[...line.matchAll(/cls:\s*['"]([^'"]*\bstack\b[^'"]*)/g)].map(m => `card ${m[1]}`), // UI.card({ cls })
  ].map(v => v.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean))
    .filter(cls => display(cls) !== 'grid').map(cls => `${cls.join(' ')} → ${display(cls)}`));
  assert.deepEqual(hits, [], report(hits));
});

// Regression: a filter .chips row in Projects collapsed to a sliver once the list overflowed the screen.
test('.stack rows are sized to content, so scroll containers (.chips/.tabs) never collapse', () => {
  const rule = (BASE.replace(/\/\*[\s\S]*?\*\//g, '').match(/(?:^|\n)\.stack\s*\{([^}]*)\}/) || [])[1] || '';
  assert.match(rule, /grid-auto-rows:\s*max-content/);
  assert.match(rule, /align-content:\s*start/);  // …and every horizontal scroller pins its own min height (flex parents squash it too).
  const css = [BASE, ...FILES.map(f => fs.readFileSync(path.join(DIR, f), 'utf8'))].join('\n');
  const bad = [...css.matchAll(/(\.[\w-]+)\s*\{([^}]*overflow-x:\s*auto[^}]*)\}/g)].filter(m => !/min-height:\s*min-content/.test(m[2])).map(m => m[1]);
  assert.deepEqual(bad, [], `scroll containers without min-height: min-content: ${bad.join(', ')}`);
});
