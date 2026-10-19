// Tasks list: New task only on the tab bar "+", cards offer a real next action (never a bare View),
// filters and sort live in one sheet opened from the icon next to the search field.
import { describe, expect, it } from 'vitest';
import { fireEvent, screen as dom, within } from '@testing-library/react';
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

  it('has no status chips or Filter / Sort pills on the list, only the filter icon beside the search field', () => {
    renderApp('tasks.my', 'member');
    expect(dom.queryByRole('button', { name: 'All active' })).not.toBeInTheDocument();
    expect(dom.queryByRole('button', { name: /^Filter$/ })).not.toBeInTheDocument();
    expect(dom.queryByRole('button', { name: /Sort: Due/ })).not.toBeInTheDocument();
    const icon = dom.getByRole('button', { name: 'Filter and sort' });
    expect(icon.closest('.tk-search').querySelector('input')).toHaveAttribute('placeholder', 'Search title, #number, or tag…');
    expect(icon).not.toHaveClass('is-on');
  });

  it('opens one sheet with the status, project and priority filters and the sort order', () => {
    renderApp('tasks.my', 'member');
    fireEvent.click(dom.getByRole('button', { name: 'Filter and sort' }));
    const sheet = within(dom.getByRole('dialog'));
    expect(sheet.getByRole('heading', { name: 'Filter & sort' })).toBeInTheDocument();
    for (const s of ['All active', 'To do', 'In progress', 'In review', 'Done']) expect(sheet.getByRole('button', { name: s })).toBeInTheDocument();
    expect(sheet.getByRole('button', { name: 'All active' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('button', { name: 'All projects' })).toBeInTheDocument();
    expect(sheet.getByRole('button', { name: 'High' })).toBeInTheDocument();
    expect(sheet.getByRole('radio', { name: 'Due date' })).toBeChecked();
    expect(sheet.getAllByRole('radio')).toHaveLength(4);
  });

  it('closes on Apply with a confirmation', () => {
    renderApp('tasks.my', 'member');
    fireEvent.click(dom.getByRole('button', { name: 'Filter and sort' }));
    fireEvent.click(within(dom.getByRole('dialog')).getByRole('button', { name: 'Apply' }));
    expect(dom.queryByRole('heading', { name: 'Filter & sort' })).not.toBeInTheDocument();
    expect(dom.getByText('Filter applied')).toBeInTheDocument();
  });

  it('scopes All tasks to Atlas inside the sheet (dot on the icon) instead of a pill on the list', () => {
    renderApp('tasks.all', 'pm');
    expect(dom.queryByText(/^Project:/)).not.toBeInTheDocument();
    const icon = dom.getByRole('button', { name: 'Filter and sort' });
    expect(icon).toHaveClass('is-on');
    fireEvent.click(icon);
    expect(within(dom.getByRole('dialog')).getByRole('button', { name: D.project('atlas').name })).toBeInTheDocument();
  });
});
