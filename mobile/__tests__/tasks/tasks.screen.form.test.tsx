// New task · Fill form and Edit task against a stubbed /api/app/tasks (tasks-fixtures, tasks-form-fixtures): the form
// offers the server's projects, people, kinds and phases; Save sends POST /tasks with what is set and opens the new
// task, or PATCH /tasks/:ref with only what changed and goes back to the detail; a refusal stays on the form in the
// server's words; `can.update` decides whether Edit opens. Just write ✦ has its own file (tasks.screen.write).
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
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

/** #12 in progress for Dodi; #14 To do for Nico, a Bug in Development (detailOf). */
const ROWS = [
  row(12, {
    title: 'Fix SSO login',
    status: 'in_progress',
    assignee: { id: 'u-dodi', name: 'Dodi Hartono' },
  }),
  row(14, { title: 'Write the API spec', dueDate: '2026-10-09' }),
];

const button = (name: string) => screen.getByRole('button', { name });
/** Open the picker `testID` and pick the option labelled `label`. */
async function choose(testID: string, label: string) {
  await fireEvent.press(screen.getByTestId(testID));
  await fireEvent.press(await screen.findByText(label));
}
/** Set the date field `testID` to the ISO day `iso`. */
async function setDate(testID: string, iso: string) {
  await fireEvent.press(screen.getByTestId(testID));
  const [y, m, d] = iso.split('-').map(Number);
  await fireEvent(screen.getByTestId(`${testID}-picker`), 'onChange', {
    nativeEvent: { timestamp: Date.UTC(y, m - 1, d), utcOffset: 0 },
  });
}
async function openForm(url = '/tasks/new/form') {
  await openTasks(url);
  expect(await screen.findByTestId('form-project')).toBeOnTheScreen();
}

describe('new task · fill form', () => {
  it('/tasks/new opens Just write ✦ as a modal, and the switch swaps to Fill form on the same project', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks/new?project=p-sinar');
    expect(await screen.findByTestId('write-project')).toBeOnTheScreen();
    await fireEvent.press(
      within(screen.getByTestId('new-mode')).getByRole('tab', { name: 'Fill form' }),
    );
    expect(await screen.findByTestId('form-project')).toBeOnTheScreen();
    expect(screen).toHavePathname('/tasks/new/form');
    expect(screen.getByTestId('form-project').props.accessibilityValue).toEqual({
      text: 'PT Sinar Website',
    });
  });

  it('opens on the first project; Save waits for a title, sends what is set and opens the new task', async () => {
    const tasks = tasksServer(ROWS);
    serve(tasks.routes);
    await openForm();
    expect(screen.getByTestId('form-project').props.accessibilityValue).toEqual({
      text: 'Atlas Project',
    });
    expect(screen.getByTestId('field-type').props.accessibilityValue).toEqual({ text: 'Task' });
    expect(screen.getByTestId('form-save')).toBeDisabled();
    expect(screen.getByTestId('form-save').props.accessibilityHint).toBe('Enter a title to save.');
    await fireEvent.changeText(screen.getByTestId('field-title'), '  Fix the login page ');
    await fireEvent.press(screen.getByTestId('form-save'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/15'));
    expect(tasks.writes).toEqual([
      {
        method: 'POST',
        path: '',
        body: {
          projectId: 'p-atlas',
          title: 'Fix the login page',
          priority: 'medium',
          startDate: '2026-10-07',
          kindId: 'k-task',
        },
      },
    ]);
    expect(await screen.findByText('Task created')).toBeOnTheScreen();
  });

  it('sends the assignee, priority, due date, type, phase and description picked', async () => {
    const tasks = tasksServer(ROWS);
    serve(tasks.routes);
    await openForm();
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Fix the login page');
    await waitFor(() => expect(screen.getByTestId('field-assignee')).toBeEnabled());
    await fireEvent.press(screen.getByTestId('field-assignee'));
    // Managers and Members only: Rina only watches Atlas.
    expect(await screen.findByText('Dodi Hartono')).toBeOnTheScreen();
    expect(screen.queryByText('Rina Wulandari')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Dodi Hartono'));
    await fireEvent.press(button('High'));
    await setDate('field-due', '2026-10-14');
    await choose('field-type', 'Bug');
    await choose('field-phase', 'Design');
    await fireEvent.changeText(screen.getByTestId('field-description'), ' Safari only. ');
    await fireEvent.press(screen.getByTestId('form-save'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/15'));
    expect(tasks.writes[0]?.body).toEqual({
      projectId: 'p-atlas',
      title: 'Fix the login page',
      priority: 'high',
      assigneeId: 'u-dodi',
      dueDate: '2026-10-14',
      startDate: '2026-10-07',
      kindId: 'k-bug',
      phaseId: 'ph-design',
      description: 'Safari only.',
    });
    expect(tasks.rows.find((r) => r.number === 15)).toMatchObject({
      assignee: { id: 'u-dodi' },
      phase: { id: 'ph-design' },
    });
  });

  it('another project drops the assignee and the phase, and hides Phase when it has none', async () => {
    const tasks = tasksServer(ROWS);
    serve(tasks.routes);
    await openForm('/tasks/new/form?project=p-atlas');
    await waitFor(() => expect(screen.getByTestId('field-assignee')).toBeEnabled());
    await choose('field-assignee', 'Dodi Hartono');
    await choose('field-phase', 'Design');
    await choose('form-project', 'PT Sinar Website');
    expect(screen.queryByTestId('field-phase')).not.toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('field-assignee')).toBeEnabled());
    expect(screen.getByTestId('field-assignee').props.accessibilityValue).toEqual({
      text: 'Unassigned',
    });
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Landing copy');
    await fireEvent.press(screen.getByTestId('form-save'));
    await waitFor(() => expect(tasks.writes).toHaveLength(1));
    expect(tasks.writes[0]?.body).toMatchObject({ projectId: 'p-sinar', kindId: 'k-sinar-task' });
    expect(tasks.writes[0]?.body).not.toHaveProperty('assigneeId');
    expect(tasks.writes[0]?.body).not.toHaveProperty('phaseId');
  });

  it('a start after the due date keeps Save off and says why', async () => {
    serve(tasksServer(ROWS).routes);
    await openForm();
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Fix the login page');
    await setDate('field-due', '2026-10-05');
    expect(screen.getByTestId('form-save')).toBeDisabled();
    expect(screen.getByTestId('form-save').props.accessibilityHint).toBe(
      "The start date can't be after the due date.",
    );
  });

  it('a refusal stays on the form in the server’s words', async () => {
    const refuse = {
      create: {
        status: 403,
        body: { error: 'Kamu tidak bisa menambah tugas di proyek ini.', code: 'FORBIDDEN' },
      },
    };
    serve(tasksServer(ROWS, { refuse }).routes);
    await openForm();
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Fix the login page');
    await fireEvent.press(screen.getByTestId('form-save'));
    expect(await screen.findByTestId('form-error')).toHaveTextContent(
      'Kamu tidak bisa menambah tugas di proyek ini.',
    );
    expect(screen).toHavePathname('/tasks/new/form');
  });

  it('says so when there is no project to add a task to', async () => {
    serve(tasksServer(ROWS, { formProjects: [] }).routes);
    await openTasks('/tasks/new/form');
    expect(await screen.findByTestId('form-no-projects')).toBeOnTheScreen();
    expect(screen.getByText('No project to add a task to')).toBeOnTheScreen();
  });

  it('a failed load offers Try again', async () => {
    const tasks = tasksServer(ROWS);
    // Same key, so it keeps its place ahead of `/api/app/tasks` and only the answer changes.
    const s = serve({
      ...tasks.routes,
      '/api/app/tasks/form-options': {
        status: 500,
        body: { error: 'Server sibuk.', code: 'INTERNAL' },
      },
    });
    await openTasks('/tasks/new/form');
    expect(await screen.findByTestId('form-failed')).toBeOnTheScreen();
    expect(screen.getByText('Server sibuk.')).toBeOnTheScreen();
    s.use(tasks.routes);
    await fireEvent.press(button('Try again'));
    expect(await screen.findByTestId('form-project')).toBeOnTheScreen();
  });

  it('names its controls once, without the stars, and has no Needs review yet', async () => {
    serve(tasksServer(ROWS).routes);
    await openForm();
    expect(screen.getByTestId('form-project')).toHaveAccessibleName('Project, required');
    expect(screen.queryByText('Project *')).not.toBeOnTheScreen();
    expect(screen.getByText('Project *', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('field-type')).toHaveAccessibleName('Type');
    expect(screen.queryByRole('switch', { name: 'Needs review' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('form-more'));
    expect(screen.getByTestId('form-more')).toBeCollapsed();
    expect(screen.queryByTestId('field-type')).not.toBeOnTheScreen();
  });
});

describe('edit task', () => {
  /** Edit task from the detail's ⋯ menu, so Save goes back to the detail. */
  async function openEdit(no: number) {
    await openTasks(`/tasks/${no}`);
    await fireEvent.press(await screen.findByTestId('task-menu'));
    await fireEvent.press(await screen.findByText('Edit task'));
    expect(await screen.findByTestId('edit-save')).toBeOnTheScreen();
  }

  it('opens prefilled and keeps Save off until something changed', async () => {
    serve(tasksServer(ROWS).routes);
    await openEdit(14);
    expect(screen.getByText('#14 · Atlas Project · To do')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Write the API spec')).toBeOnTheScreen();
    expect(screen.getByTestId('field-phase').props.accessibilityValue).toEqual({
      text: 'Development',
    });
    expect(screen.getByTestId('edit-save')).toBeDisabled();
    expect(screen.getByTestId('edit-save').props.accessibilityHint).toBe(
      'Change something to save.',
    );
    await fireEvent.changeText(screen.getByTestId('field-title'), '  ');
    expect(screen.getByTestId('edit-save').props.accessibilityHint).toBe('Enter a title to save.');
  });

  it('sends only what changed, and the detail shows it from the server', async () => {
    const tasks = tasksServer(ROWS);
    serve(tasks.routes);
    await openEdit(14);
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Write the API spec v2 ');
    await fireEvent.press(button('High'));
    await waitFor(() => expect(screen.getByTestId('field-assignee')).toBeEnabled());
    await choose('field-assignee', 'Dodi Hartono');
    await choose('field-phase', 'No phase');
    await fireEvent.press(screen.getByTestId('edit-save'));
    await waitFor(() => expect(screen).toHavePathname('/tasks/14'));
    expect(tasks.writes).toEqual([
      {
        method: 'PATCH',
        path: 't-14',
        body: {
          title: 'Write the API spec v2',
          assigneeId: 'u-dodi',
          priority: 'high',
          phaseId: null,
        },
      },
    ]);
    expect(await screen.findByText('Task updated')).toBeOnTheScreen();
    expect((await screen.findAllByText('Write the API spec v2')).length).toBeGreaterThan(0);
  });

  it('a refusal stays on the form in the server’s words', async () => {
    const refuse = {
      't-14': {
        status: 422,
        body: { error: 'Penanggung jawab harus anggota proyek.', code: 'VALIDATION' },
      },
    };
    serve(tasksServer(ROWS, { refuse }).routes);
    await openEdit(14);
    await fireEvent.changeText(screen.getByTestId('field-title'), 'Write the API spec v2');
    await fireEvent.press(screen.getByTestId('edit-save'));
    expect(await screen.findByTestId('edit-error')).toHaveTextContent(
      'Penanggung jawab harus anggota proyek.',
    );
    expect(screen).toHavePathname('/tasks/14/edit');
  });

  const TRASHED = [row(14, { can: { update: 'PROJECT_IN_TRASH' } })];
  const REASON = 'Its project is in the Trash. Restore the project first.';

  it('the menu says why the server will not let you edit the task', async () => {
    serve(tasksServer(TRASHED).routes);
    await openTasks('/tasks/14');
    await fireEvent.press(await screen.findByTestId('task-menu'));
    await fireEvent.press(await screen.findByText('Edit task'));
    expect(await screen.findByRole('alert')).toHaveTextContent(REASON);
    expect(screen).toHavePathname('/tasks/14');
  });

  it('opened anyway, Edit task gives the reason and Back', async () => {
    serve(tasksServer(TRASHED).routes);
    await openTasks('/tasks/14/edit');
    expect(await screen.findByTestId('task-edit-denied')).toBeOnTheScreen();
    expect(screen.getByText("You can't edit this task")).toBeOnTheScreen();
    expect(screen.getByText(REASON)).toBeOnTheScreen();
    // The header's back and the foot's Back.
    expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(2);
  });

  it('says so when the task’s project is out of the form’s reach', async () => {
    const gone = { id: 'p-gone', name: 'Old Project', status: 'active' };
    serve(tasksServer([row(14, { project: gone })]).routes);
    await openTasks('/tasks/14/edit');
    expect(await screen.findByTestId('task-edit-no-project')).toBeOnTheScreen();
  });

  it('says so when the task is not there', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks/99/edit');
    expect(await screen.findByTestId('task-edit-missing')).toBeOnTheScreen();
  });
});
