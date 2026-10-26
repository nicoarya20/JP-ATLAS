import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { deleteForever, getArchive, getArchiveDelete } from '../../src/data/archive';
import { findEntry, listEntries, removeEntry, resetArchive } from '../../src/data/archive.store';
import * as events from '../../src/data/events.store';
import {
  archiveProject,
  canRestoreProject,
  listArchivedProjects,
  resetProjects,
  restoreProject,
} from '../../src/data/projects.store';
import type { Role } from '../../src/data/sample';
import * as tasks from '../../src/data/tasks.store';
import { ArchiveScreen } from '../../src/screens/archive/archive.screen';
import { DeleteScreen } from '../../src/screens/archive/delete.screen';
import { Providers } from '../helpers/providers';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

beforeEach(() => {
  resetArchive();
  resetProjects();
  tasks.resetTasks();
  jest.clearAllMocks();
});
afterAll(() => jest.restoreAllMocks());

describe('archive data', () => {
  test('chips count each kind; a filter narrows the cards', () => {
    const all = listEntries();
    const d = getArchive('pm', all, 'TASK');
    expect(d.chips[0]).toBe(`All ${all.length}`);
    expect(d.cards.every((c) => c.kind === 'TASK')).toBe(true);
    expect(d.count).toBe(`${d.cards.length} items`);
    expect(d.canDelete).toBe(false);
    expect(getArchive('admin', all).canDelete).toBe(true);
  });

  test('the delete message names what goes along', () => {
    expect(getArchiveDelete('project-senior-app-trial')?.message).toBe(
      'Project “Senior app trial” with 8 tasks and 2 events will be gone for good. This cannot be undone.',
    );
    expect(getArchiveDelete('nope')).toBeNull();
  });

  test('deleteForever: the holding module forgets a task or an event, then the entry leaves', () => {
    const forgetTask = jest.spyOn(tasks, 'forgetArchivedTask');
    const forgetEvent = jest.spyOn(events, 'forgetArchivedEvent');
    deleteForever('task-21');
    expect(forgetTask).toHaveBeenCalledWith('task-21');
    deleteForever('event-test-meeting');
    expect(forgetEvent).toHaveBeenCalledWith('event-test-meeting');
    expect(findEntry('task-21')).toBeUndefined();
    expect(findEntry('event-test-meeting')).toBeUndefined();
  });

  test('deleteForever: an archived project and its tasks are forgotten, so its Undo is over', () => {
    const atlas = tasks.getTasksState().tasks.filter((t) => t.project === 'Atlas Project');
    expect(atlas.length).toBeGreaterThan(0);
    const key = archiveProject('atlas', 'Nico');
    deleteForever(key);
    expect(findEntry(key)).toBeUndefined();
    expect(listArchivedProjects().map((p) => p.id)).not.toContain('atlas');
    expect(canRestoreProject('atlas', key)).toBe(false);
    for (const t of atlas) expect(tasks.getTask(t.no)).toBeUndefined();
    expect(tasks.getTasksState().tasks.some((t) => t.project === 'Atlas Project')).toBe(false);
    expect(() => restoreProject('atlas', key)).toThrow('not in Archive');
  });

  test('deleteForever: a sample project only leaves Archive; an unknown key throws with context', () => {
    const forgetTask = jest.spyOn(tasks, 'forgetArchivedTask');
    deleteForever('project-senior-app-trial');
    expect(findEntry('project-senior-app-trial')).toBeUndefined();
    expect(forgetTask).not.toHaveBeenCalled();
    expect(() => deleteForever('nope')).toThrow('Cannot delete nope forever: it is not in Archive');
  });
});

describe('ArchiveScreen', () => {
  const show = (role: Role) => render(<ArchiveScreen role={role} />, { wrapper: Providers });

  test('PM: cards with Restore, no Delete forever', async () => {
    await show('pm');
    expect(screen.getByTestId('archive-task-21')).toBeOnTheScreen();
    expect(
      screen.queryByLabelText('Delete forever: #21 Duplicate login test'),
    ).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Restore: #21 Duplicate login test'));
    expect(screen.getByText('Restored')).toBeOnTheScreen();
  });

  test('Admin: Delete forever opens the sheet for that entry', async () => {
    await show('admin');
    await fireEvent.press(screen.getByLabelText('Delete forever: #21 Duplicate login test'));
    expect(router.push).toHaveBeenCalledWith('/more/archive/task-21/delete');
  });

  test('a kind chip narrows the list', async () => {
    await show('pm');
    await fireEvent.press(screen.getByText(/^Projects \d+$/));
    expect(screen.queryByTestId('archive-task-21')).not.toBeOnTheScreen();
    expect(screen.getByTestId('archive-project-senior-app-trial')).toBeOnTheScreen();
  });

  test('nothing archived: the empty state', async () => {
    for (const e of listEntries()) removeEntry(e.key);
    await show('pm');
    expect(screen.getByTestId('archive-empty')).toBeOnTheScreen();
    expect(screen.getByText('Archive is empty')).toBeOnTheScreen();
  });
});

describe('DeleteScreen · T3', () => {
  const show = (key: string, role: Role = 'admin') =>
    render(<DeleteScreen entryKey={key} role={role} />, { wrapper: Providers });
  const action = () => screen.getByTestId('confirm-action');

  test('locked until the exact title is typed; then it deletes, says so and closes', async () => {
    await show('task-19');
    expect(screen.getByText('Task · #19 Revise the button color')).toBeOnTheScreen();
    expect(action().props.accessibilityState).toMatchObject({ disabled: true });
    const field = screen.getByLabelText('Type the item name to confirm');
    await fireEvent.changeText(field, '#19 revise the button color');
    expect(action().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(field, '#19 Revise the button color');
    expect(action().props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(action());
    expect(findEntry('task-19')).toBeUndefined();
    expect(screen.getByText('Deleted forever')).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalled();
  });

  test('not an Admin: only the note and Cancel', async () => {
    await show('task-19', 'pm');
    expect(
      screen.getByText('Only an Admin can delete forever. Others can only restore.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('confirm-action')).not.toBeOnTheScreen();
  });

  test('an entry already gone says so', async () => {
    await show('nope');
    expect(screen.getByText('This item is no longer in Archive.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Cancel'));
    expect(router.back).toHaveBeenCalled();
  });
});
