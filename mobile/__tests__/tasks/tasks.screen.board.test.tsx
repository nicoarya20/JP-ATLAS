// Kanban moves against a stubbed /api/app/tasks (port of prototype tasks.board.move.test / tasks.board.select.test):
// hold a card for HOLD_MS to open the move menu, slide toward a status and let go, and the server takes the workflow
// step (start, unstart, complete); back to the centre cancels; a still release leaves it open for a tap. Only the
// moves the task's `can{}` allows are offered: the rest are off, and a card with none says why instead of opening.
// Select picks cards and a held pick moves the whole group; the screen reader action "Move to …" moves without the
// gesture; a refusal is said in the server's words; a column loads more; a board the search empties shows NoMatch.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { capMessage } from '../../src/data/caps.messages';
import { HOLD_MS } from '../../src/data/tasks.radial';
import * as moveMenuState from '../../src/screens/tasks/board/move-menu.state';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { DODI, locked, row, tasksServer } from '../helpers/tasks-fixtures';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
let tasks: ReturnType<typeof tasksServer>;
afterEach(() => {
  server?.restore();
  server = null;
});

/** Mine: To do #14 and #9, In progress #12, Done #8; Dodi's In review #17. */
const ROWS = [
  row(14, { title: 'Write the API spec', dueDate: '2026-10-07' }),
  row(9, { title: 'Update the landing page', dueDate: '2026-10-08' }),
  row(12, {
    title: 'Fix SSO login',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-10-05',
  }),
  row(17, { title: 'Fix the save button', status: 'in_review', assignee: DODI }),
  row(8, { title: 'Ship the onboarding', status: 'done' }),
];

/** Serve the board's tasks (with `extra` routes over them) and open it at `url`. */
async function open(url = '/tasks?view=board', rows = ROWS, options = {}, extra: AuthRoutes = {}) {
  tasks = tasksServer(rows, options);
  server = serveAuth({ ...extra, ...tasks.routes });
  await openTasks(url);
  await screen.findByTestId(`board-card-${rows[0].number}`);
}

const FRAME_MS = 16;
/** Run animation frames for `ms`, one at a time. */
const advance = (ms: number) =>
  act(() => {
    for (let t = 0; t < ms; t += FRAME_MS) jest.advanceTimersByTime(FRAME_MS);
  });
const AT = { absoluteX: 180, absoluteY: 400 };
const status = (no: number) => tasks.status(no);
const menu = () => screen.queryByTestId('radial-menu');
const inColumn = (column: string, no: number) =>
  within(screen.getByTestId(`column-${column}`)).queryByTestId(`board-card-${no}`);

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
  it('a slide right then release starts the task on the server; the board shows it moved', async () => {
    await open();
    const pan = await hold(14);
    expect(menu()).toHaveAccessibleName('Move #14 Write the API spec');
    await slide(pan, 40);
    await lift(pan, 40);
    expect(await screen.findByText('Moved to In progress')).toBeOnTheScreen();
    expect(status(14)).toBe('in_progress');
    expect(server?.calls.some((u) => u.endsWith('/api/app/tasks/t-14/start'))).toBe(true);
    await waitFor(() => expect(inColumn('In progress', 14)).toBeOnTheScreen());
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
  });

  it('a slide out and back to the centre cancels', async () => {
    await open();
    const pan = await hold(14);
    await slide(pan, 40);
    await slide(pan, 0);
    await lift(pan);
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(status(14)).toBe('todo');
  });

  it('stays open after a still release; what the task cannot do is off; a tap on Done completes it', async () => {
    await open();
    await lift(await hold(14));
    expect(screen.getByText('Tap a status to move the task')).toBeOnTheScreen();
    expect(screen.getByTestId('radial-To do')).toHaveAccessibleName('To do, current status');
    expect(screen.getByTestId('radial-In review')).toHaveAccessibleName('In review, not available');
    expect(screen.getByTestId('radial-In review')).toBeDisabled();
    // Each label has room in its pill: a zero-size slot squeezes it out on a device, where jest does no layout.
    for (const s of ['To do', 'In progress', 'In review', 'Done'])
      expect(
        StyleSheet.flatten(screen.getByTestId(`radial-slot-${s}`).props.style).width,
      ).toBeGreaterThan(0);
    await fireEvent.press(screen.getByTestId('radial-Done'));
    await waitFor(() => expect(status(14)).toBe('done'));
  });

  it('the dim closes an open menu without moving', async () => {
    await open();
    await lift(await hold(14));
    await fireEvent.press(screen.getByTestId('radial-dim'));
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(status(14)).toBe('todo');
  });

  it('a card the server lets nobody move here says why, in English, instead of opening', async () => {
    await open('/tasks?scope=all&view=board', [
      row(15, { title: 'Design the empty states', assignee: DODI, can: locked('IMPERSONATING') }),
    ]);
    await hold(15);
    expect(menu()).not.toBeOnTheScreen();
    expect(await screen.findByText(capMessage('IMPERSONATING'))).toBeOnTheScreen();
    expect(status(15)).toBe('todo');
  });

  it("a move the server refuses says so in the server's words; the card stays", async () => {
    const refused = {
      status: 409,
      body: { error: 'Tugas ini sudah diubah orang lain.', code: 'CONFLICT' },
    };
    await open('/tasks?view=board', ROWS, { refuse: { 't-14': refused } });
    const pan = await hold(14);
    await slide(pan, 40);
    await lift(pan, 40);
    expect(await screen.findByText('Tugas ini sudah diubah orang lain.')).toBeOnTheScreen();
    expect(inColumn('To do', 14)).toBeOnTheScreen();
  });

  it('letting go after a hold does not open the task', async () => {
    await open();
    const pan = await hold(14);
    await lift(pan);
    await fireEvent.press(screen.getByTestId('radial-dim'));
    await fireEvent.press(screen.getByTestId('board-card-14'));
    expect(screen).toHavePathname('/tasks');
  });
});

describe('kanban select', () => {
  it('Select picks cards, and holding a picked one moves the group', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-14'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    expect(screen.getByTestId('board-card-14')).toBeSelected();
    expect(screen).toHavePathname('/tasks');

    const pan = await hold(14);
    expect(menu()).toHaveAccessibleName('Move 2 tasks');
    await slide(pan, -40);
    await lift(pan, -40);
    expect(await screen.findByText('Moved 2 tasks to Done')).toBeOnTheScreen();
    expect([status(14), status(9)]).toEqual(['done', 'done']);
  });

  it('a group whose cards cannot be measured cancels the menu: nothing moves, the picks stay', async () => {
    const real = moveMenuState.measureGroup;
    // Measure against no registered views, as when the cards left the board before the menu opened.
    const spy = jest
      .spyOn(moveMenuState, 'measureGroup')
      .mockImplementation((no, _views, ...rest) => real(no, new Map(), ...rest));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await open();
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-14'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    const pan = await hold(14);
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^Move menu of task #14 closed: /));
    await slide(pan, -40);
    await lift(pan, -40);
    expect([status(14), status(9)]).toEqual(['todo', 'todo']);
    expect(screen.getByTestId('board-card-14')).toBeSelected();
    expect(screen.getByTestId('board-card-9')).toBeSelected();
    spy.mockRestore();
    warn.mockRestore();
  });

  it('select all picks a column, and again clears it', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('select-To do'));
    const all = screen.getByTestId('select-all-To do');
    await fireEvent.press(all);
    expect(screen.getByTestId('board-card-14')).toBeSelected();
    expect(screen.getByTestId('board-card-9')).toBeSelected();
    await fireEvent.press(all);
    expect(screen.getByTestId('board-card-14')).not.toBeSelected();
  });
});

describe('kanban accessibility', () => {
  it('the card offers only the moves the server allows, and "Move to Done" completes it', async () => {
    await open();
    const card = screen.getByTestId('board-card-14');
    expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Move to In progress',
      'Move to Done',
    ]);
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'Done' } });
    await waitFor(() => expect(status(14)).toBe('done'));
  });

  it("names a card with what it shows and a column head with the server's count", async () => {
    await open();
    expect(screen.getByTestId('board-card-14')).toHaveAccessibleName(
      '#14 Write the API spec, Atlas Project, Medium, To do, Due Oct 7, Nico Arya',
    );
    expect(
      within(screen.getByTestId('board-card-12')).getByText(/ · \d+ days? late$/),
    ).toBeOnTheScreen();
    expect(
      ['To do', 'In progress', 'In review', 'Done'].map(
        (c) =>
          within(screen.getByTestId(`column-${c}`)).getByRole('header').props.accessibilityLabel,
      ),
    ).toEqual(['To do, 2 tasks', 'In progress, 1 task', 'In review, 0 tasks', 'Done, 1 task']);
  });

  it('a picked card’s named move carries its whole group, as holding it does, and ends Select', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-14'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    const card = screen.getByTestId('board-card-14');
    expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Move 2 tasks to In progress',
      'Move 2 tasks to Done',
    ]);
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'Done' } });
    expect(await screen.findByText('Moved 2 tasks to Done')).toBeOnTheScreen();
    expect([status(14), status(9)]).toEqual(['done', 'done']);
    expect(screen.getByTestId('select-To do')).toHaveAccessibleName('Select tasks in To do');
  });

  it('names Select by its column; Add task only where the server lets the viewer add one', async () => {
    await open();
    const select = screen.getByTestId('select-Done');
    expect(select).toHaveAccessibleName('Select tasks in Done');
    await fireEvent.press(select);
    expect(select).toHaveAccessibleName('Stop selecting in Done');
    expect(screen.getByTestId('add-task-Done')).toHaveAccessibleName('Add task to Done');
  });

  it('without caps.createTask there is no Add task', async () => {
    await open('/tasks?view=board', ROWS, { createTask: null });
    expect(screen.queryByTestId('add-task-To do')).toBeNull();
  });
});

describe('kanban columns', () => {
  it('a long column loads more under its cards', async () => {
    const many = Array.from({ length: 30 }, (_, i) => row(100 + i, { assignee: DODI }));
    await open('/tasks?scope=all&view=board', many);
    expect(screen.queryByTestId('board-card-125')).toBeNull();
    expect(
      within(screen.getByTestId('column-To do')).getByRole('header').props.accessibilityLabel,
    ).toBe('To do, 25+ tasks');
    await fireEvent.press(screen.getByTestId('column-more-To do'));
    expect(await screen.findByTestId('board-card-129')).toBeOnTheScreen();
  });

  it('a search that empties every column shows NoMatch, and Reset brings the board back', async () => {
    await open();
    await fireEvent.changeText(screen.getByLabelText('Search title or #number…'), 'zzz');
    expect(await screen.findByText('No tasks match these filters.')).toBeOnTheScreen();
    expect(screen.queryByTestId('task-board')).not.toBeOnTheScreen();
    await fireEvent.press(within(screen.getByTestId('no-match')).getByRole('button'));
    expect(await screen.findByTestId('board-card-14')).toBeOnTheScreen();
  });
});
