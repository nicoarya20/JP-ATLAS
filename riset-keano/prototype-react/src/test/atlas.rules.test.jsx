// JP Atlas colour rules on every rendered screen and sheet: at most one lime (primary) button per view, and every
// status pill in its Atlas status pair (kit/status.js).
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import '../screens';
import { allowed, getSheet, ids } from '../core/registry';
import { AppProvider } from '../core/app.context';
import { ROLES, setRole } from '../core/session';
import { statusTone } from '../kit';
import { renderApp } from './render';

function mount(id, role) {
  const sheetDef = getSheet(id);
  if (!sheetDef) return renderApp(id, role).container;
  setRole(role);
  return render(<AppProvider start="home.main"><sheetDef.Component params={{}} /></AppProvider>).container;
}

const toneOf = badge => [...badge.classList].find(c => c.startsWith('tone-'))?.slice(5);

describe.each(Object.keys(ROLES))('as %s', role => {
  const open = ids().filter(id => allowed(id, role));
  it.each(open)('%s keeps one lime action and Atlas status pills', id => {
    const root = mount(id, role);
    const lime = [...root.querySelectorAll('.react-cupertino-ui-button.variant-solid')].map(b => b.textContent.trim());
    expect(lime.length, `lime buttons: ${lime.join(' | ')}`).toBeLessThanOrEqual(1);
    const wrong = [...root.querySelectorAll('.react-cupertino-ui-badge')]
      .map(b => ({ text: b.textContent.trim(), tone: toneOf(b), want: statusTone(b.textContent) }))
      .filter(b => b.want !== 'neutral' && b.tone !== b.want);
    expect(wrong).toEqual([]);
  });
});

describe('statusTone', () => {
  it.each([
    ['In progress', 'info'], ['Active', 'info'], ['On hold', 'warning'], ['Draft', 'neutral'], ['Done', 'success'],
    ['! Needs attention', 'warning'], ['✓ On track', 'success'], ['Overdue', 'danger'], ['Extended ×1', 'warning'],
    ['Confirmed · 3 (2 done)', 'success'], ['Review', 'neutral'], ['Bug', 'neutral'], ['Doneness', 'neutral'],
  ])('%s → %s', (label, tone) => expect(statusTone(label)).toBe(tone));
});
