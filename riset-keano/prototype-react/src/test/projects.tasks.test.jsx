// Project detail ⑨ Tasks: List / Kanban swaps the view inside the project (header and tabs stay) instead of opening
// the global ③ Kanban, and the Kanban view survives opening a task and coming back.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const tab = name => dom.getByRole('tab', { name });
const col = status => dom.getByRole('region', { name: new RegExp(`^${status}, `) });
const atlasTasks = () => D.tasks.filter(t => t.project === D.project('atlas').name);
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
    expect(dom.getByText(`${atlasTasks().length} tasks`)).toBeInTheDocument();
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
