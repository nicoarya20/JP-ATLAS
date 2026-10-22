// Medium fixes from the 2026-10-22 colour audit: destructive text buttons in danger, no violet glyph on lime, a
// greyed-out disabled primary, and the profile calendar's today in the accent instead of danger.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen as dom } from '@testing-library/react';
import '../screens';
import { Btn } from '../kit';
import { AppProvider } from '../core/app.context';
import { readLibrary } from './library.source';
import { renderApp } from './render';

const read = f => readFileSync(join(__dirname, '..', f), 'utf8');
const library = readLibrary();
const rule = (css, sel) => css.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

describe('destructive text buttons', () => {
  it('kind="danger-ghost" is a ghost button tagged btn-danger, which library.css colours --danger', () => {
    render(<AppProvider start="home.main"><Btn kind="danger-ghost" sm>Delete forever</Btn></AppProvider>);
    const b = dom.getByRole('button', { name: 'Delete forever' });
    expect(b).toHaveClass('variant-ghost', 'btn-danger');
    expect(rule(library, '.react-cupertino-ui-button.variant-ghost.btn-danger')).toMatch(/color:\s*var\(--danger\)/);
  });

  it.each([['users.roles', 'Deactivate'], ['archive.list', 'Delete forever']])('%s shows "%s" as danger, not violet', (id, label) => {
    renderApp(id, 'admin');
    for (const b of dom.getAllByRole('button', { name: label })) expect(b).toHaveClass('btn-danger');
  });
});

describe('primary (lime) button', () => {
  it('draws a .tint glyph in the navy label colour, not violet', () => {
    expect(rule(library, '.react-cupertino-ui-button.variant-solid .tint')).toMatch(/color:\s*inherit/);
  });

  it('greys a disabled primary out on --fill at full opacity instead of a half-transparent lime', () => {
    const body = rule(library, '.react-cupertino-ui-button.variant-solid:disabled');
    expect(body).toMatch(/background:\s*var\(--fill\)/);
    expect(body).toMatch(/color:\s*var\(--label-3\)/);
    expect(body).toMatch(/opacity:\s*1/);
  });
});

describe('profile calendar', () => {
  it('marks today and the now line in the accent; danger is for errors', () => {
    const css = read('screens/profile/profile.calendar.css').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).not.toContain('--danger');
    expect(rule(css, '.pf-cal-now')).toContain('var(--accent)');
    expect(rule(css, '.pf-cal-day.is-on.is-today .pf-cal-num')).toContain('var(--accent)');
  });
});

describe('icon tiles', () => {
  const app = read('styles/app.css');
  const TONES = { info: 'info', success: 'success', warning: 'warning', danger: 'danger' };
  const tones = root => [...root.querySelectorAll('.mm-tile, .hm-tile, .pf-tile')]
    .map(t => [...t.classList].find(c => c.startsWith('tile-')));

  it('fills each tone with its Atlas status pair, never an iOS hue', () => {
    for (const [tone, pair] of Object.entries(TONES)) {
      const body = rule(app, `.tile-${tone}`);
      expect(body).toContain(`background: var(--${pair}-bg)`);
      expect(body).toContain(`color: var(--${pair})`);
    }
    expect(rule(app, '.tile-neutral')).toContain('background: var(--tile-neutral)');
    for (const f of ['screens/home/home.css', 'screens/profile/profile.css']) expect(read(f)).not.toMatch(/--color-(?!white)/);
  });

  it.each([
    ['the More panel', 'home.main', () => fireEvent.click(dom.getByRole('tab', { name: 'More' }))],
    ['Create', 'home.main', () => fireEvent.click(document.querySelector('.glassbar-fab'))],
  ])('gives every tile in %s a tone', (_, start, open) => {
    renderApp(start, 'admin');
    open();
    const found = tones(document.body);
    expect(found.length).toBeGreaterThan(2);
    expect(found.filter(t => !['tile-info', 'tile-success', 'tile-warning', 'tile-danger', 'tile-neutral'].includes(t))).toEqual([]);
  });
});
