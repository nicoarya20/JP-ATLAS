// Task detail and its sheets (port of prototype tasks.detail.actions.test, items.open): a status button changes the
// task in place, Return and Cancel take a reason in their sheet, Move to Archive goes to All tasks with an Undo snack,
// and the sheets turn away who may not use them.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { getTask } from '../../src/data/tasks.state';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

const status = (no: number) => getTask(no)?.status;
const button = (name: string) => screen.getByRole('button', { name });

async function menuItem(name: string) {
  await fireEvent.press(screen.getByTestId('task-menu'));
  await fireEvent.press(await screen.findByText(name));
}

describe('task detail', () => {
  it('Start working moves a To do task to In progress in place', async () => {
    await openTasks('/tasks/14');
    expect(screen.getByTestId('screen-task')).toBeOnTheScreen();
    await fireEvent.press(button('Start working'));
    expect(status(14)).toBe('In progress');
    expect(screen).toHavePathname('/tasks/14');
    expect(button('Mark done')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Start working' })).not.toBeOnTheScreen();
  });

  it('Return needs a reason; a quick pick fills it and the task goes back to In progress', async () => {
    await openTasks('/tasks/17');
    await fireEvent.press(screen.getByTestId('task-return'));
    const sheet = within(await screen.findByTestId('screen-task-return'));
    expect(sheet.getByTestId('return-send')).toBeDisabled();
    await fireEvent.press(sheet.getByRole('button', { name: 'Evidence unclear' }));
    expect(sheet.getByDisplayValue('Evidence unclear')).toBeOnTheScreen();
    await fireEvent.press(sheet.getByTestId('return-send'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/17'));
    expect(status(17)).toBe('In progress');
    expect(await screen.findByText('Task returned')).toBeOnTheScreen();
  });

  it('Cancel takes a reason (a note for Other), then the detail offers Restore', async () => {
    await openTasks('/tasks/14');
    await menuItem('Cancel task');
    const sheet = within(await screen.findByTestId('screen-task-cancel'));
    const send = sheet.getByTestId('cancel-send');
    expect(send).toBeDisabled();
    await fireEvent.press(sheet.getByRole('radio', { name: 'Other' }));
    expect(send).toBeDisabled();
    await fireEvent.press(sheet.getByRole('radio', { name: 'No longer needed' }));
    expect(send).toBeEnabled();
    await fireEvent.press(send);
    await waitFor(() => expect(screen).toHavePathname('/tasks/14'));
    expect(status(14)).toBe('Canceled');
    const note = within(screen.getByTestId('task-note'));
    await fireEvent.press(note.getByRole('button', { name: 'Restore' }));
    expect(status(14)).toBe('To do');
  });

  it('Move to Archive opens All tasks with an Undo snack', async () => {
    await openTasks('/tasks/14');
    await menuItem('Move to Archive');
    await waitFor(() => expect(screen).toHavePathname('/tasks'));
    // The anchor list under a deep-linked task also carries its id, so only the scope is checked.
    expect(
      within(screen.getByTestId('tasks-scope')).getByRole('tab', { name: 'All tasks' }),
    ).toBeSelected();
    expect(screen.queryByTestId('task-card-14')).not.toBeOnTheScreen();
    const snack = within(screen.getByTestId('snack'));
    expect(snack.getByText('Task moved to Archive')).toBeOnTheScreen();
    await fireEvent.press(snack.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Task restored')).toBeOnTheScreen();
    expect(screen.getByTestId('task-card-14')).toBeOnTheScreen();
  });

  it('a task that is gone says so', async () => {
    await openTasks('/tasks/999');
    expect(screen.getByTestId('task-missing')).toBeOnTheScreen();
    expect(screen.getByText('This task is no longer here.')).toBeOnTheScreen();
  });
});

describe('task sheets turn away', () => {
  it('a Member opening Return goes home', async () => {
    await openTasks('/tasks/17/return', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(status(17)).toBe('In review');
  });

  it('Cancel of a task whose menu has no Cancel goes home', async () => {
    await openTasks('/tasks/12/cancel', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});
