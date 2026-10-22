// Medium fixes from the 2026-10-22 colour audit: destructive text buttons in danger, no violet glyph on lime, a
// greyed-out disabled primary, and the profile calendar's today in the accent instead of danger.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen as dom } from '@testing-library/react';
import '../screens';
import { Btn } from '../kit';
import { AppProvider } from '../core/app.context';
import { renderApp } from './render';

const read = f => readFileSync(join(__dirname, '..', f), 'utf8');
const library = read('styles/library.css');
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
