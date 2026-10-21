// Project detail ⑨ Tasks: List / Kanban swaps the view inside the project (header and tabs stay) instead of opening
// the global ③ Kanban, and the Kanban view survives opening a task and coming back. Search and Filter & sort are the
// Tasks menu's, with Assignee in place of the (fixed) Project field.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const tab = name => dom.getByRole('tab', { name });
const col = status => dom.getByRole('region', { name: new RegExp(`^${status}, `) });
const atlasTasks = () => D.tasks.filter(t => t.project === D.project('atlas').name);
const atlasActive = () => atlasTasks().filter(t => t.status !== 'Done');
const icon = () => dom.getByRole('button', { name: 'Filter and sort' });
const openFilter = () => { fireEvent.click(icon()); return within(dom.getByRole('dialog')); };
const apply = sheet => fireEvent.click(sheet.getByRole('button', { name: 'Apply' }));
const shown = t => !!dom.queryByText(t.title);
const press = (el, type, dx = 0) =>
  fireEvent[type](el, { pointerId: 1, button: 0, isPrimary: true, pointerType: 'touch', clientX: 150 + dx, clientY: 300 });

beforeEach(() => { window.location.hash = ''; });
afterEach(() => { vi.useRealTimers(); act(resetTasks); });

describe('project detail Tasks · List / Kanban', () => {
  it('shows the Kanban inside the project, keeping its header and tabs', () => {
    renderApp('projects.tasks', 'pm');
    fireEvent.click(tab('Kanban'));
    expect(window.location.hash).toBe('#projects.tasks');
    expect(dom.getByText(D.project('atlas').name)).toBeInTheDocument();
    expect(tab('Overview')).toBeInTheDocument();
    expect(dom.getByRole('tab', { name: 'Tasks', selected: true })).toBeInTheDocument();   // the project tab, not the tab bar's
    expect(tab('Kanban')).toHaveAttribute('aria-selected', 'true');
    expect(dom.queryByRole('tab', { name: 'All tasks' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.tk-col .tk-kcard')).toHaveLength(atlasTasks().length);
    expect(within(col('To do')).getByRole('button', { name: '#14 Write the API spec' })).toBeInTheDocument();
    expect(dom.queryByRole('button', { name: 'Request review' })).not.toBeInTheDocument();
  });

  it('goes back to the task cards on List', () => {
    renderApp('projects.tasks', 'pm');
    fireEvent.click(tab('Kanban'));
    fireEvent.click(tab('List'));
    expect(document.querySelector('.tk-board')).toBeNull();
    expect(dom.getByRole('button', { name: 'Request review' })).toBeInTheDocument();
    expect(dom.getByText(`${atlasActive().length} tasks`)).toBeInTheDocument();
  });

  it('keeps the Kanban view after opening a task and going back', () => {
    renderApp('projects.tasks', 'pm');
    fireEvent.click(tab('Kanban'));
    fireEvent.click(dom.getByRole('button', { name: '#14 Write the API spec' }));
    expect(window.location.hash).toBe('#tasks.detail-todo');
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    expect(window.location.hash).toBe('#projects.tasks');
    expect(tab('Kanban')).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('.tk-board')).not.toBeNull();
  });

  it('moves a card with the hold menu, as on the Tasks Kanban', () => {
    vi.useFakeTimers();
    renderApp('projects.tasks', 'pm');
    fireEvent.click(tab('Kanban'));
    const card = dom.getByRole('button', { name: '#14 Write the API spec' }), board = card.closest('.tk-board');
    press(card, 'pointerDown');
    act(() => vi.advanceTimersByTime(400));   // test-only: past the 350ms hold
    press(board, 'pointerMove', 60);
    press(board, 'pointerUp', 60);
    fireEvent.click(card);
    expect(D.task(14).status).toBe('In progress');
    expect(within(col('In progress')).getByRole('button', { name: /^#14 / })).toBeInTheDocument();
  });
});

describe('project detail Tasks · Filter & sort', () => {
  it('has the search field and filter icon instead of the quick chips', () => {
    renderApp('projects.tasks', 'pm');
    expect(dom.getByPlaceholderText('Search title, #number, or tag…')).toBeInTheDocument();
    expect(icon()).not.toHaveClass('is-on');
    for (const c of ['My tasks', 'Overdue', 'Awaiting review']) expect(dom.queryByRole('button', { name: c })).not.toBeInTheDocument();
  });

  it('opens the Tasks overlay with Assignee in place of Project, and hides Done like the Tasks lists', () => {
    renderApp('projects.tasks', 'pm');
    expect(atlasActive().every(shown)).toBe(true);
    expect(atlasTasks().filter(t => t.status === 'Done').some(shown)).toBe(false);
    const sheet = openFilter();
    expect(sheet.queryByRole('combobox', { name: 'Project' })).not.toBeInTheDocument();
    expect(sheet.getByRole('button', { name: 'Anyone' })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByRole('button', { name: 'Me' })).toBeInTheDocument();
    expect(sheet.getByRole('button', { name: 'In review' })).toBeInTheDocument();
  });

  it('narrows to my tasks with Assignee · Me and shows the dot', () => {
    renderApp('projects.tasks', 'member');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'Me' }));
    apply(sheet);
    const mine = atlasActive().filter(t => t.who === D.me().name);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every(shown)).toBe(true);
    expect(atlasActive().filter(t => t.who !== D.me().name).some(shown)).toBe(false);
    expect(icon()).toHaveClass('is-on');
    expect(window.location.hash).toBe('#projects.tasks');
  });

  it('keeps the query across List / Kanban', () => {
    renderApp('projects.tasks', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'In review' }));
    apply(sheet);
    expect(dom.getByText('1 task')).toBeInTheDocument();
    fireEvent.click(tab('Kanban'));
    expect(document.querySelectorAll('.tk-col .tk-kcard')).toHaveLength(1);
    expect(icon()).toHaveClass('is-on');
    fireEvent.click(tab('List'));
    expect(dom.getByText('1 task')).toBeInTheDocument();
  });

  it('offers Reset filters when nothing matches', () => {
    renderApp('projects.tasks', 'pm');
    const sheet = openFilter();
    fireEvent.click(sheet.getByRole('button', { name: 'In review' }));
    fireEvent.click(sheet.getByRole('button', { name: 'Low' }));
    apply(sheet);
    expect(dom.getByText('No tasks match these filters.')).toBeInTheDocument();
    fireEvent.click(dom.getByRole('button', { name: 'Reset filters' }));
    expect(atlasActive().every(shown)).toBe(true);
    expect(icon()).not.toHaveClass('is-on');
  });
});

describe('project detail Tasks · sticky tools', () => {
  it('keeps search, List / Kanban and New task in one bar that sticks while the list scrolls', () => {
    renderApp('projects.tasks', 'pm');
    const tools = document.querySelector('.pj-tools');
    expect(within(tools).getByPlaceholderText('Search title, #number, or tag…')).toBeInTheDocument();
    expect(within(tools).getByRole('tab', { name: 'Kanban' })).toBeInTheDocument();
    expect(within(tools).getByRole('button', { name: '+ New task' })).toBeInTheDocument();
    expect(tools.querySelector('.react-cupertino-ui-card, .card')).toBeNull();   // the task cards scroll under it
    const css = readFileSync(join(__dirname, '../screens/projects/projects.css'), 'utf8');
    const rule = css.match(/\.pj-tools \{[^}]*\}/)[0];
    expect(rule).toMatch(/position: sticky/);
    expect(rule).toMatch(/background: var\(--bg\)/);
  });
});
