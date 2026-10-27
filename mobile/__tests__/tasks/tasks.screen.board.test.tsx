// Kanban moves (port of prototype tasks.board.move.test / tasks.board.select.test), now against the server: hold a
// card for HOLD_MS to open the move menu, slide toward a status and let go; back to the centre cancels; a still
// release leaves it open for a tap; Select picks cards and a held pick moves them all; the screen reader action
// "Move to …" moves a card (or, on a picked card, its group) without the gesture; a board the search empties shows
// NoMatch with Reset.
//
// What changed with the swap is where a side comes from and what a release writes. A side is that card's own can{} —
// the server takes steps, not statuses, and only twelve transitions exist — and a release is one POST per task, so
// the assertions read the status the server now holds rather than a store this app wrote hopefully.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { HOLD_MS } from '../../src/data/tasks.radial';
import * as moveMenuState from '../../src/screens/tasks/board/move-menu.state';
import { SAMPLE_ROWS } from '../helpers/tasks-api-server';
import { openTasks, resetTaskStores, serveTasks, taskApi } from '../helpers/tasks-router';
import { wireItem } from '../helpers/tasks-wire';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

const FRAME_MS = 16;
/** Run animation frames for `ms`, one at a time. */
const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });
const AT = { absoluteX: 180, absoluteY: 400 };
/** The status the server now holds for a task. */
const status = (no: number) => taskApi().task(no)?.status;
const menu = () => screen.queryByTestId('radial-menu');

/** Hold card #no until the menu opens; returns the card's gesture to slide and lift. */
async function hold(no: number) {
  const pan = createGestureController(`card-${no}`);
  await act(() => pan.begin({ ...AT, translationX: 0, translationY: 0 }));
  await advance(HOLD_MS);
  await act(() => pan.activate({ ...AT, translationX: 0, translationY: 0 }));
  await advance(FRAME_MS);
  return pan;
}
type Pan = Awaited<ReturnType<typeof hold>>;
const slide = (pan: Pan, translationX: number, translationY = 0) =>
  act(() => pan.update({ ...AT, translationX, translationY }));
async function lift(pan: Pan, translationX = 0, translationY = 0) {
  await act(() => pan.end({ ...AT, translationX, translationY }));
  await advance(FRAME_MS);
}

describe('kanban move menu', () => {
  it('opens on a held card, and a slide right then release moves it to In progress', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(12);
    expect(menu()).toBeOnTheScreen();
    expect(menu()).toHaveAccessibleName('Move #12 Fix login layout');
    await slide(pan, 40);
    await lift(pan, 40);
    await waitFor(() => expect(status(12)).toBe('in_progress'));
    expect(await screen.findByText('Moved to In progress')).toBeOnTheScreen();
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
  });

  it('a slide out and back to the centre cancels', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(12);
    await slide(pan, 40);
    await slide(pan, 0);
    await lift(pan);
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(status(12)).toBe('todo');
  });

  it('stays open after a still release, for a tap on a status', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(12);
    await lift(pan);
    expect(menu()).toBeOnTheScreen();
    expect(screen.getByText('Tap a status to move the task')).toBeOnTheScreen();
    expect(screen.getByTestId('radial-To do')).toHaveAccessibleName('To do, current status');
    await fireEvent.press(screen.getByTestId('radial-Done'));
    await waitFor(() => expect(status(12)).toBe('done'));
  });

  it('the dim closes an open menu without moving', async () => {
    await openTasks('/tasks?view=board');
    await lift(await hold(12));
    await fireEvent.press(screen.getByTestId('radial-dim'));
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(status(12)).toBe('todo');
  });

  it('letting go after a hold does not open the task', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(12);
    await lift(pan);
    await fireEvent.press(screen.getByTestId('radial-dim'));
    await fireEvent.press(screen.getByTestId('board-card-12'));
    expect(screen).toHavePathname('/tasks');
  });
});

describe('kanban sides follow the server', () => {
  it('draws a status with no step from this one shut, and a tap on it moves nothing', async () => {
    // From In progress the server has `unstart` (To do) and `complete` (Done), but the step to In
    // review is `requestReview`, whose route does not exist until S4 — so that one side is shut
    // while the other two are open.
    await openTasks('/tasks?view=board');
    await lift(await hold(14));
    expect(screen.getByTestId('radial-In progress')).toHaveAccessibleName(
      'In progress, current status',
    );
    expect(screen.getByTestId('radial-To do')).toBeEnabled();
    expect(screen.getByTestId('radial-Done')).toBeEnabled();
    expect(screen.getByTestId('radial-In review')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('radial-In review'));
    expect(status(14)).toBe('in_progress');
  });

  it('a task In review offers no move at all, because only `approve` leads out of it', async () => {
    // `approve` is the one step out of In review and its route answers 404 until S4 (A6), so there
    // is nothing to open a ring for.
    await openTasks('/tasks?view=board');
    await hold(17);
    expect(menu()).not.toBeOnTheScreen();
    expect(await screen.findByText('This task cannot be moved from here.')).toBeOnTheScreen();
    expect(status(17)).toBe('in_review');
  });

  it('a card the server allows nothing for gets the reason, not the menu', async () => {
    serveTasks([wireItem({ can: { update: true, comment: true } })]);
    await openTasks('/tasks?view=board');
    await hold(12);
    expect(menu()).not.toBeOnTheScreen();
    expect(await screen.findByText('This task cannot be moved from here.')).toBeOnTheScreen();
    expect(status(12)).toBe('todo');
  });

  it('says so when the server refuses the step, in its own words', async () => {
    await openTasks('/tasks?view=board');
    taskApi().routes['/api/app/tasks/'] = {
      status: 409,
      body: {
        error: 'Status tugas sudah berubah. Muat ulang halaman.',
        code: 'WRONG_STATE',
        status: 409,
        requestId: 'r',
      },
    };
    const pan = await hold(12);
    await slide(pan, 40);
    await lift(pan, 40);
    expect(
      await screen.findByText('Status tugas sudah berubah. Muat ulang halaman.'),
    ).toBeOnTheScreen();
    expect(status(12)).toBe('todo');
  });
});

describe('kanban select', () => {
  it('Select picks cards, and holding a picked one moves the group', async () => {
    await openTasks('/tasks?view=board');
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-12'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    expect(screen.getByTestId('board-card-12')).toBeSelected();
    expect(screen).toHavePathname('/tasks');

    const pan = await hold(12);
    expect(menu()).toHaveAccessibleName('Move 2 tasks');
    await slide(pan, -40);
    await lift(pan, -40);
    await waitFor(() => expect([status(12), status(9)]).toEqual(['done', 'done']));
    expect(await screen.findByText('Moved 2 tasks to Done')).toBeOnTheScreen();
  });

  it('a group whose cards cannot be measured cancels the menu: nothing moves, the picks stay', async () => {
    const real = moveMenuState.measureGroup;
    // Measure against no registered views, as when the cards left the board before the menu opened.
    const spy = jest
      .spyOn(moveMenuState, 'measureGroup')
      .mockImplementation((no, _views, ...rest) => real(no, new Map(), ...rest));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await openTasks('/tasks?view=board');
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-12'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    const pan = await hold(12);
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^Move menu of task #12 closed: /));
    await slide(pan, -40);
    await lift(pan, -40);
    expect([status(12), status(9)]).toEqual(['todo', 'todo']);
    expect(screen.getByTestId('board-card-12')).toBeSelected();
    expect(screen.getByTestId('board-card-9')).toBeSelected();
    spy.mockRestore();
    warn.mockRestore();
  });

  it('select all picks a column, and again clears it', async () => {
    await openTasks('/tasks?view=board');
    await fireEvent.press(screen.getByTestId('select-To do'));
    const all = screen.getByTestId('select-all-To do');
    await fireEvent.press(all);
    expect(screen.getByTestId('board-card-12')).toBeSelected();
    expect(screen.getByTestId('board-card-9')).toBeSelected();
    await fireEvent.press(all);
    expect(screen.getByTestId('board-card-12')).not.toBeSelected();
  });
});

describe('kanban accessibility', () => {
  it('names only the moves the server allows, and one of them moves the card', async () => {
    await openTasks('/tasks?view=board');
    const card = screen.getByTestId('board-card-12');
    // Not "In review": a To do task has no step to it (`requestReview` starts from In progress).
    expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Move to In progress',
      'Move to Done',
    ]);
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'Done' } });
    await waitFor(() => expect(status(12)).toBe('done'));
  });

  it('names a card with what it shows, a late one with how late, and a column head with its count', async () => {
    await openTasks('/tasks?view=board');
    expect(screen.getByTestId('board-card-9')).toHaveAccessibleName(
      '#9 Check the SSO redirect, Atlas Project, High, To do, Due Oct 8, Nico Pratama',
    );
    expect(
      within(screen.getByTestId('board-card-12')).getByText(/ · \d+ days? late$/),
    ).toBeOnTheScreen();
    expect(
      ['To do', 'In progress', 'In review', 'Done'].map(
        (c) =>
          within(screen.getByTestId(`column-${c}`)).getByRole('header').props.accessibilityLabel,
      ),
      // Every row the stub serves is on the board: it does not narrow `scope=mine` by assignee,
      // which the server does in SQL and no screen test can see.
    ).toEqual(['To do, 2 tasks', 'In progress, 1 task', 'In review, 1 task', 'Done, 1 task']);
  });

  it('a picked card’s named move carries its whole group, as holding it does, and ends Select', async () => {
    await openTasks('/tasks?view=board');
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-12'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    const card = screen.getByTestId('board-card-12');
    expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Move 2 tasks to In progress',
      'Move 2 tasks to Done',
    ]);
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'Done' } });
    await waitFor(() => expect([status(12), status(9)]).toEqual(['done', 'done']));
    expect(await screen.findByText('Moved 2 tasks to Done')).toBeOnTheScreen();
    expect(screen.getByTestId('select-To do')).toHaveAccessibleName('Select tasks in To do');
  });

  it('names Select, its Cancel and Add task by their column', async () => {
    await openTasks('/tasks?view=board');
    const select = screen.getByTestId('select-Done');
    expect(select).toHaveAccessibleName('Select tasks in Done');
    await fireEvent.press(select);
    expect(select).toHaveAccessibleName('Stop selecting in Done');
    expect(screen.getByTestId('add-task-Done')).toHaveAccessibleName('Add task to Done');
  });
});

describe('kanban empty and failed', () => {
  it('a search that empties every column shows NoMatch, and Reset brings the board back', async () => {
    await openTasks('/tasks?view=board');
    await fireEvent.changeText(screen.getByLabelText('Search title or exact #number…'), 'zzz');
    await waitFor(() => expect(screen.queryByTestId('task-board')).not.toBeOnTheScreen());
    expect(screen.getByText('No tasks match these filters.')).toBeOnTheScreen();
    await fireEvent.press(within(screen.getByTestId('no-match')).getByRole('button'));
    expect(await screen.findByTestId('board-card-12')).toBeOnTheScreen();
  });

  it('a board that could not be loaded shows the server’s own sentence with Try again', async () => {
    serveTasks(SAMPLE_ROWS);
    taskApi().routes['/api/app/tasks?'] = {
      status: 503,
      body: {
        error: 'Server sedang dalam perbaikan.',
        code: 'MAINTENANCE',
        status: 503,
        requestId: 'r',
      },
    };
    await openTasks('/tasks?view=board');
    expect(screen.getByTestId('board-failed')).toBeOnTheScreen();
    expect(screen.getByText('Server sedang dalam perbaikan.')).toBeOnTheScreen();
  });
});
