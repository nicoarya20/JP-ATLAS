// Edit task and New task (port of prototype tasks.edit.test / tasks.form.test, items.open): tags are lowercase without
// duplicates, Save writes the task and goes back; Fill form starts from the first AI draft, Show more folds the extra
// fields, Save opens the new task; Just write ✦ and Import CSV are modals; a Member may not edit someone else's task.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { getTask, getTasksState } from '../../src/data/tasks.state';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

const button = (name: string) => screen.getByRole('button', { name });

/** Edit task the way it is reached: from the detail's ⋯ menu, so Save goes back to the detail. */
async function openEdit(no: number) {
  await openTasks(`/tasks/${no}`);
  await fireEvent.press(screen.getByTestId('task-menu'));
  await fireEvent.press(await screen.findByText('Edit task'));
  expect(await screen.findByTestId('screen-task-edit')).toBeOnTheScreen();
}

describe('edit task', () => {
  it('adds tags lowercase and once, removes one, and Save writes the task and goes back', async () => {
    await openEdit(14);
    expect(screen.getByText('#14 · Atlas Project · To do')).toBeOnTheScreen();
    const box = screen.getByLabelText('Add tag');
    await fireEvent.changeText(box, 'Backend ');
    await fireEvent(box, 'submitEditing');
    await fireEvent.changeText(box, 'backend');
    await fireEvent(box, 'submitEditing');
    expect(screen.getAllByRole('button', { name: 'Remove tag backend' })).toHaveLength(1);
    await fireEvent.press(button('Remove tag api'));
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Write the API spec v2');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/14'));
    expect(getTask(14)).toMatchObject({ title: 'Write the API spec v2', tags: ['backend'] });
    expect(await screen.findByText('Task updated')).toBeOnTheScreen();
  });

  it('Save needs a title and an assignee', async () => {
    await openTasks('/tasks/14/edit');
    await fireEvent.changeText(screen.getByTestId('field-title'), '  ');
    expect(screen.getByTestId('edit-save')).toBeDisabled();
  });

  it('adds and removes steps', async () => {
    await openEdit(14);
    await fireEvent.press(button('+ Add step'));
    await fireEvent.press(button('+ Add step'));
    await fireEvent.changeText(screen.getByLabelText('Step 1'), 'Draft the endpoints');
    await fireEvent.press(button('Remove step 2'));
    expect(screen.queryByLabelText('Step 2')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/14'));
    expect(getTasksState().info[14]?.steps).toEqual([{ text: 'Draft the endpoints', done: false }]);
  });

  it('a Member editing a teammate’s task gets the reason and Back', async () => {
    await openTasks('/tasks/12/edit', 'member');
    expect(screen.getByTestId('task-edit-denied')).toBeOnTheScreen();
    expect(screen.getByText("You can't edit this task")).toBeOnTheScreen();
    // The header's back and the foot's Back.
    expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(2);
  });
});

describe('new task', () => {
  it('/tasks/new opens Just write ✦ as a modal, and the switch swaps to Fill form', async () => {
    await openTasks('/tasks/new');
    expect(screen.getByTestId('screen-task-write')).toBeOnTheScreen();
    expect(screen.getAllByTestId('write-draft')).toHaveLength(2);
    expect(button('Save 2 tasks')).toBeOnTheScreen();
    await fireEvent.press(
      within(screen.getByTestId('new-mode')).getByRole('tab', { name: 'Fill form' }),
    );
    expect(await screen.findByTestId('screen-task-form')).toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks/new/form');
  });

  it('Fill form starts from the first draft; Show less hides the extras', async () => {
    await openTasks('/tasks/new/form');
    expect(screen.getByDisplayValue('Fix the login page')).toBeOnTheScreen();
    expect(
      screen.getByText('Needs review starts from the project setting (Atlas: off).'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('form-more'));
    expect(screen.queryByLabelText('Estimated hours')).not.toBeOnTheScreen();
    expect(screen.getByTestId('form-more')).toBeCollapsed();
  });

  it('Save adds a To do task and opens its detail', async () => {
    const before = getTasksState().tasks.length;
    await openTasks('/tasks/new/form');
    await fireEvent.press(screen.getByTestId('form-save'));
    await waitFor(() => expect(screen.getByTestId('screen-task')).toBeOnTheScreen());
    const added = getTasksState().tasks.find((t) => t.title === 'Fix the login page');
    expect(getTasksState().tasks.length).toBe(before + 1);
    expect(added?.status).toBe('To do');
    expect(screen).toHavePathname(`/tasks/${added?.no}`);
  });

  it('/tasks/csv previews the rows as cards and imports the ready ones', async () => {
    await openTasks('/tasks/csv');
    expect(screen.getByText('4 ready (1 with a note) · 1 error')).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^csv-row-/)).toHaveLength(5);
    await fireEvent.press(screen.getByTestId('csv-import'));
    await waitFor(() => expect(screen).toHavePathname('/tasks'));
    expect(await screen.findByText('Tasks imported')).toBeOnTheScreen();
  });
});
