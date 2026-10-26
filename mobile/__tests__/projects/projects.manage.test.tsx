// Projects ⑫–⑭ (port of prototype projects.edit.test / projects.archive.test): Edit saves and renames the project's
// tasks, Extend needs a reason, member role and removal ask first (T2), Move to Archive returns to the list with Undo
// (T1), Undo after Delete forever says so; a Member is sent away from edit, extend and archive.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { deleteForever } from '../../src/data/archive';
import { listEntries } from '../../src/data/archive.store';
import { findProject, listArchivedProjects } from '../../src/data/projects.store';
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

describe('Members tab', () => {
  it('a role change asks first, then saves', async () => {
    await openProjects('/projects/atlas?tab=members');
    await press('Project role of Dodi');
    // the picker's options sit under its trigger, so its Viewer comes before the "What roles mean" one
    await waitFor(() => expect(screen.getAllByText('Viewer')).toHaveLength(2));
    const viewer = screen.getAllByText('Viewer')[0];
    if (!viewer) throw new Error('the role picker shows no Viewer option');
    await fireEvent.press(viewer);
    const dialog = within(await screen.findByTestId('member-confirm'));
    expect(dialog.getByText("Change Dodi's role?")).toBeOnTheScreen();
    await fireEvent.press(dialog.getByTestId('confirm-action'));
    expect(await screen.findByText('Role changed')).toBeOnTheScreen();
    expect(findProject('atlas')?.roles.Dodi).toBe('Viewer');
  });

  it('Remove asks first; Cancel keeps the member, Remove member takes them out', async () => {
    await openProjects('/projects/atlas?tab=members');
    expect(button('Remove Nico')).toBeDisabled();
    // the Lead's role select is off too, and says why
    expect(button('Project role of Nico')).toBeDisabled();
    expect(button('Project role of Nico').props.accessibilityHint).toBe(
      "The Lead stays Manager and can't be removed.",
    );
    expect(button('Project role of Dodi').props.accessibilityHint).toBeUndefined();
    await press('Remove Dodi');
    const dialog = within(await screen.findByTestId('member-confirm'));
    expect(dialog.getByText('Remove Dodi from the project?')).toBeOnTheScreen();
    await fireEvent.press(dialog.getByTestId('confirm-action'));
    expect(await screen.findByText('Member removed')).toBeOnTheScreen();
    expect(findProject('atlas')?.members).not.toContain('Dodi');
    expect(screen.queryByTestId('member-Dodi')).not.toBeOnTheScreen();
  });
});

describe('Move to Archive', () => {
  async function archiveAtlas() {
    await openProjects('/projects/atlas');
    await fireEvent.press(screen.getByTestId('project-actions'));
    await fireEvent.press(await screen.findByText('Move to Archive'));
    const sheet = within(screen.getByTestId('project-archive'));
    expect(
      sheet.getByText(/^“Atlas Project” and its \d+ tasks leave every list/),
    ).toBeOnTheScreen();
    await fireEvent.press(sheet.getByRole('button', { name: 'Move to Archive' }));
    await waitFor(() => expect(screen).toHavePathname('/projects'));
  }

  it('returns to the list with Undo, which brings the project and its tasks back', async () => {
    await archiveAtlas();
    expect(screen.queryByTestId('project-card-atlas')).not.toBeOnTheScreen();
    expect(screen.getByText('Project moved to Archive')).toBeOnTheScreen();
    expect(getTasksState().tasks.some((t) => t.project === 'Atlas Project')).toBe(false);
    await press('Undo');
    expect(screen.getByTestId('project-card-atlas')).toBeOnTheScreen();
    expect(screen.getByText('Project restored')).toBeOnTheScreen();
    expect(getTasksState().tasks.some((t) => t.project === 'Atlas Project')).toBe(true);
  });

  it('Undo after Archive deleted the project forever says so and restores nothing', async () => {
    await archiveAtlas();
    const entry = listEntries().find((x) => x.ref === 'atlas');
    if (!entry) throw new Error('archiving atlas wrote no Archive entry');
    await act(async () => deleteForever(entry.key));
    expect(listEntries().some((x) => x.ref === 'atlas')).toBe(false);
    expect(listArchivedProjects().map((p) => p.id)).not.toContain('atlas');
    await press('Undo');
    expect(
      screen.getByText("This project was deleted forever and can't be restored."),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('project-card-atlas')).not.toBeOnTheScreen();
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/atlas/archive', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Project settings', () => {
  it('opens the Tasks settings of the project from the ⋯ menu', async () => {
    await openProjects('/projects/atlas');
    await fireEvent.press(screen.getByTestId('project-actions'));
    await fireEvent.press(await screen.findByText('Project settings'));
    await waitFor(() => expect(screen).toHavePathname('/projects/atlas/settings'));
  });
});
