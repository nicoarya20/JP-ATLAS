// The Reopen and Cancel sheets of a task's detail against a stubbed /api/app/tasks (tasks-fixtures): Reopen asks for a
// reason of 3 to 200 characters and a refusal stays in the sheet in the server's words; Cancel takes a reason (a note
// for Other) and the detail then says why with Restore; Cancel greyed out by the server says why instead of opening;
// a sheet the server does not allow opens the detail; and Move to Trash from the ⋯ menu acts at once with Undo (T1).
// The detail itself is tasks.screen.detail.test.tsx.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { sheetGone } from '../helpers/sheet-gone';
import { row, tasksServer } from '../helpers/tasks-fixtures';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetTaskStores();
drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
afterEach(() => {
  server?.restore();
  server = null;
});

/** #8 Done on Oct 3, #14 To do. */
const ROWS = [
  row(8, { title: 'Ship the onboarding', status: 'done', dueDate: '2026-10-01' }),
  row(14, { title: 'Write the API spec', dueDate: '2026-10-09' }),
];
const DETAILS = { 8: { completedAt: '2026-10-03T02:00:00.000Z' } };

async function menuItem(name: string) {
  await fireEvent.press(await screen.findByTestId('task-menu'));
  await fireEvent.press(await screen.findByText(name));
}

describe('reopen sheet', () => {
  it('needs a reason of 3 characters, sends it, and the task is In progress again', async () => {
    const tasks = tasksServer(ROWS, { details: DETAILS });
    serve(tasks.routes);
    await openTasks('/tasks/8');
    await fireEvent.press(await screen.findByTestId('task-action-reopen'));
    const sheet = within(await screen.findByTestId('screen-task-reopen'));
    expect(sheet.getByText('#8 Ship the onboarding')).toBeOnTheScreen();
    const send = sheet.getByTestId('reopen-send');
    expect(send).toBeDisabled();
    expect(send.props.accessibilityHint).toBe('Write a reason of at least 3 characters.');
    await fireEvent.changeText(sheet.getByTestId('reopen-reason'), ' ab ');
    expect(send).toBeDisabled();
    expect(sheet.getByText('Write a reason of at least 3 characters.')).toBeOnTheScreen();
    await fireEvent.changeText(sheet.getByTestId('reopen-reason'), '  Login breaks on iOS  ');
    await fireEvent.press(send);
    await sheetGone('screen-task-reopen');
    expect(screen).toHavePathname('/tasks/8');
    expect(await screen.findByText('Task reopened')).toBeOnTheScreen();
    expect(tasks.writes).toEqual([
      { method: 'POST', path: 't-8/reopen', body: { reason: 'Login breaks on iOS' } },
    ]);
    expect(tasks.status(8)).toBe('in_progress');
    expect(
      await screen.findByText('Nico Arya reopened this task: Login breaks on iOS'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('task-action-complete')).toBeOnTheScreen();
  });

  it('keeps a reason past 200 characters to 200', async () => {
    serve(tasksServer(ROWS, { details: DETAILS }).routes);
    await openTasks('/tasks/8');
    await fireEvent.press(await screen.findByTestId('task-action-reopen'));
    const field = await screen.findByTestId('reopen-reason');
    await fireEvent.changeText(field, 'x'.repeat(250));
    expect(screen.getByTestId('reopen-reason').props.value).toHaveLength(200);
  });

  it('a refusal stays in the sheet in the server’s words', async () => {
    const refuse = {
      't-8': {
        status: 403,
        body: { error: 'Hanya pengelola yang boleh membuka ulang.', code: 'FORBIDDEN' },
      },
    };
    const tasks = tasksServer(ROWS, { details: DETAILS, refuse });
    serve(tasks.routes);
    await openTasks('/tasks/8');
    await fireEvent.press(await screen.findByTestId('task-action-reopen'));
    await fireEvent.changeText(await screen.findByTestId('reopen-reason'), 'Needs another pass');
    await fireEvent.press(screen.getByTestId('reopen-send'));
    expect(await screen.findByTestId('reopen-error')).toHaveTextContent(
      'Hanya pengelola yang boleh membuka ulang.',
    );
    expect(screen.getByTestId('screen-task-reopen')).toBeOnTheScreen();
    expect(tasks.status(8)).toBe('done');
  });

  it('opens the detail instead when the server does not offer Reopen', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks/14');
    await screen.findByTestId('task-action-start');
    await act(() => router.push('/tasks/14/reopen'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/14'));
    expect(screen.queryByTestId('screen-task-reopen')).not.toBeOnTheScreen();
  });
});

describe('cancel sheet', () => {
  it('takes a reason, a note for Other; the detail then says why and Restore brings it back', async () => {
    const tasks = tasksServer(ROWS);
    serve(tasks.routes);
    await openTasks('/tasks/14');
    await menuItem('Cancel task');
    const sheet = within(await screen.findByTestId('screen-task-cancel'));
    const send = sheet.getByTestId('cancel-send');
    expect(send).toBeDisabled();
    expect(send.props.accessibilityHint).toBe('Pick why to cancel the task.');
    await fireEvent.press(sheet.getByRole('radio', { name: 'Other' }));
    expect(send).toBeDisabled();
    expect(send.props.accessibilityHint).toBe('Add a note to cancel for Other.');
    await fireEvent.changeText(sheet.getByTestId('cancel-note'), ' Client paused it ');
    await fireEvent.press(send);
    await sheetGone('screen-task-cancel');
    expect(await screen.findByText('Task canceled')).toBeOnTheScreen();
    const note = within(await screen.findByTestId('task-note'));
    expect(note.getByText('Canceled: Other — Client paused it')).toBeOnTheScreen();
    await fireEvent.press(note.getByRole('button', { name: 'Restore' }));
    expect(await screen.findByText('Task restored')).toBeOnTheScreen();
    expect(await screen.findByTestId('task-action-start')).toBeOnTheScreen();
    expect(tasks.writes).toEqual([
      {
        method: 'POST',
        path: 't-14/cancel',
        body: { category: 'other', note: 'Client paused it' },
      },
      { method: 'POST', path: 't-14/uncancel', body: {} },
    ]);
  });

  it('a reason other than Other needs no note', async () => {
    const tasks = tasksServer(ROWS);
    serve(tasks.routes);
    await openTasks('/tasks/14');
    await menuItem('Cancel task');
    const sheet = within(await screen.findByTestId('screen-task-cancel'));
    await fireEvent.press(sheet.getByRole('radio', { name: 'No longer needed' }));
    await fireEvent.press(sheet.getByTestId('cancel-send'));
    await sheetGone('screen-task-cancel');
    expect(tasks.writes).toEqual([
      { method: 'POST', path: 't-14/cancel', body: { category: 'not_needed' } },
    ]);
  });

  it('Cancel greyed out by the server says why instead of opening the sheet', async () => {
    const can = { start: true, cancel: 'PROJECT_IN_TRASH', comment: true } as const;
    serve(tasksServer([row(14, { can })]).routes);
    await openTasks('/tasks/14');
    await menuItem('Cancel task');
    expect(
      await screen.findByText('Its project is in the Trash. Restore the project first.'),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks/14');
  });

  it('opens the detail instead when the server does not offer Cancel', async () => {
    serve(tasksServer(ROWS, { details: DETAILS }).routes);
    await openTasks('/tasks/8');
    await screen.findByTestId('task-action-reopen');
    await act(() => router.push('/tasks/8/cancel'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/8'));
    expect(screen.queryByTestId('screen-task-cancel')).not.toBeOnTheScreen();
  });
});

describe('Move to Trash', () => {
  const trashable = row(14, {
    title: 'Write the API spec',
    can: { update: true, start: true, cancel: true, comment: true, trash: true },
  });

  it('moves at once; the list comes back with Undo, which brings the task back', async () => {
    const tasks = tasksServer([trashable]);
    serve(tasks.routes);
    await openTasks('/tasks/14');
    await menuItem('Move to Trash');
    await waitFor(() => expect(screen).toHavePathname('/tasks'));
    expect(screen.getByText('Task moved to Trash')).toBeOnTheScreen();
    expect(tasks.rows).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Task back from the Trash')).toBeOnTheScreen();
    expect(tasks.writes).toEqual([
      { method: 'DELETE', path: 't-14', body: {} },
      { method: 'POST', path: 'trash/t-14/restore', body: {} },
    ]);
    expect(tasks.rows.map((r) => r.number)).toEqual([14]);
  });

  it('a refusal stays on the task in the server’s words', async () => {
    const refuse = {
      't-14': {
        status: 403,
        body: { error: 'Hanya pembuat tugas yang bisa menghapusnya.', code: 'FORBIDDEN' },
      },
    };
    const tasks = tasksServer([trashable], { refuse });
    serve(tasks.routes);
    await openTasks('/tasks/14');
    await menuItem('Move to Trash');
    expect(
      await screen.findByText('Hanya pembuat tugas yang bisa menghapusnya.'),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks/14');
    expect(tasks.rows).toHaveLength(1);
  });

  it('greyed out by the server says why; not offered, it is not in the menu', async () => {
    const can = { update: true, cancel: true, comment: true, trash: 'PROJECT_IN_TRASH' } as const;
    const tasks = tasksServer([row(14, { can }), row(15)]);
    serve(tasks.routes);
    await openTasks('/tasks/14');
    await menuItem('Move to Trash');
    expect(
      await screen.findByText('Its project is in the Trash. Restore the project first.'),
    ).toBeOnTheScreen();
    expect(tasks.writes).toEqual([]);
    await act(() => router.push('/tasks/15'));
    await fireEvent.press(await screen.findByTestId('task-menu'));
    expect(await screen.findByText('Edit task')).toBeOnTheScreen();
    expect(screen.queryByText('Move to Trash')).not.toBeOnTheScreen();
  });
});
