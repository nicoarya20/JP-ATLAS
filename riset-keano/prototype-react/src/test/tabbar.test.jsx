// Floating glass tab bar: icon tabs keep their names for screen readers, switch screens, and "+" opens quick create.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../screens';
import { TABS } from '../kit';
import { renderApp } from './render';

describe('glass tab bar', () => {
  it('names every icon tab and marks the active one', () => {
    renderApp('home.main', 'member');
    const tabs = dom.getAllByRole('tab');
    expect(tabs.map(t => t.textContent)).toEqual(TABS.map(t => t.label));
    expect(dom.getByRole('tab', { name: 'Home' })).toHaveAttribute('aria-selected', 'true');
  });

  it('switches screens from a tab', async () => {
    renderApp('home.main', 'member');
    await userEvent.click(dom.getByRole('tab', { name: 'Tasks' }));
    expect(dom.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens New task from the round create button', async () => {
    renderApp('home.main', 'member');
    await userEvent.click(dom.getByRole('button', { name: 'New task' }));
    expect(dom.queryByRole('tablist', { name: 'App navigation' })).not.toBeInTheDocument();
    expect(dom.getByRole('tab', { name: /Just write/ })).toHaveAttribute('aria-selected', 'true');
  });
});
