// The Tasks tab's list against a stubbed /api/app/tasks (tasks-fixtures): My tasks grouped by the server's schedule
// boundaries with the server's counts, My / All, opening a card, the search sent once typing rests, NoMatch + Reset,
// loading, failure and Load more, New task only when the server allows it, and the Filter & sort sheet (projects from
// the server, draft, Reset, Apply, dot). The data layer is __tests__/data/tasks.*.test.ts.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { sheetGone } from '../helpers/sheet-gone';
import { DODI, listCalls, row, SINAR, tasksServer } from '../helpers/tasks-fixtures';
import { openTasks, resetTaskStores } from '../helpers/tasks-router';

resetTaskStores();

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
afterEach(() => {
  server?.restore();
  server = null;
});

/** Mine: overdue #12, today #14, tomorrow #9 (another project), no date #16; Dodi's #15; my Done #8. */
const ROWS = [
  row(12, {
    title: 'Fix SSO login',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-10-05',
    checklist: { done: 2, total: 3 },
    labels: ['overdue', 'blocked'],
  }),
  row(14, { title: 'Write the API spec', dueDate: '2026-10-07' }),
  row(9, { title: 'Update the landing page', dueDate: '2026-10-08', project: SINAR }),
  row(16, { title: 'Migrate the old reports', priority: 'low' }),
  row(15, { title: 'Design the empty states', dueDate: '2026-10-20', assignee: DODI }),
  row(8, { title: 'Ship the onboarding', status: 'done', dueDate: '2026-10-01' }),
];

const card = (no: number) => screen.queryByTestId(`task-card-${no}`);
const shown = (nos: number[]) => nos.filter((no) => card(no));
/** The group headings (the screen title is a header too, without a label of its own). */
const heads = () =>
  screen
    .queryAllByRole('header')
    .flatMap((h) => (h.props.accessibilityLabel ? [h.props.accessibilityLabel] : []));
/** New task in the empty state (the tab bar's own "+" has the same name). */
const emptyNew = () =>
  within(screen.getByTestId('tasks-empty')).queryByRole('button', { name: 'New task' });
const filterButton = () => screen.getByRole('button', { name: 'Filter and sort' });
const filterOn = () => filterButton().props.accessibilityValue?.text === 'Filters on';
const sheet = () => within(screen.getByTestId('filter-sheet'));
const tab = (name: string) => within(screen.getByTestId('tasks-scope')).getByRole('tab', { name });
const searchField = () => screen.getByLabelText('Search title or #number…');

describe('tasks list', () => {
  it("opens My tasks grouped by the server's boundaries, headed with the server's counts", async () => {
    const counts = {
      mine: { overdue: 3, today: 1, tomorrow: 1, week: 0, later: 0, none: 1 },
      byStatus: { todo: 3, in_progress: 1, in_review: 0, done: 1, canceled: 0 },
    };
    const s = serve(tasksServer(ROWS, { counts }).routes);
    await openTasks('/tasks');
    expect(await screen.findByTestId('task-card-12')).toBeOnTheScreen();
    expect(tab('My tasks')).toBeSelected();
    expect(heads()).toEqual([
      'Overdue, 3 tasks',
      'Today, 1 task',
      'Tomorrow, 1 task',
      'No date, 1 task',
    ]);
    expect(shown([12, 14, 9, 16, 15, 8])).toEqual([12, 14, 9, 16]);
    expect(listCalls(s.calls)).toEqual([
      'scope=mine&status=todo&status=in_progress&status=in_review&sort=due',
    ]);
    expect(filterOn()).toBe(false);
  });

  it('switches to All tasks in place: one list, everyone’s tasks', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks');
    await screen.findByTestId('task-card-12');
    await fireEvent.press(tab('All tasks'));
    expect(screen).toHaveSearchParams({ scope: 'all' });
    expect(await screen.findByTestId('task-card-15')).toBeOnTheScreen();
    expect(heads()).toEqual([]);
  });

  it('opens the tapped card’s detail', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks');
    await fireEvent.press(await screen.findByTestId('task-card-12'));
    expect(screen).toHavePathname('/tasks/12');
  });

  it('searches once typing rests; nothing found shows NoMatch, and Reset clears the search', async () => {
    const s = serve(tasksServer(ROWS).routes);
    await openTasks('/tasks');
    await screen.findByTestId('task-card-12');
    await fireEvent.changeText(searchField(), 'z');
    await fireEvent.changeText(searchField(), 'zzz');
    expect(await screen.findByTestId('no-match')).toBeOnTheScreen();
    expect(listCalls(s.calls).filter((c) => c.includes('q='))).toEqual([
      'scope=mine&status=todo&status=in_progress&status=in_review&q=zzz&sort=due',
    ]);
    await fireEvent.press(within(screen.getByTestId('no-match')).getByRole('button'));
    expect(await screen.findByTestId('task-card-12')).toBeOnTheScreen();
    expect(searchField().props.value).toBe('');

    await fireEvent.changeText(searchField(), '#14');
    await waitFor(() => expect(shown([12, 14])).toEqual([14]));
  });

  it('a failed list says why in the server’s words, and Try again loads it', async () => {
    const tasks = tasksServer(ROWS);
    const s = serve({
      ...tasks.routes,
      '/api/app/tasks': { status: 500, body: { error: 'Server sedang sibuk.', code: 'INTERNAL' } },
    });
    await openTasks('/tasks');
    expect(await screen.findByText('Server sedang sibuk.')).toBeOnTheScreen();
    s.use(tasks.routes);
    await fireEvent.press(within(screen.getByTestId('tasks-failed')).getByRole('button'));
    expect(await screen.findByTestId('task-card-12')).toBeOnTheScreen();
  });

  it('Load more brings the next page under the cards', async () => {
    const many = Array.from({ length: 30 }, (_, i) => row(100 + i, { assignee: DODI }));
    serve(tasksServer(many).routes);
    await openTasks('/tasks?scope=all');
    expect(await screen.findByTestId('task-card-124')).toBeOnTheScreen();
    expect(card(125)).toBeNull();
    await fireEvent.press(screen.getByTestId('tasks-more'));
    expect(await screen.findByTestId('task-card-129')).toBeOnTheScreen();
    expect(screen.queryByTestId('tasks-more')).toBeNull();
  });

  it('nothing at all offers New task only when the server lets the viewer add one', async () => {
    const s = serve(tasksServer([]).routes);
    await openTasks('/tasks');
    expect(await screen.findByText('No tasks for you yet.')).toBeOnTheScreen();
    expect(emptyNew()).toBeOnTheScreen();
    s.use(tasksServer([], { createTask: null }).routes);
    await fireEvent.press(tab('All tasks'));
    expect(await screen.findByText('No tasks yet.')).toBeOnTheScreen();
    expect(emptyNew()).toBeNull();
  });
});

describe('tasks list accessibility', () => {
  it('names the switches, a group head with its count and a late card with how late', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks');
    await screen.findByTestId('task-card-12');
    expect(screen.getByTestId('tasks-scope')).toHaveAccessibleName('Scope');
    expect(screen.getByTestId('tasks-view')).toHaveAccessibleName('View');
    expect(card(12)).toHaveAccessibleName(
      '#12 Fix SSO login, Atlas Project, High, In progress, Blocked, Due Oct 5, 2 days late, ' +
        'Nico Arya, Steps 2/3',
    );
  });
});

describe('tasks filter', () => {
  it('offers the projects the server lists, and Apply asks for that project', async () => {
    const s = serve(tasksServer(ROWS).routes);
    await openTasks('/tasks?scope=all');
    await screen.findByTestId('task-card-12');
    await fireEvent.press(filterButton());
    const pick = await screen.findByTestId('filter-project');
    expect(pick).toHaveAccessibilityValue({ text: 'All projects' });
    await fireEvent.press(pick);
    await fireEvent.press(await screen.findByText('PT Sinar Website'));
    await fireEvent.press(sheet().getByText('Apply'));
    await sheetGone();
    expect(await screen.findByTestId('task-card-9')).toBeOnTheScreen();
    expect(card(12)).toBeNull();
    expect(listCalls(s.calls).at(-1)).toBe(
      'scope=all&projectId=p-sinar&status=todo&status=in_progress&status=in_review&sort=due',
    );
    expect(filterOn()).toBe(true);
  });

  it('Apply narrows My tasks and lights the dot; Reset in the sheet goes back to the default', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks');
    await screen.findByTestId('task-card-12');
    await fireEvent.press(filterButton());
    expect(await screen.findByTestId('filter-sheet')).toBeOnTheScreen();
    expect(sheet().queryByText('Title (A–Z)')).toBeNull();
    await fireEvent.press(sheet().getByRole('button', { name: 'High' }));
    await fireEvent.press(sheet().getByText('Apply'));
    await sheetGone();
    expect(filterOn()).toBe(true);
    await waitFor(() => expect(shown([12, 14, 9, 16])).toEqual([12]));

    await fireEvent.press(filterButton());
    await fireEvent.press(await screen.findByText('Reset'));
    await fireEvent.press(sheet().getByText('Apply'));
    await sheetGone();
    expect(filterOn()).toBe(false);
    await waitFor(() => expect(shown([12, 14, 9, 16])).toEqual([12, 14, 9, 16]));
  });

  it('a draft left without Apply changes nothing', async () => {
    serve(tasksServer(ROWS).routes);
    await openTasks('/tasks');
    await screen.findByTestId('task-card-12');
    await fireEvent.press(filterButton());
    await screen.findByTestId('filter-sheet');
    await fireEvent.press(sheet().getByRole('button', { name: 'High' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await sheetGone();
    expect(filterOn()).toBe(false);
  });
});
