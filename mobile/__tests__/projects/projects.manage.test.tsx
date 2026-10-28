// Projects ⑫–⑭ still on the sample data (port of prototype projects.edit.test / projects.archive.test): Edit saves
// and renames the project's tasks, Extend needs a reason; a Member is sent away from edit, extend and archive. Member
// changes and Move to Trash go to the server in the writes stage, with their tests.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { findProject } from '../../src/data/projects.store';
import { getTasksState } from '../../src/data/tasks.store';
import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));

describe('Edit project', () => {
  it('Save changes is off without a name; saving renames the project on its tasks', async () => {
    await openProjects('/projects/atlas/edit');
    const name = screen.getByLabelText('Project name, required');
    await fireEvent.changeText(name, ' ');
    expect(button('Save changes')).toBeDisabled();
    await fireEvent.changeText(name, 'Atlas v2');
    await press('Save changes');
    expect(screen.getByText('Project updated')).toBeOnTheScreen();
    expect(findProject('atlas')?.name).toBe('Atlas v2');
    const tasks = getTasksState().tasks;
    expect(tasks.some((t) => t.project === 'Atlas v2')).toBe(true);
    expect(tasks.some((t) => t.project === 'Atlas Project')).toBe(false);
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/edit', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Extend deadline', () => {
  it('Save waits for a reason, then says Deadline extended', async () => {
    await openProjects('/projects/atlas/extend');
    const sheet = within(screen.getByTestId('project-extend'));
    await fireEvent.changeText(sheet.getByLabelText('Reason, required'), '');
    expect(sheet.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fireEvent.changeText(sheet.getByLabelText('Reason, required'), 'Client asked');
    await fireEvent.press(sheet.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Deadline extended')).toBeOnTheScreen();
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/extend', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Move to Archive', () => {
  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/archive', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});
