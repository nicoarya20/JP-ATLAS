// Every registered screen and sheet renders for every role allowed to open it; ids match the prototype's id set.
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import '../screens';
import { allowed, getSheet, ids } from '../core/registry';
import { AppProvider } from '../core/app.context';
import { ROLES, setRole } from '../core/session';
import { renderApp } from './render';
import { EXPECTED_IDS } from './screens.ids';

const registered = ids();

describe('screen registry', () => {
  it('only uses ids from the prototype id set', () => {
    expect(registered.filter(id => !EXPECTED_IDS.includes(id))).toEqual([]);
  });
});

describe.each(Object.keys(ROLES))('as %s', role => {
  const open = registered.filter(id => allowed(id, role));
  it.each(open)('renders %s', id => {
    const sheetDef = getSheet(id);
    if (sheetDef) {
      // Sheets render their body directly: the Radix portal is covered by the router test.
      setRole(role);
      const { container } = render(<AppProvider start="home.main"><sheetDef.Component params={{}} /></AppProvider>);
      expect(container.textContent.trim()).not.toBe('');
      return;
    }
    const { container } = renderApp(id, role);
    expect(container.querySelector('.scr')).toBeInTheDocument();
    expect(container.textContent.trim()).not.toBe('');
  });
});
