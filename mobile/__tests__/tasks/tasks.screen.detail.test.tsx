// Task detail and its sheets (port of prototype tasks.detail.actions.test, items.open): a status button changes the
// task in place, Return and Cancel take a reason in their sheet, Move to Archive goes to All tasks with an Undo snack,
// and the sheets turn away who may not use them.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { getTask, getTasksState } from '../../src/data/tasks.state';
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
    // The detail still archives in the sample store; the list it lands on reads the server, so the
    // store is checked here rather than the cards (the detail moves to the server in the next step).
    expect(getTasksState().tasks.some((t) => t.no === 14)).toBe(false);
    const snack = within(screen.getByTestId('snack'));
    expect(snack.getByText('Task moved to Archive')).toBeOnTheScreen();
    await fireEvent.press(snack.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Task restored')).toBeOnTheScreen();
    expect(status(14)).toBe('To do');
  });

  it('a task that is gone says so', async () => {
    await openTasks('/tasks/999');
    expect(screen.getByTestId('task-missing')).toBeOnTheScreen();
    expect(screen.getByText('This task is no longer here.')).toBeOnTheScreen();
  });
});

describe('task detail accessibility', () => {
  it('reads an assignee, an evidence and a history line once each', async () => {
    await openTasks('/tasks/17');
    const facts = within(screen.getByTestId('task-facts'));
    expect(facts.queryAllByLabelText('Dodi Hartono')).toHaveLength(0);
    expect(facts.getAllByText('Dodi Hartono')).toHaveLength(1);
    expect(screen.getAllByRole('image', { name: /^Photo, / }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('image', { name: 'Photo' })).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Dodi started working, Oct 6')).toBeOnTheScreen();
  });

  it('reads the empty tag list as No tags', async () => {
    // #9 has no tags in the sample.
    await openTasks('/tasks/9');
    expect(within(screen.getByTestId('task-facts')).getByLabelText('No tags')).toBeOnTheScreen();
  });
});

describe('task sheets say what is missing', () => {
  it('Return names the missing reason as its hint, and under the reason once touched', async () => {
    await openTasks('/tasks/17/return');
    const send = screen.getByTestId('return-send');
    expect(send.props.accessibilityHint).toBe('Enter a reason to return the task.');
    expect(screen.queryByText('Enter a reason to return the task.')).not.toBeOnTheScreen();
    await fireEvent(screen.getByTestId('return-reason'), 'blur');
    expect(screen.getByText('Enter a reason to return the task.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('return-reason'), 'Needs a screenshot');
    expect(send.props.accessibilityHint).toBeUndefined();
  });

  it('Cancel names Why cancel? as required, and asks for the note once Other is picked', async () => {
    await openTasks('/tasks/14/cancel');
    const send = screen.getByTestId('cancel-send');
    expect(screen.getByLabelText('Why cancel?, required')).toBeOnTheScreen();
    expect(send.props.accessibilityHint).toBe('Pick why to cancel the task.');
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(send.props.accessibilityHint).toBe('Add a note to cancel for Other.');
    expect(screen.getByTestId('cancel-note')).toHaveAccessibleName(
      'Note (required for Other), required',
    );
    await fireEvent(screen.getByTestId('cancel-note'), 'blur');
    expect(screen.getByText('Add a note to cancel for Other.')).toBeOnTheScreen();
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
