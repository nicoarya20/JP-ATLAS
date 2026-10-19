// Tasks ③ Kanban drag and drop: hold (touch) or drag (mouse) a card onto another column to change its status;
// a ghost follows the pointer, the target column is outlined, a swipe still scrolls and a tap still opens the task.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { moveTask, resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const STATUSES = ['To do', 'In progress', 'In review', 'Done'];
const COL_W = 272, GAP = 8;   // test-only: fake column layout, jsdom has none
const midX = status => STATUSES.indexOf(status) * (COL_W + GAP) + COL_W / 2;

const col = status => dom.getByRole('region', { name: new RegExp(`^${status}, `) });
const card = no => dom.getByRole('button', { name: new RegExp(`^#${no} `) });
const ghost = () => document.querySelector('.tk-ghost');

/** Give every column a box side by side so the hook can tell which one the pointer is over. */
function layout() {
  for (const s of STATUSES) {
    const left = STATUSES.indexOf(s) * (COL_W + GAP);
    col(s).getBoundingClientRect = () => ({ left, right: left + COL_W, top: 0, bottom: 600, width: COL_W, height: 600 });
  }
}

const press = (el, type, x, y = 100, pointerType = 'mouse') => fireEvent[type](el, { pointerId: 1, button: 0, isPrimary: true, pointerType, clientX: x, clientY: y });

/** Mouse drag of card #no to the middle of column `to`, then let go (and the click a real mouse sends after it). */
function mouseDrag(no, to) {
  const el = card(no), board = el.closest('.tk-board'), from = midX(D.task(no).status);
  press(el, 'pointerDown', from);
  press(board, 'pointerMove', from + 20);
  press(board, 'pointerMove', midX(to));
  press(board, 'pointerUp', midX(to));
  fireEvent.click(el);
}

/** A real tap: press, release, click on the same spot. */
function tap(el) {
  press(el, 'pointerDown', 10);
  press(el, 'pointerUp', 10);
  fireEvent.click(el);
}

beforeEach(() => { window.location.hash = ''; });
afterEach(() => { vi.useRealTimers(); act(resetTasks); });

describe('tasks kanban drag and drop', () => {
  it('moves a task to the column it is dropped on, says so, and does not open it', () => {
    renderApp('tasks.board', 'pm');
    layout();
    mouseDrag(14, 'In progress');
    expect(D.task(14).status).toBe('In progress');
    expect(within(col('In progress')).getByRole('button', { name: /^#14 / })).toBeInTheDocument();
    expect(within(col('To do')).queryByRole('button', { name: /^#14 / })).not.toBeInTheDocument();
    expect(dom.getByText('Moved to In progress')).toBeInTheDocument();
    expect(window.location.hash).toBe('#tasks.board');
  });

  it('shows a ghost under the pointer and outlines the target column while dragging, and cleans both up', () => {
    renderApp('tasks.board', 'pm');
    layout();
    const el = card(14), board = el.closest('.tk-board');
    press(el, 'pointerDown', midX('To do'));
    press(board, 'pointerMove', midX('To do') + 20);
    expect(ghost()).toHaveAttribute('aria-hidden', 'true');
    expect(ghost().closest('.phone-app')).not.toBeNull();
    expect(el).toHaveClass('is-lifted');
    expect(col('To do')).not.toHaveClass('is-over');       // its own column is not a target
    press(board, 'pointerMove', midX('In review'));
    expect(col('In review')).toHaveClass('is-over');
    press(board, 'pointerUp', midX('In review'));
    expect(ghost()).toBeNull();
    expect(document.querySelector('.is-over, .is-lifted')).toBeNull();
  });

  it('changes nothing when the card is let go over its own column', () => {
    renderApp('tasks.board', 'pm');
    layout();
    mouseDrag(14, 'To do');
    expect(D.task(14).status).toBe('To do');
    expect(dom.queryByText(/^Moved to/)).not.toBeInTheDocument();
  });

  it('puts the card back on Escape', () => {
    renderApp('tasks.board', 'pm');
    layout();
    const el = card(14), board = el.closest('.tk-board');
    press(el, 'pointerDown', midX('To do'));
    press(board, 'pointerMove', midX('Done'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(ghost()).toBeNull();
    press(board, 'pointerUp', midX('Done'));
    expect(D.task(14).status).toBe('To do');
  });

  it('lifts a card only after a touch holds still, so a swipe that starts on a card scrolls the board', () => {
    vi.useFakeTimers();
    renderApp('tasks.board', 'pm');
    layout();
    const el = card(14), board = el.closest('.tk-board');

    press(el, 'pointerDown', midX('To do'), 100, 'touch');
    press(board, 'pointerMove', midX('To do') - 40, 100, 'touch');   // swipe before the hold ends
    act(() => vi.advanceTimersByTime(500));
    expect(ghost()).toBeNull();
    press(board, 'pointerUp', midX('To do') - 40, 100, 'touch');

    press(el, 'pointerDown', midX('To do'), 100, 'touch');
    act(() => vi.advanceTimersByTime(400));
    expect(ghost()).not.toBeNull();
    press(board, 'pointerMove', midX('Done'), 100, 'touch');
    press(board, 'pointerUp', midX('Done'), 100, 'touch');
    expect(D.task(14).status).toBe('Done');
  });

  it('keeps a tap on a card opening the task, and opens a moved task on the detail of its new status', () => {
    renderApp('tasks.board', 'pm');
    layout();
    tap(card(15));
    expect(window.location.hash).toBe('#tasks.detail-todo');
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    layout();
    mouseDrag(14, 'In review');
    tap(card(14));
    expect(window.location.hash).toBe('#tasks.detail-review');
  });

  it('shows the move on the lists too: a task dropped on Done gets a Done note and leaves My tasks', () => {
    act(() => moveTask(14, 'Done'));
    expect(D.task(14).when).toBe(`Done ${D.today.short.slice(5)}`);
    renderApp('tasks.my', 'pm');
    expect(dom.queryByText('Write the API spec')).not.toBeInTheDocument();
    act(() => moveTask(14, 'To do'));
    expect(D.task(14).when).toBe('Today');
  });

  it('refuses to move a task that does not exist', () => {
    expect(() => moveTask(999, 'Done')).toThrow(/#999/);
  });
});
