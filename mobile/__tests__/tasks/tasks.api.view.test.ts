/**
 * The task lists against the server: what one list asks for, what comes back as cards, and what a
 * screen sees while it is on its way or after it failed.
 *
 * Why the requests themselves are asserted and not just the result: a list on screen is several
 * requests, and getting the *parameters* wrong is the failure that looks like working software.
 * A closed task belongs to no schedule group, so a Done list asked for with `due=` comes back empty
 * and the screen says "no tasks" — truthfully, about a question nobody asked.
 */
import { forgetAllResources } from '@/data/resource';
import { forgetTaskResources, taskCounts, taskListQuery, taskLists } from '@/data/tasks.api';
import {
  ensureTaskListView,
  getTaskBoardView,
  getTaskRowsView,
  isApiFiltered,
  moreTaskListGroup,
  type TaskListOptions,
  taskListSpecs,
} from '@/data/tasks.api.view';
import { touchedBy } from '@/data/tasks.api.write';
import { baseQuery, type TaskQuery } from '@/data/tasks.query';
import { setSessionClock } from '@/session/session.state';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { resetSessionForTest, seedSession, TEST_CLOCK } from '../helpers/session-fixtures';
import { wireCounts, wireItem, wirePage } from '../helpers/tasks-wire';

const OPEN = 'status=todo&status=in_progress&status=in_review';

const mine = (over: Partial<TaskQuery> = {}): TaskListOptions => ({
  scope: 'mine',
  view: 'list',
  query: { ...baseQuery('mine'), ...over },
});

const all = (over: Partial<TaskQuery> = {}): TaskListOptions => ({
  scope: 'all',
  view: 'list',
  query: { ...baseQuery('all'), ...over },
});

const board = (over: Partial<TaskQuery> = {}): TaskListOptions => ({
  ...mine(over),
  view: 'board',
});

/** The query strings one list would ask for, in order. */
const queries = (o: TaskListOptions) => taskListSpecs(o).map((s) => taskListQuery(s.params));

let server: ReturnType<typeof serveAuth>;

/** Serve the list endpoint for every group plus the counts; `routes` overrides one by substring. */
function serve(routes: AuthRoutes = {}) {
  server = serveAuth({
    '/api/app/tasks/counts': { body: wireCounts() },
    ...routes,
    // Last, so a more specific key above wins the substring match.
    '/api/app/tasks?': { body: wirePage([]) },
  });
  return server;
}

beforeEach(() => {
  resetSessionForTest();
  seedSession();
  forgetAllResources();
  forgetTaskResources();
});

afterEach(() => {
  server?.restore();
});

describe('what one list asks the server for', () => {
  it('asks My tasks once per schedule group, with the three open statuses spelled out', () => {
    // An empty `status` means every status on the server, so Done and Canceled would leak in.
    expect(queries(mine())).toEqual([
      `scope=mine&${OPEN}&due=overdue&sort=due`,
      `scope=mine&${OPEN}&due=today&sort=due`,
      `scope=mine&${OPEN}&due=tomorrow&sort=due`,
      `scope=mine&${OPEN}&due=week&sort=due`,
      `scope=mine&${OPEN}&due=later&sort=due`,
      `scope=mine&${OPEN}&due=none&sort=due`,
    ]);
    expect(taskListSpecs(mine()).map((s) => [s.key, s.title])).toEqual([
      ['overdue', 'Overdue'],
      ['today', 'Today'],
      ['tomorrow', 'Tomorrow'],
      ['week', 'This week'],
      ['later', 'Later'],
      ['none', 'No due date'],
    ]);
  });

  it('asks for one flat list when the sort is not by due date, titled by that sort', () => {
    const [spec, ...rest] = taskListSpecs(mine({ sort: 1 }));

    expect([spec?.key, spec?.title]).toEqual(['flat', 'Priority']);
    expect(rest).toEqual([]);
    expect(spec && taskListQuery(spec.params)).toBe(`scope=mine&${OPEN}&sort=priority`);
  });

  it('asks a Done list by status and never by schedule group: a closed task is in none', () => {
    const [spec] = taskListSpecs(mine({ status: 4 }));
    const query = spec ? taskListQuery(spec.params) : '';

    expect([spec?.key, spec?.title]).toEqual(['done', 'Done']);
    expect(query).toBe('scope=mine&status=done&sort=due');
    expect(query).not.toContain('due=');
  });

  it('asks the board one request per column, and only the column a status filter names', () => {
    expect(taskListSpecs(board()).map((s) => s.key)).toEqual([
      'To do',
      'In progress',
      'In review',
      'Done',
    ]);
    expect(queries(board())[0]).toBe('scope=mine&status=todo&sort=due');

    // Filtered to To do: three requests that must answer nothing are not sent at all.
    expect(taskListSpecs(board({ status: 1 })).map((s) => s.key)).toEqual(['To do']);
  });

  it('sends the filters the server takes, and leaves out the project the sheet no longer offers', () => {
    // baseQuery('all') still names a sample project; its id is not the server's, so it is dropped.
    expect(baseQuery('all').project).not.toBe('');
    expect(queries(all())).toEqual([`scope=all&${OPEN}&sort=due`]);

    expect(queries({ ...all({ priority: 1 }) })[0]).toContain('priority=high');
    expect(queries({ ...all(), search: '  login ' })[0]).toContain('q=login');
    expect(queries(all({ who: 1 }))[0]).toContain('assigneeId=u-nico');
  });

  it('counts only the filters it sends as narrowing the list, so the filter dot cannot lie', () => {
    expect(isApiFiltered(baseQuery('all'))).toBe(false);
    expect(isApiFiltered({ ...baseQuery('all'), status: 2 })).toBe(true);
    expect(isApiFiltered({ ...baseQuery('all'), sort: 1 })).toBe(false);
  });

  it('asks a project tab with scope=project and its id, which the server requires', () => {
    const [spec] = taskListSpecs({
      scope: 'project:p-atlas',
      view: 'list',
      query: baseQuery('all'),
    });

    expect(spec && taskListQuery(spec.params)).toBe(
      `scope=project&projectId=p-atlas&${OPEN}&sort=due`,
    );
  });
});

describe('a list that arrived', () => {
  it('fetches every group once, and a second asker joins instead of asking again', async () => {
    serve();

    await ensureTaskListView(mine());
    const first = server.calls.length;
    await ensureTaskListView(mine());

    // Six groups plus the counts, and nothing more the second time (rule 1).
    expect(first).toBe(7);
    expect(server.calls.length).toBe(first);
  });

  it('turns rows into cards, drops the groups with nothing in them, and counts from the server', async () => {
    serve({
      'due=today': { body: wirePage([wireItem({ number: 12, dueDate: TEST_CLOCK.today })]) },
      '/api/app/tasks/counts': { body: wireCounts({ mine: { today: 9 } }) },
    });

    await ensureTaskListView(mine());
    const view = getTaskRowsView(mine());

    expect(view.groups.map((g) => g.key)).toEqual(['today']);
    const [group] = view.groups;
    expect(group?.cards.map((c) => [c.no, c.title, c.note])).toEqual([
      [12, 'Fix login layout', 'Today'],
    ]);
    // The heading means how many the server has, not how many rows are loaded.
    expect(group?.count).toBe(9);
    expect(group?.cards[0]?.id).toBe('t-12');
  });

  it('reads the New task button from caps.createTask and from nowhere else', async () => {
    serve({ 'due=overdue': { body: wirePage([], { caps: {} }) } });
    await ensureTaskListView(mine());
    expect(getTaskRowsView(mine()).createTask).toBe('hidden');

    forgetTaskResources();
    server.restore();
    serve({ 'due=overdue': { body: wirePage([], { caps: { createTask: 'LOCKED_BY_STATUS' } }) } });
    await ensureTaskListView(mine());
    expect(getTaskRowsView(mine()).createTask).toBe('off');
  });

  it('keeps the board four columns even when the server has nothing for three of them', async () => {
    serve({ 'status=in_progress': { body: wirePage([wireItem({ status: 'in_progress' })]) } });

    await ensureTaskListView(board());
    const view = getTaskBoardView(board());

    expect(view.columns.map((c) => [c.status, c.cards.length])).toEqual([
      ['To do', 0],
      ['In progress', 1],
      ['In review', 0],
      ['Done', 0],
    ]);
  });
});

describe('a list that has not arrived', () => {
  it('is not called empty while the request is still out', () => {
    serve();
    const view = getTaskRowsView(mine());

    expect(view.phase).toBe('empty');
    expect(view.groups).toEqual([]);
    // Saying "no tasks" here is a claim the screen would have to take back.
    expect(view.empty).toBeNull();
  });

  it('says there is nothing at all, or nothing matching, once the server has answered', async () => {
    serve();

    await ensureTaskListView(mine());
    expect(getTaskRowsView(mine()).empty).toBe('none');

    const narrowed = { ...mine(), search: 'zzz' };
    await ensureTaskListView(narrowed);
    expect(getTaskRowsView(narrowed).empty).toBe('noMatch');
  });

  it('carries the failure instead of an empty list, and offers it to the screen', async () => {
    serve({ 'due=overdue': { status: 500, body: { error: 'Gagal memuat.', code: 'INTERNAL' } } });

    await ensureTaskListView(mine());
    const view = getTaskRowsView(mine());

    expect(view.phase).toBe('failed');
    expect(view.error?.code).toBe('INTERNAL');
    expect(view.error?.message).toBe('Gagal memuat.');
    expect(view.groups).toEqual([]);
    expect(view.empty).toBeNull();
  });
});

describe('paging', () => {
  it('extends one group and leaves the rows of the others alone', async () => {
    serve({
      'due=today': () => ({
        body: server.calls.some((u) => u.includes('cursor='))
          ? wirePage([wireItem({ number: 2, dueDate: TEST_CLOCK.today })])
          : wirePage([wireItem({ number: 1, dueDate: TEST_CLOCK.today })], { nextCursor: 'c1' }),
      }),
      'due=later': { body: wirePage([wireItem({ number: 7, dueDate: '2026-12-01' })]) },
    });

    await ensureTaskListView(mine());
    expect(getTaskRowsView(mine()).groups.find((g) => g.key === 'today')?.hasMore).toBe(true);

    await moreTaskListGroup(mine(), 'today');
    const view = getTaskRowsView(mine());

    expect(view.groups.find((g) => g.key === 'today')?.cards.map((c) => c.no)).toEqual([1, 2]);
    expect(view.groups.find((g) => g.key === 'later')?.cards.map((c) => c.no)).toEqual([7]);
    expect(server.calls.filter((u) => u.includes('cursor=')).length).toBe(1);
  });

  it('starts the group over when the server refuses the cursor, without telling the screen', async () => {
    let asked = 0;
    serve({
      'due=today': () => {
        asked += 1;
        if (asked === 1)
          return { body: wirePage([wireItem({ number: 1 })], { nextCursor: 'old' }) };
        // The answer to a cursor from another sort: "Muat ulang daftar dari awal."
        if (asked === 2)
          return { status: 400, body: { error: 'Halaman tidak dikenali.', code: 'BAD_CURSOR' } };
        return { body: wirePage([wireItem({ number: 5 })]) };
      },
    });

    await ensureTaskListView(mine());
    await moreTaskListGroup(mine(), 'today');
    const view = getTaskRowsView(mine());

    expect(view.phase).toBe('ready');
    expect(view.error).toBeNull();
    expect(view.groups.find((g) => g.key === 'today')?.cards.map((c) => c.no)).toEqual([5]);
  });

  it('never leaves a group holding rows it was told to refetch', async () => {
    // `more()` records an intent, and `reload()` joins a request already in flight rather than
    // starting a second one — so an intent can outlive the load it was meant for. It may only ever
    // page a group forward, never keep rows: a group quietly frozen on stale rows is the failure
    // docs/phase2-pola-data.md §2 is about.
    serve({ 'due=today': { body: wirePage([wireItem({ number: 1 })], { nextCursor: 'c1' }) } });
    await ensureTaskListView(mine());

    const [list] = taskLists();
    if (!list) throw new Error('test-only: the list was never asked for');
    const before = server.calls.length;
    await Promise.all([list.more('today'), list.more('later'), list.reload()]);

    // Whatever order those settled in, every group was asked again.
    for (const group of ['overdue', 'today', 'tomorrow', 'week', 'later', 'none']) {
      expect(server.calls.slice(before).some((u) => u.includes(`due=${group}`))).toBe(true);
    }
  });
});

describe('the server decides what day it is', () => {
  it('reads a due date against the server’s today, not the device’s', async () => {
    // 2026-10-26T23:30Z is already the 27th in Asia/Jakarta: a task due the 27th is due *today*,
    // and a device reading UTC would put it in Tomorrow and send it to the wrong group.
    setSessionClock({ today: '2026-10-27', timeZone: 'Asia/Jakarta' });
    serve({ 'due=today': { body: wirePage([wireItem({ dueDate: '2026-10-27' })]) } });

    await ensureTaskListView(mine());
    const card = getTaskRowsView(mine()).groups[0]?.cards[0];

    expect(card?.note).toBe('Today');
    expect(card?.late).toBe(false);
    expect(card?.due).toBe('Oct 27');
  });

  it('marks a task past that same today late, and says by how much', async () => {
    setSessionClock({ today: '2026-10-27', timeZone: 'Asia/Jakarta' });
    serve({ 'due=overdue': { body: wirePage([wireItem({ dueDate: '2026-10-25' })]) } });

    await ensureTaskListView(mine());
    const card = getTaskRowsView(mine()).groups[0]?.cards[0];

    expect(card?.late).toBe(true);
    expect(card?.lateBy).toBe('2 days late');
    expect(card?.note).toBe('2 days overdue');
  });
});

describe('what a write makes stale', () => {
  it('names every list on hand, the counts, the task and Home', async () => {
    serve();
    await ensureTaskListView(mine());

    const named = touchedBy(12).map((r) => r.name);

    expect(named).toContain(taskLists()[0]?.name);
    expect(named).toContain(taskCounts.name);
    expect(named).toContain('tasks/12');
    expect(named).toContain('tasks/12/timeline');
    expect(named).toContain('home');
  });
});
