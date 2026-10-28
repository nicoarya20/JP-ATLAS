/**
 * `/api/app/tasks` behind the Tasks tab (tasks.api.ts): a list pages by cursor inside one resource,
 * a refresh asks for as many rows as are on screen, a stale cursor starts over, only the last
 * LIST_CACHE lists are kept, and a board move takes one workflow step per card and refreshes the
 * lists, the counts and Home. The screens are __tests__/tasks/tasks.screen.*.
 */
import { homeResource } from '@/data/home.api';
import { forgetAllResources } from '@/data/resource';
import {
  LIST_CACHE,
  loadMoreTasks,
  moveOnServer,
  resetTaskLists,
  taskListResource,
  tasksCountsResource,
  taskWriteTargets,
} from '@/data/tasks.api';
import { apiCard } from '@/data/tasks.card';
import { TASKS_PAGE } from '@/data/tasks.paged';
import { listParams } from '@/data/tasks.query';
import { defaultQuery } from '@/data/tasks.query-state';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { locked, row, tasksServer } from '../helpers/tasks-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
const lists = () => (server?.calls ?? []).filter((u) => u.includes('/api/app/tasks?'));
const paging = (url: string) => {
  const p = new URL(url).searchParams;
  return [p.get('limit'), p.get('cursor')];
};
const MINE = listParams('mine', defaultQuery('mine'), '');
const many = (n: number) => Array.from({ length: n }, (_, i) => row(i + 1));

beforeEach(() => {
  resetTaskLists();
  forgetAllResources();
});
afterEach(() => {
  server?.restore();
  server = null;
});

describe('paging', () => {
  test('page one, then Load more appends the next; a refresh asks for every row on screen', async () => {
    serve(tasksServer(many(30)).routes);
    const res = taskListResource(MINE);
    await res.ensure();
    expect(res.current()?.items).toHaveLength(TASKS_PAGE);
    await loadMoreTasks(MINE);
    expect(res.current()?.items.map((t) => t.number)).toEqual(many(30).map((t) => t.number));
    expect(res.current()?.nextCursor).toBeNull();
    await res.reload();
    expect(lists().map(paging)).toEqual([
      ['25', null],
      ['25', '25'],
      ['30', null],
    ]);
  });

  test('Load more does nothing without a next page', async () => {
    serve(tasksServer(many(2)).routes);
    await taskListResource(MINE).ensure();
    await loadMoreTasks(MINE);
    expect(lists()).toHaveLength(1);
  });

  test('a cursor the server no longer accepts starts over from page one', async () => {
    const tasks = tasksServer(many(30));
    serve({
      ...tasks.routes,
      '/api/app/tasks': (url, init) =>
        url.includes('cursor=')
          ? { status: 400, body: { error: 'Kursor tidak valid.', code: 'BAD_CURSOR' } }
          : (tasks.routes['/api/app/tasks'] as (u: string, i?: RequestInit) => never)(url, init),
    });
    const res = taskListResource(MINE);
    await res.ensure();
    const state = await loadMoreTasks(MINE);
    expect(state.phase).toBe('ready');
    expect(res.current()?.items).toHaveLength(TASKS_PAGE);
    expect(lists().map(paging).at(-1)).toEqual(['25', null]);
  });

  test(`only the last ${LIST_CACHE} lists are kept; the oldest is forgotten`, async () => {
    serve(tasksServer(many(1)).routes);
    const params = Array.from({ length: LIST_CACHE + 1 }, (_, i) => `${MINE}&q=${i}`);
    for (const p of params.slice(0, LIST_CACHE)) await taskListResource(p).ensure();
    const oldest = taskListResource(params[0]); // read again: now the newest
    await taskListResource(params[LIST_CACHE]).ensure();
    expect(oldest.peek().phase).toBe('ready');
    expect(taskListResource(params[1]).peek().phase).toBe('empty');
    expect(taskWriteTargets()).toHaveLength(LIST_CACHE + 3);
    expect(taskWriteTargets()).toContain(homeResource);
    expect(taskWriteTargets()).toContain(tasksCountsResource);
  });
});

describe('moveOnServer', () => {
  test('one step per card; a refusal is counted with its reason, a card with no step is skipped', async () => {
    const tasks = tasksServer([row(1), row(2), row(3, { can: locked('IMPERSONATING') })], {
      refuse: { 't-2': { status: 403, body: { error: 'Tugas terkunci.', code: 'FORBIDDEN' } } },
    });
    const s = serve(tasks.routes);
    await taskListResource(MINE).ensure();
    const cards = taskListResource(MINE).current()?.items.map(apiCard) ?? [];
    const r = await moveOnServer(cards, 'Done');
    expect(r.moved).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.failed.map((e) => e.message)).toEqual(['Tugas terkunci.']);
    expect(tasks.status(1)).toBe('done');
    expect(s.calls.filter((u) => /\/t-\d\/complete$/.test(u))).toHaveLength(2);
    // The list on hand is asked again, so the card shows in its new column.
    expect(lists()).toHaveLength(2);
  });

  test('nothing moved: nothing is refreshed', async () => {
    const tasks = tasksServer([row(1, { can: locked('IMPERSONATING') })]);
    serve(tasks.routes);
    await taskListResource(MINE).ensure();
    const cards = taskListResource(MINE).current()?.items.map(apiCard) ?? [];
    expect(await moveOnServer(cards, 'Done')).toEqual({ moved: 0, failed: [], skipped: 1 });
    expect(lists()).toHaveLength(1);
  });
});
