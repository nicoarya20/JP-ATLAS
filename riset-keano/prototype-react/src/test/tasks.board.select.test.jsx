// Tasks ③ Kanban select: Select turns taps into picking cards; holding one picked card stacks them all under the
// finger and the move menu moves them together. A Member picks only their own tasks.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen as dom, within } from '@testing-library/react';
import '../screens';
import { D } from '../data/sample';
import { resetTasks } from '../screens/tasks/tasks.store';
import { renderApp } from './render';

const X = 150, Y = 300, HOLD = 400, FAR = 60, CLOSED = 250;   // test-only: press point, hold, slide, close animation

const card = no => dom.getByRole('button', { name: new RegExp(`^#${no} `) });
const menu = () => dom.queryByRole('dialog', { name: /^Move / });
const option = status => within(menu()).getByRole('button', { name: new RegExp(`^${status}`) });
const btn = name => within(document.querySelector('.tk-selbar')).getByRole('button', { name });
const stack = () => document.querySelector('.tk-stack');
const press = (el, type, dx = 0, dy = 0) =>
  fireEvent[type](el, { pointerId: 1, button: 0, isPrimary: true, pointerType: 'touch', clientX: X + dx, clientY: Y + dy });

/** Tap card #no as a finger does: press, let go, click. */
function tap(no) {
  press(card(no), 'pointerDown');
  press(card(no), 'pointerUp');
  fireEvent.click(card(no));
}

/** Hold card #no until the menu opens, then slide (dx, dy) and let go (no slide = the menu stays for a tap). */
function holdAndGo(no, dx = 0, dy = 0) {
  const el = card(no), board = el.closest('.tk-board');
  press(el, 'pointerDown');
  act(() => vi.advanceTimersByTime(HOLD));
  if (dx || dy) press(board, 'pointerMove', dx, dy);
  return () => { press(board, 'pointerUp', dx, dy); fireEvent.click(card(no)); };
}

/** Open the board as role, press Select and pick the given cards. */
function pick(role, ...nos) {
  renderApp('tasks.board', role);
  fireEvent.click(btn('Select'));
  nos.forEach(tap);
}

beforeEach(() => { window.location.hash = ''; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); act(resetTasks); });

describe('tasks kanban select', () => {
  it('turns taps into picking cards, counts them, and Cancel drops the picks and lets a tap open again', () => {
    pick('pm');
    expect(dom.getByText('Tap tasks to select them')).toBeInTheDocument();
    tap(14);
    tap(12);
    expect(card(14)).toHaveAttribute('aria-pressed', 'true');
    expect(dom.getByText('2 selected · hold one to move them')).toBeInTheDocument();
    expect(window.location.hash).toBe('#tasks.board');
    tap(12);
    expect(card(12)).toHaveAttribute('aria-pressed', 'false');
    expect(dom.getByText('1 selected · hold one to move them')).toBeInTheDocument();
    fireEvent.click(btn('Cancel'));
    expect(card(14)).not.toHaveAttribute('aria-pressed');
    tap(14);
    expect(window.location.hash).toBe('#tasks.detail-todo');
  });

  it('stacks the picked cards under the finger, held one on top, and moves them all to the status slid to', () => {
    pick('pm', 14, 15, 12);
    const letGo = holdAndGo(15, -FAR, 0);   // Done sits left
    expect(menu()).toHaveAccessibleName('Move 3 tasks');
    const cards = [...stack().querySelectorAll('.tk-stack-card')];
    expect(cards.map(el => el.textContent)).toEqual([
      '#15Review the onboarding page design', '#12Fix SSO login', '#14Write the API spec']);   // held one, then board order
    expect(within(stack()).getByText('3')).toBeInTheDocument();
    expect(card(14)).toHaveClass('is-lifted');
    expect(card(16)).not.toHaveClass('is-lifted');
    letGo();
    expect([14, 15, 12].map(no => D.task(no).status)).toEqual(['Done', 'Done', 'Done']);
    expect(D.task(16).status).toBe('To do');
    expect(dom.getByText('Moved 3 tasks to Done')).toBeInTheDocument();
    expect(stack()).toHaveClass('is-to-left');
    expect(btn('Select')).toBeInTheDocument();        // the move ends Select
    expect(card(14)).not.toHaveAttribute('aria-pressed');
  });

  it('offers every status for a mixed group and counts only the tasks that changed', () => {
    pick('pm', 14, 12);
    holdAndGo(14)();
    COLUMN_NAMES.forEach(s => expect(option(s)).toBeEnabled());
    fireEvent.click(option('In progress'));
    expect(D.task(14).status).toBe('In progress');
    expect(dom.getByText('Moved 1 task to In progress')).toBeInTheDocument();
  });

  it('marks the shared status Now and off for a group from one column', () => {
    pick('pm', 14, 15);
    holdAndGo(14)();
    expect(option('To do')).toBeDisabled();
    expect(within(menu()).getByText('Tap a status to move the tasks')).toBeInTheDocument();
  });

  it('flies the cards back and keeps the picks when the group move is cancelled', () => {
    pick('pm', 14, 15);
    const board = card(14).closest('.tk-board');
    holdAndGo(14, FAR, 0);
    press(board, 'pointerMove', 4, 0);   // back to the middle
    press(board, 'pointerUp', 4, 0);
    expect(menu()).toBeNull();
    expect(stack()).toHaveClass('is-back');
    expect([14, 15].map(no => D.task(no).status)).toEqual(['To do', 'To do']);
    act(() => vi.advanceTimersByTime(CLOSED));
    expect(stack()).toBeNull();
    expect(card(14)).not.toHaveClass('is-lifted');
    expect(dom.getByText('2 selected · hold one to move them')).toBeInTheDocument();
  });

  it('moves only the held card when it is not one of the picks', () => {
    pick('pm', 14, 15);
    holdAndGo(16, FAR, 0)();
    expect(D.task(16).status).toBe('In progress');
    expect([14, 15].map(no => D.task(no).status)).toEqual(['To do', 'To do']);
    expect(dom.getByText('Moved to In progress')).toBeInTheDocument();
    expect(dom.getByText('2 selected · hold one to move them')).toBeInTheDocument();
  });

  it('lets a Member pick only their own tasks', () => {
    pick('member', 14, 16, 17);   // Member = Dodi: #14 is Nico's, #16 and #17 are Dodi's
    expect(dom.getByText('Only Nico can change this task')).toBeInTheDocument();
    expect(card(14)).toHaveAttribute('aria-pressed', 'false');
    holdAndGo(16, 0, FAR)();
    expect([16, 17].map(no => D.task(no).status)).toEqual(['In review', 'In review']);
    expect(dom.getByText('Moved 1 task to In review')).toBeInTheDocument();
  });
});

const COLUMN_NAMES = ['To do', 'In progress', 'In review', 'Done'];
