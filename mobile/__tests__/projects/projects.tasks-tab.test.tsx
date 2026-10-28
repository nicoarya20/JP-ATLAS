// A project's Tasks tab (projects.tabs.jsx ProjectsTasks) against a stubbed `GET /api/app/tasks?scope=project`: only
// that project's tasks, a card's button taking the server's step or opening the task, the empty and no-match states,
// the board moving on the server, and + New task following the project's `can.createTask` (shown, greyed out with the
// server's reason, or absent). Every request is stubbed; the test clock's today is Wed Oct 7, 2026.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { capMessage } from '../../src/data/caps.messages';
import { resetProjectsQuery } from '../../src/data/projects.api';
import type { ProjectCapsWire, ProjectDetailWire } from '../../src/data/projects.wire';
import { forgetAllResources } from '../../src/data/resource';
import { resetQueries } from '../../src/data/tasks.query-state';
import { ProjectDetailScreen } from '../../src/screens/projects/detail/project-detail.screen';
import { type AuthReply, serveAuth } from '../helpers/auth-server';
import { atlasDetail, atlasRoutes } from '../helpers/projects-fixtures';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { DODI, listCalls, row, SINAR, tasksServer } from '../helpers/tasks-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());
drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
let tasks: ReturnType<typeof tasksServer>;

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
  resetQueries();
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

/** Atlas: To do #14 (Start working), In progress #12 (Mark done), Dodi's In review #17 (View); Sinar's #9. */
const ROWS = [
  row(14, { title: 'Write the API spec', dueDate: '2026-10-08', primary: 'start' }),
  row(12, {
    title: 'Fix SSO login',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-10-05',
    primary: 'complete',
  }),
  row(17, { title: 'Fix the save button', status: 'in_review', assignee: DODI }),
  row(9, { title: 'Update the landing page', project: SINAR }),
];

/** Serve the Atlas detail and the task lists, then open its Tasks tab (`view` = list unless given). */
async function open({
  rows = ROWS,
  detail = atlasDetail(),
  view,
}: {
  rows?: typeof ROWS;
  detail?: ProjectDetailWire;
  view?: 'board';
} = {}) {
  tasks = tasksServer(rows);
  server = serveAuth({
    ...atlasRoutes(detail),
    ...tasks.routes,
    // The overview's own reads are not made on this tab: every list here is the project's.
    '/api/app/tasks?': tasks.routes['/api/app/tasks'],
  });
  setParams({ id: 'p-atlas', tab: 'tasks', ...(view ? { view } : {}) });
  await render(<ProjectDetailScreen />, { wrapper: Providers });
  await screen.findByTestId('project-task-tools');
}
const lists = () => listCalls(server?.calls ?? []);
/** The detail with `can.createTask` as given; undefined = the server left it out (hidden, E-6). */
const withCreate = (createTask: true | string | undefined) => {
  const { createTask: _, ...rest } = atlasDetail().can;
  // test-only: the wire type lists every cap, but the server may leave one out.
  const can = (createTask === undefined ? rest : { ...rest, createTask }) as ProjectCapsWire;
  return atlasDetail({ can });
};

describe('list', () => {
  test("only this project's tasks, asked as scope=project, with their count", async () => {
    await open();
    expect(await screen.findByTestId('project-task-14')).toBeOnTheScreen();
    expect(screen.getByTestId('project-task-12')).toBeOnTheScreen();
    expect(screen.getByTestId('project-task-17')).toBeOnTheScreen();
    expect(screen.queryByTestId('project-task-9')).not.toBeOnTheScreen();
    expect(screen.getByText('3 tasks')).toBeOnTheScreen();
    expect(lists()).toEqual([
      'scope=project&projectId=p-atlas&status=todo&status=in_progress&status=in_review&sort=due',
    ]);
    expect(screen.getByText('High · Nico Arya · Oct 5 · 2 days late')).toBeOnTheScreen();
  });

  test("a card's button takes the server's step and says so; the list is asked again", async () => {
    await open();
    const start = await screen.findByTestId('project-task-14-action');
    expect(start).toHaveAccessibleName('Start working #14 Write the API spec');
    expect(screen.getByTestId('project-task-12-action')).toHaveAccessibleName(
      'Mark done #12 Fix SSO login',
    );
    await fireEvent.press(start);
    expect(await screen.findByText('Task started')).toBeOnTheScreen();
    expect(tasks.writes).toEqual([{ method: 'POST', path: 't-14/start', body: {} }]);
    expect(tasks.status(14)).toBe('in_progress');
    await waitFor(() => expect(lists().length).toBeGreaterThan(1));
  });

  test('a card with no step it can take offers View; the card and View open the task', async () => {
    await open();
    const view = await screen.findByTestId('project-task-17-action');
    expect(view).toHaveAccessibleName('View #17 Fix the save button');
    await fireEvent.press(view);
    expect(router.push).toHaveBeenCalledWith('/tasks/17');
    await fireEvent.press(
      within(screen.getByTestId('project-task-14')).getByRole('button', {
        name: '#14 Write the API spec, To do, Medium, Nico Arya, Oct 8',
      }),
    );
    expect(router.push).toHaveBeenCalledWith('/tasks/14');
    expect(tasks.writes).toEqual([]);
  });

  test('a project with no tasks says so, with + New task when the server allows it', async () => {
    await open({ rows: [] });
    const empty = await screen.findByTestId('project-tasks-empty');
    expect(within(empty).getByText('No tasks in this project yet')).toBeOnTheScreen();
    await fireEvent.press(within(empty).getByRole('button', { name: '+ New task' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/tasks/new/form',
      params: { project: 'p-atlas' },
    });
  });

  test('a search that leaves nothing shows NoMatch; Reset clears it and the tasks come back', async () => {
    await open();
    await screen.findByTestId('project-task-14');
    await fireEvent.changeText(screen.getByLabelText('Search title or #number…'), 'zzz');
    expect(await screen.findByText('No tasks match these filters.')).toBeOnTheScreen();
    expect(lists().at(-1)).toContain('q=zzz');
    await fireEvent.press(within(screen.getByTestId('no-match')).getByRole('button'));
    expect(await screen.findByTestId('project-task-14')).toBeOnTheScreen();
    expect(screen.getByLabelText('Search title or #number…').props.value).toBe('');
  });

  test("a failed list shows the server's sentence and Try again asks again", async () => {
    tasks = tasksServer(ROWS);
    const list = tasks.routes['/api/app/tasks'] as (url: string) => AuthReply;
    let fail = true;
    server = serveAuth({
      ...atlasRoutes(),
      ...tasks.routes,
      '/api/app/tasks?': (url: string) =>
        fail
          ? { status: 500, body: { error: 'Server sedang sibuk.', code: 'INTERNAL' } }
          : list(url),
    });
    setParams({ id: 'p-atlas', tab: 'tasks' });
    await render(<ProjectDetailScreen />, { wrapper: Providers });
    const failed = await screen.findByTestId('project-tasks-failed');
    expect(within(failed).getByText('Server sedang sibuk.')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(within(failed).getByRole('button'));
    expect(await screen.findByTestId('project-task-14')).toBeOnTheScreen();
  });

  test('the filter opens the project task filter; List / Kanban sets the view', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: /filter/i }));
    expect(router.push).toHaveBeenCalledWith('/projects/p-atlas/task-filter');
    await fireEvent.press(
      within(screen.getByTestId('project-task-view')).getByRole('radio', { name: 'Kanban' }),
    );
    expect(router.setParams).toHaveBeenCalledWith({ view: 'board' });
  });
});

describe('board', () => {
  test("the project's columns, asked one status each; a named move takes the step on the server", async () => {
    await open({ view: 'board' });
    const card = await screen.findByTestId('board-card-14');
    expect(screen.queryByTestId('board-card-9')).not.toBeOnTheScreen();
    expect(lists()).toEqual(
      ['todo', 'in_progress', 'in_review', 'done'].map(
        (s) => `scope=project&projectId=p-atlas&status=${s}&sort=due`,
      ),
    );
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: 'Done' } });
    await waitFor(() => expect(tasks.status(14)).toBe('done'));
  });

  test("Add task goes to the form on this project, only when the project's cap allows it", async () => {
    await open({ view: 'board' });
    await fireEvent.press(await screen.findByTestId('add-task-To do'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/tasks/new/form',
      params: { project: 'p-atlas' },
    });
  });

  test('no Add task when the project does not allow adding', async () => {
    await open({ view: 'board', detail: withCreate('IMPERSONATING') });
    await screen.findByTestId('board-card-14');
    expect(screen.queryByTestId('add-task-To do')).not.toBeOnTheScreen();
  });
});

describe('+ New task', () => {
  test('allowed: opens New task · Fill form on this project', async () => {
    await open();
    await fireEvent.press(screen.getByTestId('project-new-task'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/tasks/new/form',
      params: { project: 'p-atlas' },
    });
  });

  test("refused: greyed out, with the server's reason in words", async () => {
    await open({ detail: withCreate('IMPERSONATING') });
    const button = screen.getByTestId('project-new-task');
    expect(button).toBeDisabled();
    expect(button.props.accessibilityHint).toBe(capMessage('IMPERSONATING'));
    expect(screen.getByText(capMessage('IMPERSONATING'))).toBeOnTheScreen();
  });

  test('left out by the server: not shown', async () => {
    await open({ detail: withCreate(undefined) });
    expect(screen.queryByTestId('project-new-task')).not.toBeOnTheScreen();
  });
});
