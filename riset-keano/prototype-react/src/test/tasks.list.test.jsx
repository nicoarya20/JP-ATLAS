// Tasks list: New task only on the tab bar "+", cards offer a real next action (never a bare View), status chips bleed.
import { describe, expect, it } from 'vitest';
import { screen as dom } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { blocked } from '../screens/tasks/tasks.shared';
import { renderApp } from './render';

const count = name => dom.queryAllByRole('button', { name }).length;

describe('tasks list', () => {
  it('keeps New task on the tab bar only', () => {
    renderApp('tasks.my', 'member');
    expect(count('New task')).toBe(1);
    expect(dom.queryByRole('button', { name: /\+ New task/ })).not.toBeInTheDocument();
  });

  // Next action per card, worked out from the sample data for the active role.
  const expected = member => {
    const open = D.tasks.filter(t => t.who === D.me().name && t.status !== 'Done' && t.status !== 'In review' && !blocked(t));
    return {
      'Start working': open.filter(t => t.status === 'To do').length,
      'Request review': open.filter(t => t.status === 'In progress').length,
      Review: member ? 0 : D.tasks.filter(t => t.status === 'In review').length,
    };
  };

  it.each([['member', true], ['pm', false]])('gives %s cards an action only where there is something to do', (role, member) => {
    renderApp('tasks.my', role);
    const want = expected(member);
    expect(count('View')).toBe(0);
    for (const [name, n] of Object.entries(want)) expect(count(name)).toBe(n);
  });

  it('leaves Manager with real actions to take (guards the check above against empty data)', () => {
    renderApp('tasks.my', 'pm');
    expect(count('Start working')).toBeGreaterThan(0);
    expect(count('Request review')).toBeGreaterThan(0);
    expect(count('Review')).toBeGreaterThan(0);
  });

  it('runs the status chips edge to edge', () => {
    renderApp('tasks.my', 'member');
    expect(dom.getByRole('button', { name: 'All active' }).closest('.hscroll')).toHaveClass('bleed');
  });
});
