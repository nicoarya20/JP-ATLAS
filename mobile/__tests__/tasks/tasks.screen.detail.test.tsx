// The task detail against a stubbed /api/app/tasks/:ref (tasks-fixtures): what it shows from the server (meta, due,
// facts, steps, description, the timeline as English lines), the buttons `can{}` offers with the server's `primary`
// in lime and a disabled one saying why, a step taken on the server, ticking and adding steps, a comment, Load more of
// the history, a view-only task, and a task that is not there or failed. The sheets are tasks.screen.sheets.test.tsx.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { activity, comment, DODI, row, tasksServer } from '../helpers/tasks-fixtures';
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

/** #12 late and in progress with two steps and a history; #14 To do with nothing yet; #8 Done. */
const ROWS = [
  row(12, {
    title: 'Fix SSO login',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-10-05',
  }),
  row(14, { title: 'Write the API spec', dueDate: '2026-10-09', assignee: null }),
  row(8, { title: 'Ship the onboarding', status: 'done', dueDate: '2026-10-01' }),
];
const DETAILS = {
  8: { completedAt: '2026-10-03T02:00:00.000Z' },
  12: {
    description: 'Users on Safari cannot sign in.',
    checklist: {
      done: 1,
      total: 2,
      items: [
        { id: 'c-1', text: 'Reproduce it', isDone: true, position: 0 },
        { id: 'c-2', text: 'Fix the redirect', isDone: false, position: 1 },
      ],
    },
  },
};
const TIMELINE = {
  12: [
    comment('m-1', 'On it today.', DODI, '2026-10-06T03:00:00.000Z'),
    activity('a-2', 'priority_changed', { from: 'medium', to: 'high' }),
    activity(
      'a-1',
      'started',
      { from: 'todo', to: 'in_progress' },
      DODI,
      '2026-10-06T02:00:00.000Z',
    ),
    activity('a-0', 'created', { number: 12 }, { id: null, name: 'Mantan anggota' }),
  ],
};
const server12 = (over = {}) =>
  tasksServer(ROWS, { details: DETAILS, timeline: TIMELINE, ...over });

const button = (name: string) => screen.getByRole('button', { name });
const facts = () => within(screen.getByTestId('task-facts'));

describe('task detail', () => {
  it('shows the task the server sends: meta, due, facts, steps, description and history', async () => {
    serve(server12().routes);
    await openTasks('/tasks/12');
    expect(await screen.findByText('Fix SSO login')).toBeOnTheScreen();
    expect(screen.getByText('#12 · Atlas Project · Bug · Development')).toBeOnTheScreen();
    expect(screen.getByText('Overdue 2 days')).toBeOnTheScreen();
    expect(facts().getByText('Nico Arya')).toBeOnTheScreen();
    expect(facts().getByText('(2 days late)')).toBeOnTheScreen();
    expect(facts().getByText('High')).toBeOnTheScreen();
    expect(facts().getByText('Nico Arya · Oct 1')).toBeOnTheScreen();
    expect(screen.getByText('Steps 1/2')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Reproduce it' })).toBeChecked();
    expect(screen.getByText('Users on Safari cannot sign in.')).toBeOnTheScreen();
    expect(await screen.findByText('Dodi Hartono: On it today.')).toBeOnTheScreen();
    expect(screen.getByText('Nico Arya set the priority to High')).toBeOnTheScreen();
    expect(screen.getByText('Mantan anggota created this task')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dodi Hartono started working, Oct 6')).toBeOnTheScreen();
  });

  it('offers what `can{}` shows, the primary in lime, and takes a step on the server', async () => {
    const s = server12();
    serve(s.routes);
    await openTasks('/tasks/12');
    expect(await screen.findByTestId('task-action-complete')).toBeOnTheScreen();
    expect(screen.queryByTestId('task-action-start')).not.toBeOnTheScreen();
    await fireEvent.press(button('Stop working'));
    expect(await screen.findByText('Stopped working')).toBeOnTheScreen();
    expect(await screen.findByTestId('task-action-start')).toBeOnTheScreen();
    expect(s.writes).toEqual([{ method: 'POST', path: 't-12/unstart', body: {} }]);
    expect(await screen.findByText('Nico Arya stopped working')).toBeOnTheScreen();
  });

  it('a step the server greys out is disabled and says why', async () => {
    const tasks = tasksServer([row(14, { can: { start: true, complete: 'REVIEW_REQUIRED' } })]);
    serve(tasks.routes);
    await openTasks('/tasks/14');
    const done = await screen.findByTestId('task-action-complete');
    expect(done).toBeDisabled();
    const why = 'This task needs a review first. Ask for a review before finishing it.';
    expect(done.props.accessibilityHint).toBe(why);
    expect(screen.getByText(why)).toBeOnTheScreen();
  });

  it('a refused step shows the server’s words and leaves the task as it was', async () => {
    const refuse = {
      't-12': {
        status: 409,
        body: { error: 'Status tugas sudah berubah.', code: 'STATE_CONFLICT' },
      },
    };
    serve(server12({ refuse }).routes);
    await openTasks('/tasks/12');
    await fireEvent.press(await screen.findByTestId('task-action-complete'));
    expect(await screen.findByText('Status tugas sudah berubah.')).toBeOnTheScreen();
    expect(screen.getByTestId('task-action-complete')).toBeEnabled();
  });

  it('ticks a step and adds one on the server; the title counts them again', async () => {
    const s = server12();
    serve(s.routes);
    await openTasks('/tasks/12');
    await fireEvent.press(await screen.findByRole('checkbox', { name: 'Fix the redirect' }));
    expect(await screen.findByText('Steps 2/2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('step-add'));
    expect(screen.getByTestId('step-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('step-text'), 'Test on Safari');
    await fireEvent.press(screen.getByTestId('step-save'));
    expect(await screen.findByText('Steps 2/3')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Test on Safari' })).not.toBeChecked();
    expect(s.writes).toEqual([
      { method: 'PATCH', path: 't-12/checklist/c-2', body: { isDone: true } },
      { method: 'POST', path: 't-12/checklist', body: { text: 'Test on Safari' } },
    ]);
  });

  it('sends a comment, which then heads the history', async () => {
    const s = server12();
    serve(s.routes);
    await openTasks('/tasks/12');
    const send = await screen.findByTestId('comment-send');
    expect(send).toBeDisabled();
    expect(send.props.accessibilityHint).toBe('Write a comment to send it.');
    await fireEvent.changeText(screen.getByTestId('comment-text'), 'Fixed on staging.');
    await fireEvent.press(send);
    expect(await screen.findByText('Nico Arya: Fixed on staging.')).toBeOnTheScreen();
    expect(screen.getByTestId('comment-text').props.value).toBe('');
    expect(s.writes).toEqual([
      { method: 'POST', path: 't-12/comments', body: { body: 'Fixed on staging.' } },
    ]);
  });

  it('a Done task locks its steps and comments with the reason, and offers Reopen', async () => {
    serve(server12().routes);
    await openTasks('/tasks/8');
    expect(await screen.findByText('Done Oct 3')).toBeOnTheScreen();
    expect(screen.getByTestId('task-action-reopen')).toBeEnabled();
    expect(screen.getByTestId('comment-off')).toHaveTextContent(
      'This is locked while the task is in review, done, or canceled.',
    );
    expect(screen.queryByTestId('step-add')).not.toBeOnTheScreen();
  });

  it('Load more brings older history', async () => {
    const many = Array.from({ length: 30 }, (_, i) => activity(`a-${i}`, 'started'));
    serve(tasksServer(ROWS, { timeline: { 14: many } }).routes);
    await openTasks('/tasks/14');
    await screen.findByTestId('history-more');
    expect(screen.getAllByText('Nico Arya started working')).toHaveLength(25);
    await fireEvent.press(screen.getByTestId('history-more'));
    await waitFor(() => expect(screen.getAllByText('Nico Arya started working')).toHaveLength(30));
    expect(screen.queryByTestId('history-more')).not.toBeOnTheScreen();
  });

  it('a task the viewer may only look at says so, without menu or comment box', async () => {
    serve(tasksServer([row(14, { can: {}, assignee: null })]).routes);
    await openTasks('/tasks/14');
    expect(await screen.findByText('You can view this task, but not change it.')).toBeOnTheScreen();
    expect(screen.queryByTestId('task-menu')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('comment-text')).not.toBeOnTheScreen();
    expect(facts().getByText('Unassigned')).toBeOnTheScreen();
  });

  it('a task that is not there says so; a failure offers Try again', async () => {
    const tasks = tasksServer(ROWS);
    const s = serve(tasks.routes);
    await openTasks('/tasks/999');
    expect(await screen.findByTestId('task-missing')).toBeOnTheScreen();
    expect(screen.getByText('This task is no longer here.')).toBeOnTheScreen();

    s.use({
      '/api/app/tasks': { status: 500, body: { error: 'Server sedang sibuk.', code: 'INTERNAL' } },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    await openTasks('/tasks/14');
    expect(await screen.findByText('Server sedang sibuk.')).toBeOnTheScreen();
    s.use(tasks.routes);
    await fireEvent.press(within(screen.getByTestId('task-failed')).getByRole('button'));
    expect(await screen.findByText('Write the API spec')).toBeOnTheScreen();
  });
});
