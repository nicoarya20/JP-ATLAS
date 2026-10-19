// Tests for theme.switcher.js + palette lint. Run: node --test theme.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');

const DIR = __dirname;
const SRC = fs.readFileSync(path.join(DIR, 'theme.switcher.js'), 'utf8');
const TOKENS = fs.readFileSync(path.join(DIR, 'theme.tokens.css'), 'utf8');

/** Load theme.switcher.js in a stub browser. opts: {search, hash, dark, noMatchMedia, noRoot, host, storage}. */
function load(opts = {}) {
  const calls = [];
  const listeners = [];
  const loc = { search: opts.search || '', hash: opts.hash || '' };
  const history = {
    replaceState(_s, _t, url) {
      calls.push(url);
      const [, search = '', hash = ''] = url.match(/^(\?[^#]*)?(#.*)?$/) || [];
      loc.search = search; loc.hash = hash;
    },
  };
  const mql = { matches: !!opts.dark, addEventListener: (_t, fn) => listeners.push(fn) };
  const ready = [];
  const document = {
    readyState: 'loading',
    addEventListener: (t, fn) => { if (t === 'DOMContentLoaded') ready.push(fn); },
    querySelector: sel => (sel === '.index .theme-switch' ? opts.host || null : null),
  };
  if (!opts.noRoot) document.documentElement = { dataset: {} };
  const ctx = { URLSearchParams, location: loc, history, document };
  if (!opts.noMatchMedia) ctx.matchMedia = () => mql;
  if (opts.storage) ctx.localStorage = opts.storage;
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'theme.switcher.js' });
  const setDark = v => { mql.matches = v; listeners.forEach(fn => fn({ matches: v })); };
  const domReady = () => ready.forEach(fn => fn());
  return { Theme: ctx.Theme, root: document.documentElement, loc, calls, setDark, domReady };
}

test('ACCENTS and MODES follow the ClickUp order', () => {
  const { Theme } = load();
  const keys = list => Array.from(list, ([k]) => k); // copy out of the vm realm for deepEqual
  assert.deepEqual(keys(Theme.ACCENTS),
    ['black', 'purple', 'blue', 'pink', 'violet', 'indigo', 'orange', 'teal', 'bronze', 'mint']);
  assert.deepEqual(keys(Theme.MODES), ['light', 'dark', 'auto']);
  for (const [k, label] of [...Theme.ACCENTS, ...Theme.MODES]) assert.equal(label, k[0].toUpperCase() + k.slice(1));
});

test('every accent has a [data-accent] rule with a hex color in theme.tokens.css', () => {
  const { Theme } = load();
  for (const [k] of Theme.ACCENTS) {
    const rule = new RegExp(`\\[data-accent="${k}"\\]\\s*\\{\\s*--accent:\\s*#[0-9a-f]{6}\\s*;`, 'i');
    assert.match(TOKENS, rule, `missing --accent for "${k}"`);
  }
});

// Regression: a plain `:root { --accent }` has the same specificity as [data-accent="x"] and, declared later,
// pinned <html> to Purple whatever accent was picked.
test('plain :root blocks do not declare --accent (would override the chosen accent)', () => {
  const css = TOKENS.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = css.split('}').filter(b => b.includes('{')).map(b => b.split('{').map(x => x.trim()));
  const plainRoot = blocks.filter(([sel]) => sel.split(',').some(x => x.trim() === ':root'));
  assert.ok(plainRoot.length > 0, 'expected a :root block');
  for (const [sel, body] of plainRoot) assert.doesNotMatch(body, /--accent\s*:/, `--accent declared in "${sel}"`);
  assert.match(css, /:root:not\(\[data-accent\]\)\s*\{\s*--accent:\s*#7e77e9/i, 'Purple fallback missing');
});

test('no query params → defaults light + purple', () => {
  const { Theme, root, calls } = load();
  assert.equal(Theme.mode, 'light');
  assert.equal(Theme.accent, 'purple');
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.dataset.accent, 'purple');
  assert.equal(calls.length, 0, 'loading must not rewrite the URL');
});

test('valid query params are applied', () => {
  const { Theme, root } = load({ search: '?role=pm&mode=dark&accent=teal' });
  assert.equal(Theme.mode, 'dark');
  assert.equal(Theme.accent, 'teal');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.dataset.accent, 'teal');
});

test('invalid query params fall back to defaults', () => {
  const { Theme, root } = load({ search: '?role=pm&mode=neon&accent=red' });
  assert.equal(Theme.mode, 'light');
  assert.equal(Theme.accent, 'purple');
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.dataset.accent, 'purple');
});

test('set() writes attributes and URL, keeping role and hash', () => {
  const { Theme, root, loc, calls } = load({ search: '?role=admin', hash: '#tasks.my' });
  const res = Theme.set({ mode: 'dark', accent: 'mint' });
  assert.deepEqual({ ...res }, { mode: 'dark', accent: 'mint' });
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.dataset.accent, 'mint');
  assert.equal(calls.at(-1), '?role=admin&mode=dark&accent=mint#tasks.my');
  Theme.set({ accent: 'orange' });
  assert.equal(loc.search, '?role=admin&mode=dark&accent=orange');
  assert.equal(loc.hash, '#tasks.my');
  assert.equal(Theme.mode, 'dark', 'omitted mode stays unchanged');
});

test('set() ignores unknown values', () => {
  const { Theme, root } = load({ search: '?mode=dark&accent=pink' });
  Theme.set({ mode: 'sepia', accent: 'gold' });
  assert.equal(Theme.mode, 'dark');
  assert.equal(Theme.accent, 'pink');
  assert.equal(root.dataset.accent, 'pink');
});

test('auto resolves from matchMedia and follows changes live', () => {
  const t = load({ search: '?mode=auto', dark: true });
  assert.equal(t.Theme.mode, 'auto');
  assert.equal(t.root.dataset.theme, 'dark');
  t.setDark(false);
  assert.equal(t.root.dataset.theme, 'light');
  assert.equal(t.Theme.resolved, 'light');
  t.Theme.set({ mode: 'dark' });
  t.setDark(false);
  assert.equal(t.root.dataset.theme, 'dark', 'explicit mode ignores OS changes');
});

test('no crash without matchMedia or documentElement', () => {
  const a = load({ search: '?mode=auto', noMatchMedia: true });
  assert.equal(a.root.dataset.theme, 'light', 'auto without matchMedia → light');
  const b = load({ noRoot: true });
  assert.doesNotThrow(() => b.Theme.set({ mode: 'dark', accent: 'blue' }));
  assert.equal(b.Theme.accent, 'blue');
});

test('switcher UI renders tiles + swatches and handles clicks', () => {
  let clickFn;
  const host = { innerHTML: '', addEventListener: (t, fn) => { if (t === 'click') clickFn = fn; } };
  const t = load({ search: '?role=member&accent=violet', host });
  t.domReady();
  assert.equal((host.innerHTML.match(/data-ts-mode="/g) || []).length, 3);
  assert.equal((host.innerHTML.match(/<i data-accent="/g) || []).length, 10);
  assert.match(host.innerHTML, /data-ts-accent="violet" aria-pressed="true"><i data-accent="violet">✓<\/i>/);
  assert.match(host.innerHTML, /data-ts-mode="light" aria-pressed="true"/);
  assert.doesNotMatch(host.innerHTML, /data-(role|go)=/, 'must not trigger router delegation');
  const btn = { dataset: { tsAccent: 'bronze' } };
  clickFn({ target: { closest: () => btn } });
  assert.equal(t.root.dataset.accent, 'bronze');
  assert.match(host.innerHTML, /data-ts-accent="bronze" aria-pressed="true"/);
  assert.equal(t.loc.search, '?role=member&accent=bronze&mode=light');
});

test('panel collapses via header, keeps summary, remembers state', () => {
  let clickFn;
  const store = {};
  const storage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const host = { innerHTML: '', addEventListener: (t, fn) => { if (t === 'click') clickFn = fn; } };
  const t = load({ search: '?mode=dark&accent=teal', host, storage });
  t.domReady();
  assert.match(host.innerHTML, /data-ts-toggle aria-expanded="true"/);
  assert.match(host.innerHTML, /<small>Dark · Teal<\/small>/);
  assert.match(host.innerHTML, /class="ts-body">/);
  const toggle = { dataset: { tsToggle: '' } };
  clickFn({ target: { closest: () => toggle } });
  assert.match(host.innerHTML, /aria-expanded="false"/);
  assert.match(host.innerHTML, /class="ts-body" hidden>/);
  assert.equal(store['wfm.themeSwitch.open'], '0');
  assert.equal(t.root.dataset.accent, 'teal', 'toggle must not change the theme');
  const again = load({ host: { innerHTML: '', addEventListener() {} }, storage });
  assert.equal(again.Theme.accent, 'purple');
});

test('collapse state survives a throwing localStorage', () => {
  let clickFn;
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const host = { innerHTML: '', addEventListener: (t, fn) => { if (t === 'click') clickFn = fn; } };
  const t = load({ host, storage });
  t.domReady();
  assert.match(host.innerHTML, /aria-expanded="true"/);
  clickFn({ target: { closest: () => ({ dataset: { tsToggle: '' } }) } });
  assert.match(host.innerHTML, /aria-expanded="false"/);
});

// Palette lint: colors come only from theme.tokens.css. Expected to fail until every module owner has migrated.
test('lint: no raw hex / rgb() / white|black colors or var(--dark) outside theme.tokens.css', () => {
  const HEX = /(?<=[\s:(,'`])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
  const FUNC = /\b(?:rgba?|hsla?)\(/g;
  const NAMED = /\b(?:color|background(?:-color)?|border(?:-[a-z]+)?|fill|stroke|outline)\s*:[^;"'`}]*\b(?:white|black)\b/gi;
  const DARK = /var\(--dark\)/g;
  const files = fs.readdirSync(DIR).filter(f => /\.(js|css)$/.test(f) && f !== 'theme.tokens.css' && f !== 'theme.test.js');
  const hits = [];
  for (const f of files) {
    fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').forEach((line, i) => {
      for (const re of [HEX, FUNC, NAMED, DARK]) for (const m of line.matchAll(re)) hits.push(`${f}:${i + 1}  ${m[0]}`);
    });
  }
  assert.deepEqual(hits, [], `raw colors found:\n${hits.join('\n')}`);
});
