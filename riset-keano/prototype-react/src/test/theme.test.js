// Theme layer guards: library.css and press.css load last, use only defined tokens, and every themed token must switch under .dark.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = join(__dirname, '..');
const read = f => readFileSync(join(src, f), 'utf8');
const tokens = read('styles/tokens.css');
const library = read('styles/library.css');
const press = read('styles/press.css');
const block = sel => tokens.slice(tokens.indexOf(`${sel} {`), tokens.indexOf('}', tokens.indexOf(`${sel} {`)));
const defined = text => new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));

// --accent is absent on purpose: it follows --color-blue, which .dark redefines.
const THEMED = ['--bg', '--surface', '--fill', '--label', '--label-2', '--label-3', '--separator', '--accent-soft',
  '--sheet-bg', '--sheet-surface', '--overlay', '--avatar-bg', '--switch-off', '--seg-thumb',
  '--glass-bar', '--glass-bar-edge', '--glass-bar-shine', '--glass-bar-active', '--glass-bar-shadow'];

describe('theme layer', () => {
  it('is imported after the screens so it wins over the library scss', () => {
    const main = read('main.jsx');
    const screens = main.indexOf("import './screens'");
    expect(screens).toBeGreaterThan(-1);
    expect(main.indexOf("import './styles/library.css'")).toBeGreaterThan(screens);
    expect(main.indexOf("import './styles/press.css'")).toBeGreaterThan(main.indexOf("import './styles/library.css'"));
  });

  it('only uses tokens that tokens.css or library.css define', () => {
    const known = new Set([...defined(tokens), ...defined(library), ...defined(press)]);
    const used = [...`${library}${press}`.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]);
    expect(used.filter(t => !known.has(t))).toEqual([]);
  });

  it('defines every themed token for both light and dark', () => {
    const light = defined(block(':root'));
    const dark = defined(block('.dark'));
    expect(THEMED.filter(t => !light.has(t))).toEqual([]);
    expect(THEMED.filter(t => !dark.has(t))).toEqual([]);
  });

  it('keeps raw colors in tokens.css only', () => {
    expect(`${library}${press}`.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/gi)).toBeNull();
  });

  it('pins hover to the resting look and animates taps instead', () => {
    expect(press).toMatch(/\.react-cupertino-ui-card\[data-interactive="true"\]:hover\s*\{[^}]*transform:\s*none/);
    expect(press).toMatch(/\.react-cupertino-ui-list-item\.clickable:hover:not\(\.disabled\)[^{]*\{[^}]*background-color:\s*transparent/);
    expect(press).toMatch(/variant-solid:hover[^{]*\{[^}]*filter:\s*none/);
    expect(press).toMatch(/\.hm-stat:active[^{]*\{[^}]*transform:\s*scale\(var\(--press-scale\)\)/);
    expect(press).toMatch(/\.react-cupertino-ui-card\[data-interactive="true"\]:active\s*\{[^}]*transform:\s*scale/);
    expect(press).toMatch(/\.link:active[^{]*\{[^}]*opacity:\s*var\(--press-dim\)/);
  });

  it('keeps outline buttons as pills and draws the tab underline under the active tab', () => {
    expect(library).toMatch(/\.react-cupertino-ui-button\.variant-outline\s*\{[^}]*border-radius:\s*999px/);
    expect(library).toMatch(/variant-underline \.react-cupertino-ui-tabs__indicator\s*\{[^}]*display:\s*none/);
    expect(library).toMatch(/\.seg \.react-cupertino-ui-segmented-control__indicator\s*\{[^}]*var\(--seg-i\)/);
  });

  it('stops avatars from shrinking into ovals', () => {
    expect(library).toMatch(/\.react-cupertino-ui-avatar\s*\{[^}]*flex:\s*none/);
    expect(library).toMatch(/\.react-cupertino-ui-list-item-icon\s*\{[^}]*width:\s*auto/);
  });
});
