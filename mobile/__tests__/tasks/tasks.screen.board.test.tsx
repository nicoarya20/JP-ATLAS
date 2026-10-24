// Kanban moves (port of prototype tasks.board.move.test / tasks.board.select.test): hold a card for HOLD_MS to open the
// move menu, slide toward a status and let go; back to the centre cancels; a still release leaves it open for a tap; a
// Member may not move someone else's card; Select picks cards and a held pick moves the whole group; the screen reader
// action "Move to …" moves a card without the gesture.
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import { HOLD_MS } from '../../src/data/tasks.radial';
import { getTask } from '../../src/data/tasks.state';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';
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
const status = (no: number) => getTask(no)?.status;
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
    const pan = await hold(14);
    expect(menu()).toBeOnTheScreen();
    expect(menu()).toHaveAccessibleName('Move #14 Write the API spec');
    await slide(pan, 40);
    await lift(pan, 40);
    expect(status(14)).toBe('In progress');
    expect(await screen.findByText('Moved to In progress')).toBeOnTheScreen();
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
  });

  it('a slide out and back to the centre cancels', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(14);
    await slide(pan, 40);
    await slide(pan, 0);
    await lift(pan);
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(status(14)).toBe('To do');
  });

  it('stays open after a still release, for a tap on a status', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(14);
    await lift(pan);
    expect(menu()).toBeOnTheScreen();
    expect(screen.getByText('Tap a status to move the task')).toBeOnTheScreen();
    expect(screen.getByTestId('radial-To do')).toHaveAccessibleName('To do Now');
    await fireEvent.press(screen.getByTestId('radial-Done'));
    expect(status(14)).toBe('Done');
  });

  it('the dim closes an open menu without moving', async () => {
    await openTasks('/tasks?view=board');
    await lift(await hold(14));
    await fireEvent.press(screen.getByTestId('radial-dim'));
    await advance(400);
    expect(menu()).not.toBeOnTheScreen();
    expect(status(14)).toBe('To do');
  });

  it('a Member holding someone else’s card gets the reason, not the menu', async () => {
    await openTasks('/tasks?scope=all&view=board', 'member');
    await hold(12);
    expect(menu()).not.toBeOnTheScreen();
    expect(await screen.findByText(/^Only Nico/)).toBeOnTheScreen();
    expect(status(12)).toBe('In progress');
  });

  it('letting go after a hold does not open the task', async () => {
    await openTasks('/tasks?view=board');
    const pan = await hold(14);
    await lift(pan);
    await fireEvent.press(screen.getByTestId('radial-dim'));
    await fireEvent.press(screen.getByTestId('board-card-14'));
    expect(screen).toHavePathname('/tasks');
  });
});

describe('kanban select', () => {
  it('Select picks cards, and holding a picked one moves the group', async () => {
    await openTasks('/tasks?view=board');
    await fireEvent.press(screen.getByTestId('select-To do'));
    await fireEvent.press(screen.getByTestId('board-card-14'));
    await fireEvent.press(screen.getByTestId('board-card-9'));
    expect(screen.getByTestId('board-card-14')).toBeSelected();
    expect(screen).toHavePathname('/tasks');

    const pan = await hold(14);
    expect(menu()).toHaveAccessibleName('Move 2 tasks');
    await slide(pan, -40);
    await lift(pan, -40);
    expect([status(14), status(9)]).toEqual(['Done', 'Done']);
    expect(await screen.findByText('Moved 2 tasks to Done')).toBeOnTheScreen();
  });

  it('select all picks a column, and again clears it', async () => {
    await openTasks('/tasks?view=board');
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
  it('the card action "Move to Done" moves it without the gesture', async () => {
    await openTasks('/tasks?view=board');
    const card = screen.getByTestId('board-card-14');
    expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual([
      'Move to In progress',
      'Move to In review',
      'Move to Done',
    ]);
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'Done' } });
    await waitFor(() => expect(status(14)).toBe('Done'));
  });
});
