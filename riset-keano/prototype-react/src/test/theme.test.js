// Theme layer guards: atlas.css matches the JP Atlas tokens.json and loads first; library.css and press.css load last and
// use only defined tokens; every themed token must switch under .dark.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = join(__dirname, '..');
const read = f => readFileSync(join(src, f), 'utf8');
const tokens = read('styles/tokens.css');
const library = read('styles/library.css');
const press = read('styles/press.css');
const atlas = read('styles/atlas.css');
const atlasJson = JSON.parse(read('assets/atlas/tokens.json'));
const block = (sel, css = tokens) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
const defined = text => new Set([...text.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const values = text => Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
// Same in both themes (the logo field and the font), so atlas.css sets them in :root only.
const ATLAS_FIXED = ['--atlas-identity-surface', '--atlas-font'];

const THEMED = ['--bg', '--surface', '--surface-raised', '--fill', '--label', '--label-2', '--label-3', '--separator', '--accent',
  '--accent-soft', '--selected-text', '--primary-fill', '--on-primary', '--primary-border', '--focus',
  '--success', '--success-bg', '--warning', '--warning-bg', '--danger', '--danger-bg', '--info', '--info-bg',
  '--sheet-bg', '--sheet-surface', '--sheet-edge', '--overlay', '--avatar-bg', '--switch-off', '--seg-thumb',
  '--glass-bar', '--glass-bar-edge', '--glass-bar-shine', '--glass-bar-active', '--glass-bar-shadow',
  '--glass-bar-open', '--pop-bg', '--pop-edge', '--pop-ring', '--pop-tint'];
// A role switches with the theme if .dark redefines it or its :root value reads a --atlas-* token (which atlas.css switches).
const switches = (role, light, dark) => dark.has(role) || /var\(--atlas-(?!identity-surface|font)/.test(light[role] ?? '');

describe('JP Atlas palette', () => {
  it('copies every atlas.css value verbatim from tokens.json', () => {
    for (const [theme, sel] of [['light', ':root'], ['dark', '.dark']]) {
      const own = values(block(sel, atlas));
      const wrong = Object.entries(own).filter(([k]) => !ATLAS_FIXED.includes(k))
        .filter(([k, v]) => v !== atlasJson.themes[theme][k.replace('--atlas-', '')]);
      expect(wrong).toEqual([]);
    }
    const root = values(block(':root', atlas));
    expect(root['--atlas-identity-surface']).toBe(atlasJson.brand.identity_surface);
    expect(root['--atlas-font'].split(',')[0]).toBe(atlasJson.typography.family);
  });

  it('defines every themed atlas token in both :root and .dark', () => {
    const light = [...defined(block(':root', atlas))].filter(t => !ATLAS_FIXED.includes(t));
    const dark = defined(block('.dark', atlas));
    expect(light.filter(t => !dark.has(t))).toEqual([]);
    expect([...dark].filter(t => !light.includes(t))).toEqual([]);
  });

  it('is imported before tokens.css in both entries, so the app roles can read it', () => {
    for (const [f, prefix] of [['main.jsx', './styles/'], ['index/main.jsx', '../styles/']]) {
      const main = read(f);
      const at = main.indexOf(`import '${prefix}atlas.css'`);
      expect(at).toBeGreaterThan(-1);
      expect(main.indexOf(`import '${prefix}tokens.css'`)).toBeGreaterThan(at);
    }
  });
});

describe('theme layer', () => {
  it('is imported after the screens and the shell so it wins over the library scss', () => {
    const main = read('main.jsx');
    const screens = main.indexOf("import './screens'");
    const shell = main.indexOf("from './core/PhoneApp'");   // pulls in the bottom-sheet and toast scss
    expect(screens).toBeGreaterThan(-1);
    expect(shell).toBeGreaterThan(-1);
    expect(main.indexOf("import './styles/library.css'")).toBeGreaterThan(Math.max(screens, shell));
    expect(main.indexOf("import './styles/press.css'")).toBeGreaterThan(main.indexOf("import './styles/library.css'"));
  });

  it('only uses tokens that atlas.css, tokens.css or library.css define', () => {
    const known = new Set([...defined(atlas), ...defined(tokens), ...defined(library), ...defined(press)]);
    const used = [...`${library}${press}`.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]);
    expect(used.filter(t => !known.has(t))).toEqual([]);
  });

  it('defines every themed token for both light and dark', () => {
    const light = values(block(':root'));
    const dark = defined(block('.dark'));
    expect(THEMED.filter(t => !(t in light))).toEqual([]);
    expect(THEMED.filter(t => !switches(t, light, dark))).toEqual([]);
  });

  it('keeps raw colors in tokens.css and atlas.css only', () => {
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

  it('dims the nav bar with the rest of the screen and tints the glass denser while More is open', () => {
    const app = read('styles/app.css');
    const z = (css, sel) => Number(css.match(new RegExp(`${sel}\\s*\\{[^}]*z-index:\\s*(\\d+)`))[1]);
    expect(z(library, '\\.react-cupertino-ui-navigation-bar')).toBeLessThan(z(app, '\\.glassbar-scrim'));
    expect(library).toMatch(/\.glassbar-scrim\.is-open \+ \.glassbar[^{]*\{[^}]*var\(--glass-bar-open\)/);
  });

  it('animates the "+" both ways: only app.css sets its transition, with width in both states', () => {
    const app = read('styles/app.css');
    const rules = css => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m => ({ sel: m[1].trim(), body: m[2] }));
    const fabTransitions = css => rules(css).filter(r => /\.glassbar-fab\b/.test(r.sel) && !r.sel.includes('@media')
      && !/:active/.test(r.sel) && /transition:/.test(r.body));
    expect(fabTransitions(library)).toEqual([]);
    const own = fabTransitions(app).filter(r => !/reduce/.test(r.sel));
    expect(own.map(r => r.sel)).toEqual(['.glassbar-fab', '.glassbar-fab.is-hidden']);
    for (const r of own) expect(r.body).toMatch(/width 380ms/);
  });

  it('keeps the index page dark in both themes: black stage, Atlas-dark sidebar', () => {
    const index = read('index/index.css');
    expect(index).toMatch(/\.ix-stage \{[^}]*background: var\(--index-stage\)/);
    expect(index).toMatch(/\.ix-side \{[^}]*background: var\(--index-side-bg\)/);
    const used = [...index.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]);
    // only fixed --index-* colours; the app roles (--surface, --label…) switch with the phone's mode
    expect(used.filter(t => !t.startsWith('--index-') && !/^--(sp|fs|font|radius)/.test(t) && t !== '--phone-frame' && t !== '--bg'))
      .toEqual([]);
    const light = values(block(':root'));
    const dark = defined(block('.dark'));
    expect(light['--index-stage']).toBe('#000');
    for (const t of new Set(used.filter(u => u.startsWith('--index-')))) {
      expect(light[t], t).toBeDefined();
      expect(dark.has(t), t).toBe(false);
    }
  });

  it('stacks the bottom sheet over the tab bar and pinned rows, under the toast', () => {
    const z = sel => Number(library.match(new RegExp(`${sel.replaceAll('.', '\\.')} \\{[^}]*z-index: (\\d+)`))[1]);
    const appCss = read('styles/app.css');
    const tabBar = Number(appCss.match(/\.glassbar \{[^}]*z-index: (\d+)/)[1]);
    const overlay = z('.react-cupertino-ui-bottom-sheet__overlay');
    const content = z('.react-cupertino-ui-bottom-sheet__content');
    expect(overlay).toBeGreaterThan(tabBar);
    expect(content).toBeGreaterThan(overlay);
    expect(z('.app-toast.react-cupertino-ui-toast')).toBeGreaterThan(content);
  });

  it('places the toast under the status bar, centred, in the snackbar colours (upstream has no position rules)', () => {
    const rule = library.match(/\.app-toast\.react-cupertino-ui-toast \{[^}]*\}/)[0];
    for (const d of ['position: absolute', 'top: calc(var(--statusbar-h)', 'margin-inline: auto', 'width: fit-content',
      'background: var(--snack-bg)', 'color: var(--snack-label)']) expect(rule).toContain(d);
    expect(library).toMatch(/\.app-toast \.react-cupertino-ui-toast-close \{[^}]*background: none/);
  });
});
