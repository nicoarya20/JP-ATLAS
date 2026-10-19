// Tasks list: New task only on the tab bar "+", cards only open the task (its actions live in the detail),
// filters and sort live in one full-height overlay opened from the icon next to the search field (tasks.filter.test).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

  it.each(['member', 'pm'])('gives %s cards no action buttons; the card opens the detail with the actions', role => {
    renderApp('tasks.my', role);
    for (const name of ['Start working', 'Request review', 'Review', 'View']) expect(count(name)).toBe(0);
    const t = D.tasks.find(x => x.who === D.me().name);
    fireEvent.click(dom.getByText(t.title));
    expect(window.location.hash).toMatch(/^#tasks\.detail-/);
  });

  it('keeps Start working in the task detail', () => {
    renderApp('tasks.my', 'pm');
    const t = D.tasks.find(x => x.who === D.me().name && x.status === 'To do' && !blocked(x));
    fireEvent.click(dom.getByText(t.title));
    expect(window.location.hash).toBe('#tasks.detail-todo');
    expect(dom.getByRole('button', { name: 'Start working' })).toBeInTheDocument();
  });

  it('has no status chips or Filter / Sort pills on the list, only the filter icon beside the search field', () => {
    renderApp('tasks.my', 'member');
    expect(dom.queryByRole('button', { name: 'All active' })).not.toBeInTheDocument();
    expect(dom.queryByRole('button', { name: /^Filter$/ })).not.toBeInTheDocument();
    expect(dom.queryByRole('button', { name: /Sort: Due/ })).not.toBeInTheDocument();
    const icon = dom.getByRole('button', { name: 'Filter and sort' });
    expect(icon.closest('.tk-search').querySelector('input')).toHaveAttribute('placeholder', 'Search title, #number, or tag…');
    expect(icon).not.toHaveClass('is-on');
    expect(dom.queryByText(/Sort: Due date/)).not.toBeInTheDocument();
  });

  it('puts the List / Kanban view on the same row as My / All', () => {
    renderApp('tasks.my', 'member');
    const row = dom.getByRole('tab', { name: 'My tasks' }).closest('.tk-switch');
    expect(within(row).getByRole('tab', { name: 'Kanban' })).toBeInTheDocument();
  });

  it('shows List / Kanban as icons and keeps their names for screen readers', () => {
    renderApp('tasks.my', 'member');
    for (const name of ['List', 'Kanban']) {
      const tab = dom.getByRole('tab', { name });
      expect(tab.closest('.seg')).toHaveClass('seg-icons');
      expect(tab.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
    expect(dom.getByRole('tab', { name: 'My tasks' }).closest('.seg')).not.toHaveClass('seg-icons');
    fireEvent.click(dom.getByRole('tab', { name: 'Kanban' }));
    expect(window.location.hash).toBe('#tasks.board');
  });

  it('has no Download / Import CSV buttons on All tasks', () => {
    renderApp('tasks.all', 'pm');
    expect(dom.queryByRole('button', { name: /CSV/ })).not.toBeInTheDocument();
  });

  it('keeps My / All when switching to Kanban and keeps Kanban when switching My / All', () => {
    renderApp('tasks.my', 'member');
    const selected = name => dom.getByRole('tab', { name }).getAttribute('aria-selected');
    const cards = () => document.querySelectorAll('.tk-col .tk-kcard').length;
    const mine = D.tasks.filter(t => t.who === D.me().name);

    fireEvent.click(dom.getByRole('tab', { name: 'Kanban' }));
    expect(window.location.hash).toBe('#tasks.board');
    expect(selected('My tasks')).toBe('true');
    expect(cards()).toBe(mine.length);
    expect(dom.getAllByText(new RegExp(`#${mine[0].no} · ${mine[0].project}`)).length).toBeGreaterThan(0);

    fireEvent.click(dom.getByRole('tab', { name: 'All tasks' }));
    expect(window.location.hash).toBe('#tasks.board');
    expect(selected('Kanban')).toBe('true');
    expect(cards()).toBe(D.tasks.filter(t => t.project === D.project('atlas').name).length);

    fireEvent.click(dom.getByRole('tab', { name: 'My tasks' }));
    expect(window.location.hash).toBe('#tasks.board');
    expect(cards()).toBe(mine.length);

    fireEvent.click(dom.getByRole('tab', { name: 'List' }));
    expect(window.location.hash).toBe('#tasks.my');
  });

  it('shows Kanban cards without action buttons; the task actions live in the detail', () => {
    renderApp('tasks.board', 'pm');
    for (const name of ['Start working', 'Request review', 'Review']) {
      expect(dom.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    fireEvent.click(dom.getByRole('button', { name: '#14 Write the API spec' }));
    expect(window.location.hash).toBe('#tasks.detail-todo');
    expect(dom.getByRole('button', { name: 'Start working' })).toBeInTheDocument();
  });

  it('gives each Kanban column a status badge, count and Add task, and marks late and blocked cards', () => {
    renderApp('tasks.board', 'pm');
    const col = name => within(dom.getByRole('region', { name: new RegExp(`^${name}, `) }));
    for (const s of ['To do', 'In progress', 'In review', 'Done']) {
      expect(col(s).getByRole('heading', { level: 3 })).toHaveTextContent(s);
      expect(col(s).getByRole('button', { name: 'Add task' })).toBeInTheDocument();
    }
    expect(dom.getByRole('region', { name: 'To do, 3 tasks' })).toBeInTheDocument();
    const sso = within(dom.getByRole('button', { name: '#12 Fix SSO login' }));
    expect(sso.getByText('Oct 5').closest('.tk-chip')).toHaveClass('danger');      // 2 days overdue
    expect(sso.getByText('2/3')).toBeInTheDocument();                              // checklist steps
    expect(within(dom.getByRole('button', { name: '#16 Prepare test data' })).getByText('Blocked #12')).toBeInTheDocument();
    fireEvent.click(col('Done').getByRole('button', { name: 'Add task' }));
    expect(window.location.hash).toBe('#tasks.form');
  });

  it('lets the Kanban board scroll freely, without a snap that pulls it back to the first column', () => {
    const css = readFileSync(join(__dirname, '../screens/tasks/tasks.css'), 'utf8');
    expect(css).not.toMatch(/scroll-snap-(type|align)/);
  });

  it('draws the filter icon as a grey rounded square like the search field, whose corners all match', () => {
    const css = readFileSync(join(__dirname, '../screens/tasks/tasks.css'), 'utf8');
    const rule = css.match(/\.tk-filter-btn \{[^}]*\}/)[0];
    expect(rule).toMatch(/border-radius: 10px/);
    expect(rule).toMatch(/color: var\(--label-2\)/);
    const lib = readFileSync(join(__dirname, '../styles/library.css'), 'utf8');
    expect(lib).toMatch(/search-bar:not\(\.is-focused\) \.react-cupertino-ui-search-bar__cancel \{ display: none; \}/);
  });

  it('draws Kanban tasks as raised cards inside the column card', () => {
    const css = readFileSync(join(__dirname, '../screens/tasks/tasks.css'), 'utf8');
    expect(css.match(/\.tk-col \{[^}]*\}/)[0]).toMatch(/background: var\(--fill\)/);
    expect(css.match(/\.tk-kcard\.card[^{]*\{[^}]*\}/)[0]).toMatch(/background: var\(--surface-raised\)/);
  });

  it('says No tasks in an empty Kanban column', () => {
    renderApp('tasks.board', 'member');
    fireEvent.click(dom.getByRole('tab', { name: 'My tasks' }));
    const empty = D.tasks.filter(t => t.who === D.me().name);
    const none = ['To do', 'In progress', 'In review', 'Done'].filter(s => !empty.some(t => t.status === s));
    expect(none.length).toBeGreaterThan(0);
    expect(within(dom.getByRole('region', { name: `${none[0]}, 0 tasks` })).getByText('No tasks')).toBeInTheDocument();
  });

  it('opens Kanban from All tasks with All still picked', () => {
    renderApp('tasks.all', 'pm');
    fireEvent.click(dom.getByRole('tab', { name: 'Kanban' }));
    expect(window.location.hash).toBe('#tasks.board');
    expect(dom.getByRole('tab', { name: 'All tasks' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(dom.getByRole('tab', { name: 'List' }));
    expect(window.location.hash).toBe('#tasks.all');
  });
});
