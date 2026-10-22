// Fixes from the 2026-10-22 light/dark colour audit: controls stay visible and text stays readable in both themes.
// Radios and checkboxes must use the themed solid ring, bottom-sheet titles are not faded, placeholders read as text.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import '../screens';
import { allowed, getSheet, ids } from '../core/registry';
import { AppProvider } from '../core/app.context';
import { setRole } from '../core/session';
import { readLibrary } from './library.source';
import { renderApp } from './render';

const read = f => readFileSync(join(__dirname, '..', f), 'utf8');
const library = readLibrary();
const app = read('styles/app.css');
const focus = read('styles/focus.css');
const allCss = readdirSync(join(__dirname, '..'), { recursive: true })
  .filter(f => f.endsWith('.css') && !f.startsWith('node_modules')).map(read).join('\n');
const rule = (css, sel) => css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

function mount(id, role) {
  const sheetDef = getSheet(id);
  if (!sheetDef) return renderApp(id, role).container;
  setRole(role);
  return render(<AppProvider start="home.main"><sheetDef.Component params={{}} /></AppProvider>).container;
}

describe('radios and checkboxes', () => {
  // Only the solid variant gets the themed ring (library.css); glass left an unpicked radio invisible in light and
  // a filled grey disc that looked picked in dark.
  it.each(ids().filter(id => allowed(id, 'admin')))('%s draws every radio and checkbox as a solid ring', id => {
    const root = mount(id, 'admin');
    const glass = [...root.querySelectorAll('.react-cupertino-ui-radio, .react-cupertino-ui-checkbox')]
      .filter(c => !c.classList.contains('variant-solid')).map(c => c.textContent.trim());
    expect(glass).toEqual([]);
  });

  it('keeps the checkbox ring the full control size (no upstream padding squeezing it to 7px)', () => {
    expect(rule(library, '.react-cupertino-ui-checkbox__control')).toMatch(/padding:\s*0/);
  });

  it('keeps both rings round beside a two-line label', () => {
    const body = rule(library, '.react-cupertino-ui-checkbox__control, .react-cupertino-ui-radio__control');
    expect(body).toMatch(/flex:\s*none/);
    expect(body).toMatch(/align-self:\s*center/);
  });
});

describe('readable text', () => {
  it('sizes a bottom sheet to its content, capped under the top gap, so its buttons are never below the fold', () => {
    const body = rule(library, '.react-cupertino-ui-bottom-sheet__content');
    expect(body).toMatch(/height:\s*auto/);
    expect(body).toMatch(/max-height:\s*calc\(100% - 52px\)/);
  });

  it('does not fade the top of a bottom sheet, where its title sits', () => {
    expect(rule(library, '.react-cupertino-ui-bottom-sheet__body')).toMatch(/mask-image:\s*none/);
  });

  it('colours every placeholder Atlas muted, never the 3:1 control grey or the browser default', () => {
    expect(rule(library, '.react-cupertino-ui-textfield__input::placeholder')).toContain('var(--label-2)');
    expect(rule(app, 'input::placeholder, textarea::placeholder')).toContain('var(--label-2)');
    expect(allCss).not.toMatch(/::placeholder[^{]*\{[^}]*--label-3/);
  });
});

describe('keyboard focus ring', () => {
  const RING = /outline:\s*2px solid var\(--focus\)/;

  it('loads focus.css last in the phone entry, so it sits over the library and press layers', () => {
    const main = read('main.jsx');
    expect(main.indexOf("import './styles/focus.css'")).toBeGreaterThan(main.indexOf("import './styles/press.css'"));
  });

  it('draws one Atlas --focus ring and no raw colours', () => {
    expect(rule(focus, ':focus-visible')).toMatch(RING);
    expect(focus.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });

  it.each([
    '.react-cupertino-ui-button:focus-visible', '.react-cupertino-ui-suggestion-chip:focus-visible',
    '.react-cupertino-ui-segmented-control__option:focus-visible', '.react-cupertino-ui-navigation-bar .nav-back:focus-visible',
    '.react-cupertino-ui-bottom-sheet__handle:focus-visible', '.react-cupertino-ui-card:focus-visible',
    '.react-cupertino-ui-switcher__control:focus-visible', '.react-cupertino-ui-tabs__trigger:focus-visible',
    '.react-cupertino-ui-list-item.clickable:focus-visible',
  ])('replaces the library iOS-blue halo on %s', sel => {
    const body = focus.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^{]*\\{([^}]*)\\}`))?.[1] ?? '';
    expect(body).toMatch(RING);
    expect(body).toMatch(/box-shadow:\s*none/);
  });

  it.each([
    '.react-cupertino-ui-suggestion-chip:focus-visible', '.react-cupertino-ui-segmented-control__option:focus-visible',
    '.react-cupertino-ui-search-bar__input-wrapper:focus-within', '.react-cupertino-ui-tabs__trigger:focus-visible',
  ])('draws the ring inside %s, whose strip clips anything outside', sel => {
    const body = focus.slice(focus.indexOf(sel)).match(/\{([^}]*)\}/)[1];
    expect(body).toMatch(/outline-offset:\s*-2px/);
  });

  it.each(['.react-cupertino-ui-textfield:focus-within', '.react-cupertino-ui-search-bar__input-wrapper:focus-within',
    '.tk-tagbox:focus-within', 'checkbox__input:focus-visible', 'radio__input:focus-visible'])('rings %s', sel => {
    const body = focus.slice(focus.indexOf(sel)).match(/\{([^}]*)\}/)[1];
    expect(body).toMatch(RING);
  });
});

describe('destructive colour', () => {
  // --danger-fill (high-contrast red in light, Atlas pink in dark) instead of iOS red + white, which failed AA in both themes
  it.each([
    ['styles/library.buttons.css', '.react-cupertino-ui-button.variant-destructive'],
    ['screens/home/home.css', '.mm-badge'],
    ['screens/profile/profile.css', '.pf-count'],
  ])('%s %s fills with --danger-fill and labels with --on-accent', (file, sel) => {
    const body = rule(read(file), sel);
    expect(body).toMatch(/background:\s*var\(--danger-fill\)/);
    expect(body).toMatch(/[^-]color:\s*var\(--on-accent\)/);
    expect(body).not.toContain('--color-red');
  });
});
