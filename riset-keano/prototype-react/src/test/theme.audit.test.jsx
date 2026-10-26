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

describe('presence dot', () => {
  // User 2026-10-22: Atlas success (#0c6847) read too dark as the light-theme online dot.
  it('fills the online dot with --presence: the iOS green in light, Atlas success in dark', () => {
    const css = read('screens/profile/profile.css');
    expect(rule(css, '.pf-dot.is-on')).toContain('background: var(--presence)');
    expect(rule(css, '.pf-dot.pf-dot-sm.is-on')).toContain('background: var(--presence)');
    const tokens = read('styles/tokens.css');
    expect(tokens).toMatch(/:root[^]*?--presence: var\(--color-green\)/);
    expect(rule(tokens, '.dark')).toContain('--presence: var(--atlas-success)');
  });
});

describe('icon tiles', () => {
  // User's pick 2026-10-22: the Atlas status tints faded into the grey glass panel, so the menu tiles keep the
  // solid iOS hues with a white glyph (the pre-audit look).
  const TILES = [
    ['screens/home/home.css', '.mm-tile', ['blue', 'green', 'orange', 'teal', 'gray']],
    ['screens/home/home.css', '.hm-tile', ['blue', 'green', 'orange', 'gray']],
    ['screens/profile/profile.css', '.pf-tile', ['blue', 'red', 'indigo', 'gray']],
  ];

  it.each(TILES)('%s %s fills each tone solid under a white glyph', (file, sel, tones) => {
    const css = read(file);
    expect(rule(css, sel)).toContain('color: var(--color-white)');
    for (const t of tones) expect(css).toMatch(new RegExp(`\\${sel}\\.${t} \\{ background: var\\(--`));
  });

  it('gives every tile in the More panel a solid tone', () => {
    renderApp('home.main', 'admin');
    fireEvent.click(dom.getByRole('tab', { name: 'More' }));
    const tiles = [...document.querySelectorAll('.mm-tile')];
    expect(tiles.length).toBeGreaterThan(2);
    for (const t of tiles) expect(['blue', 'green', 'orange', 'teal', 'gray'].some(c => t.classList.contains(c))).toBe(true);
  });
});

describe('panels drawn in --fill', () => {
  // A progress track or chip in --fill vanished into a --fill panel (Ask Data answer, AI draft ambiguity chips).
  const PANELS = [
    ['screens/home/home.css', '.hm-answer'], ['screens/events/events.css', '.ev-box'],
    ['screens/archive/archive.css', '.ar-note.card.react-cupertino-ui-card'],
    ['screens/projects/projects.css', '.pj-soft.card.react-cupertino-ui-card'],
    ['screens/tasks/tasks.css', '.tk-soft.card.react-cupertino-ui-card'],
    ['screens/users/users.css', '.us-box.card.react-cupertino-ui-card'],
  ];

  it.each(PANELS)('%s %s steps the --fill of what it holds up to the surface', (file, sel) => {
    const css = read(file);
    expect(rule(css, sel)).toMatch(/background:\s*var\(--fill\)/);
    expect(rule(css, `${sel} > *`)).toMatch(/--fill:\s*var\(--surface-raised\)/);
  });

  it('lifts tinted buttons in the event Minutes box onto the surface', () => {
    const sel = '.ev-box .react-cupertino-ui-button.variant-outline';
    expect(rule(read('screens/events/events.css'), `${sel},\n${sel}:hover`)).toMatch(/background:\s*var\(--surface-raised\)/);
  });

  it('keeps the Ask Data bars inside the .hm-answer panel the remap targets', () => {
    renderApp('home.main', 'pm');
    const tracks = document.querySelectorAll('.hm-answer .react-cupertino-ui-progressbar__track');
    expect(tracks.length).toBeGreaterThan(0);
  });

  it('draws the My Focus cards as --fill panels without a line, inside the section card', () => {
    const css = read('screens/home/home.css');
    const list = '.hm-cards.rows.react-cupertino-ui-list';
    const item = `${list} .react-cupertino-ui-list-item`;
    expect(rule(css, `${item}:last-child`)).toMatch(/background:\s*var\(--fill\)/);
    expect(rule(css, `${item}:last-child`)).not.toMatch(/box-shadow|border:/);
    expect(rule(css, `${item} > *`)).toMatch(/--fill:\s*var\(--surface-raised\)/);
    // A grid list sized its auto track to the nowrap title and pushed long rows past the card; keep the library's flex column.
    expect(rule(css, list)).not.toMatch(/display:\s*grid/);
  });
});
