// Tasks ③ Kanban move menu: hold a card, then slide toward a status and let go, or let go and tap one; sliding back to
// the middle cancels, a swipe still scrolls and a tap still opens the task. A Member moves only their own tasks.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { aimOf } from '../screens/tasks/tasks.radial';
import { moveTask, resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const X = 150, Y = 300, HOLD = 400, FAR = 60;   // test-only: press point, a hold past 350ms, a slide past the pick radius

const card = no => dom.getByRole('button', { name: new RegExp(`^#${no} `) });
const col = status => dom.getByRole('region', { name: new RegExp(`^${status}, `) });
const menu = () => dom.queryByRole('dialog', { name: /^Move #/ });
const option = status => within(menu()).getByRole('button', { name: new RegExp(`^${status}`) });

const press = (el, type, dx = 0, dy = 0, pointerType = 'touch') =>
  fireEvent[type](el, { pointerId: 1, button: 0, isPrimary: true, pointerType, clientX: X + dx, clientY: Y + dy });

/** Press card #no and hold it still until the menu opens; returns the board the gesture continues on. */
function hold(no, pointerType = 'touch') {
  const el = card(no);
  press(el, 'pointerDown', 0, 0, pointerType);
  act(() => vi.advanceTimersByTime(HOLD));
  return el.closest('.tk-board');
}

/** Let go at (dx, dy) from the press point, then the click the browser sends after it (to the card, wherever it is now). */
function letGo(board, no, dx = 0, dy = 0) {
  press(board, 'pointerUp', dx, dy);
  fireEvent.click(card(no));
}

/** Hold card #no, slide (dx, dy) and let go. */
function flick(no, dx, dy) {
  const board = hold(no);
  press(board, 'pointerMove', dx, dy);
  letGo(board, no, dx, dy);
}

beforeEach(() => { window.location.hash = ''; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); act(resetTasks); });

describe('tasks kanban move menu', () => {
  it('opens after a hold, with the four statuses and the task\'s own one marked Now and off', () => {
    renderApp('tasks.board', 'pm');
    hold(14);
    expect(menu()).toHaveAccessibleName('Move #14 Write the API spec');
    expect(within(menu()).getAllByRole('button', { name: /^(To do|In progress|In review|Done)/ })).toHaveLength(4);
    expect(option('To do')).toBeDisabled();
    expect(option('To do')).toHaveAttribute('aria-current', 'true');
    expect(option('Done')).toBeEnabled();
    expect(within(menu()).getByText('Slide to a status and let go')).toBeInTheDocument();
  });

  it.each([
    ['right', 'In progress', FAR, 0],
    ['down', 'In review', 0, FAR],
    ['left', 'Done', -FAR, 0],
  ])('moves a task by sliding %s to %s and letting go, says so, and does not open it', (_, status, dx, dy) => {
    renderApp('tasks.board', 'pm');
    const board = hold(14);
    press(board, 'pointerMove', dx, dy);
    expect(option(status)).toHaveClass('is-aimed');
    letGo(board, 14, dx, dy);
    expect(menu()).toBeNull();
    expect(D.task(14).status).toBe(status);
    expect(within(col(status)).getByRole('button', { name: /^#14 / })).toBeInTheDocument();
    expect(dom.getByText(`Moved to ${status}`)).toBeInTheDocument();
    expect(window.location.hash).toBe('#tasks.board');
  });

  it('aims by the longer axis of the slide and not before the slide is long enough', () => {
    expect(aimOf(10, 10)).toBeNull();
    expect(aimOf(50, -30)).toBe('In progress');
    expect(aimOf(-20, -50)).toBe('To do');
    expect(aimOf(-50, 20)).toBe('Done');
  });

  it('stays open when let go without sliding, then a tap on a status moves the task', () => {
    renderApp('tasks.board', 'pm');
    letGo(hold(14), 14);
    expect(menu()).not.toBeNull();
    expect(window.location.hash).toBe('#tasks.board');   // the release was not a tap that opens the task
    expect(within(menu()).getByText('Tap a status to move the task')).toBeInTheDocument();
    fireEvent.click(option('In review'));
    expect(menu()).toBeNull();
    expect(D.task(14).status).toBe('In review');
  });

  it('cancels when the finger slides out and back to the middle before letting go', () => {
    renderApp('tasks.board', 'pm');
    const board = hold(14);
    press(board, 'pointerMove', FAR, 0);
    press(board, 'pointerMove', 5, 0);
    expect(option('In progress')).not.toHaveClass('is-aimed');
    letGo(board, 14, 5, 0);
    expect(menu()).toBeNull();
    expect(D.task(14).status).toBe('To do');
    expect(dom.queryByText(/^Moved to/)).not.toBeInTheDocument();
  });

  it('changes nothing when let go on the task\'s own status', () => {
    renderApp('tasks.board', 'pm');
    flick(14, 0, -FAR);   // To do sits up
    expect(menu()).toBeNull();
    expect(D.task(14).status).toBe('To do');
    expect(dom.queryByText(/^Moved to/)).not.toBeInTheDocument();
  });

  it('closes on Escape and on a tap on the dim', () => {
    renderApp('tasks.board', 'pm');
    const board = hold(14);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menu()).toBeNull();
    letGo(board, 14, FAR, 0);
    expect(D.task(14).status).toBe('To do');
    letGo(hold(14), 14);
    fireEvent.click(within(menu()).getByRole('button', { name: 'Close' }));
    expect(menu()).toBeNull();
  });

  it('plays a close: hidden at once and gone after it, with the picked status filled only when the task moved', () => {
    renderApp('tasks.board', 'pm');
    const closingMenu = () => document.querySelector('.tk-radial.is-closing');
    flick(14, FAR, 0);
    expect(menu()).toBeNull();
    expect(closingMenu()).toHaveAttribute('aria-hidden', 'true');
    expect(closingMenu().querySelector('.is-aimed')).toHaveTextContent('In progress');
    act(() => vi.advanceTimersByTime(250));
    expect(closingMenu()).toBeNull();
    const board = hold(16);
    press(board, 'pointerMove', -FAR, 0);
    fireEvent.keyDown(window, { key: 'Escape' });   // aimed at Done, but closed without moving
    expect(closingMenu().querySelector('.is-aimed')).toBeNull();
    expect(D.task(16).status).toBe('To do');
  });

  it('does not open when the finger moves before the hold ends, so a swipe on a card scrolls the board', () => {
    renderApp('tasks.board', 'pm');
    const el = card(14), board = el.closest('.tk-board');
    press(el, 'pointerDown');
    press(board, 'pointerMove', -40, 0);
    act(() => vi.advanceTimersByTime(HOLD));
    expect(menu()).toBeNull();
  });

  it('opens on a mouse hold too', () => {
    renderApp('tasks.board', 'pm');
    hold(14, 'mouse');
    expect(menu()).not.toBeNull();
  });

  it('keeps a tap on a card opening the task, and opens a moved task on the detail of its new status', () => {
    renderApp('tasks.board', 'pm');
    press(card(15), 'pointerDown');
    press(card(15), 'pointerUp');
    fireEvent.click(card(15));
    expect(window.location.hash).toBe('#tasks.detail-todo');
    fireEvent.click(dom.getByRole('button', { name: 'Back' }));
    flick(14, 0, FAR);
    fireEvent.click(card(14));
    expect(window.location.hash).toBe('#tasks.detail-review');
  });

  it('shows the move on the lists too: a task moved to Done gets a Done note and leaves My tasks', () => {
    act(() => moveTask(14, 'Done'));
    expect(D.task(14).when).toBe(`Done ${D.today.short.slice(5)}`);
    renderApp('tasks.my', 'pm');
    expect(dom.queryByText('Write the API spec')).not.toBeInTheDocument();
    act(() => moveTask(14, 'To do'));
    expect(D.task(14).when).toBe('Today');
  });

  it('lets a Member move only their own tasks: a teammate\'s card opens no menu and says who can change it', () => {
    renderApp('tasks.board', 'member');   // Member = Dodi
    letGo(hold(14), 14);                  // Nico's task
    expect(menu()).toBeNull();
    expect(dom.getByText('Only Nico can change this task')).toBeInTheDocument();
    expect(window.location.hash).toBe('#tasks.board');
    flick(16, FAR, 0);                    // Dodi's own task
    expect(D.task(16).status).toBe('In progress');
  });

  it.each(['pm', 'admin'])('lets a %s move anyone\'s task', role => {
    renderApp('tasks.board', role);
    flick(15, FAR, 0);                    // Rina's task
    expect(D.task(15).status).toBe('In progress');
  });

  it('refuses to move a task that does not exist', () => {
    expect(() => moveTask(999, 'Done')).toThrow(/#999/);
  });
});
