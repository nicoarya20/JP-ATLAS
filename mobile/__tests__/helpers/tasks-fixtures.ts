// A stubbed `/api/app/tasks` for the Tasks screens: rows as `server/task/task.dto.ts` sends them, and a small server
// that answers the list (scope, project, status, priority, q, sort, limit, cursor), the counts and the board's
// workflow steps the way the real one does (map `phase2-map-tasks.md` §0), so a moved card shows up in its new column
// only because the list was asked again. test-only
import { scheduleGroupOf } from '@/data/tasks.list';
import type {
  ScheduleGroupWire,
  TaskCapsWire,
  TaskCountsWire,
  TaskListItemWire,
  TaskListPageWire,
  TaskStatusWire,
} from '@/data/tasks.wire';

import type { AuthReply, AuthRoutes } from './auth-server';

export const ATLAS = { id: 'p-atlas', name: 'Atlas Project', status: 'active' };
export const SINAR = { id: 'p-sinar', name: 'PT Sinar Website', status: 'active' };
/** The seeded session's account (session-fixtures). */
export const NICO = { id: 'u-nico', name: 'Nico Arya' };
export const DODI = { id: 'u-dodi', name: 'Dodi Hartono' };

/** What the server lets the viewer do on a task of each status, when nothing stands in the way. */
const CAN: Record<TaskStatusWire, TaskCapsWire> = {
  todo: { update: true, start: true, complete: true, cancel: true },
  in_progress: { update: true, unstart: true, complete: true, cancel: true },
  in_review: { update: true },
  done: { reopen: true },
  canceled: { uncancel: true },
};

/** A row of `GET /api/app/tasks`; override what the test is about. */
export const row = (number: number, over: Partial<TaskListItemWire> = {}): TaskListItemWire => {
  const status = over.status ?? 'todo';
  return {
    id: `t-${number}`,
    number,
    title: `Task ${number}`,
    status,
    priority: 'medium',
    dueDate: null,
    assignee: NICO,
    project: ATLAS,
    phase: null,
    labels: [],
    checklist: { done: 0, total: 0 },
    primary: null,
    can: CAN[status],
    ...over,
  };
};

/** Every move the board can make is refused with `code` (`caps.messages.ts`), as for someone else's task. */
export const locked = (code: string): TaskCapsWire => ({
  start: code,
  unstart: code,
  complete: code,
});

const RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const byDue = (a: TaskListItemWire, b: TaskListItemWire) =>
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.number - b.number;
const SORT: Record<string, (a: TaskListItemWire, b: TaskListItemWire) => number> = {
  due: byDue,
  priority: (a, b) => RANK[a.priority] - RANK[b.priority] || byDue(a, b),
  updated: (a, b) => b.number - a.number,
  created: (a, b) => b.number - a.number,
};
const STEP: Record<string, TaskStatusWire> = {
  start: 'in_progress',
  unstart: 'todo',
  complete: 'done',
};
const SEARCH_NUMBER = /^#?(\d+)$/;

type Options = {
  /** `caps.createTask` of every list page; default: allowed. */
  createTask?: true | string | null;
  /** Answer a step on task `id` with this instead of doing it. */
  refuse?: Record<string, AuthReply>;
  /** Answer the counts with this; default: worked out from the rows. */
  counts?: TaskCountsWire;
};

/** The server: `routes` for serveAuth, and the rows as they stand after the steps it took. */
export function tasksServer(initial: TaskListItemWire[], options: Options = {}) {
  const rows = initial.map((r) => ({ ...r }));
  const createTask = options.createTask === undefined ? true : options.createTask;
  const list = (url: string): TaskListPageWire => {
    const p = new URL(url).searchParams;
    const statuses = p.getAll('status');
    const priorities = p.getAll('priority');
    const q = p.get('q')?.trim().toLowerCase() ?? '';
    const n = SEARCH_NUMBER.exec(q)?.[1];
    const hits = rows
      .filter((r) => p.get('scope') !== 'mine' || r.assignee?.id === NICO.id)
      .filter((r) => !p.get('projectId') || r.project.id === p.get('projectId'))
      .filter((r) => !statuses.length || statuses.includes(r.status))
      .filter((r) => !priorities.length || priorities.includes(r.priority))
      .filter((r) => !q || r.title.toLowerCase().includes(q) || String(r.number) === n)
      .sort(SORT[p.get('sort') ?? 'due']);
    const from = Number(p.get('cursor') ?? 0);
    const limit = Number(p.get('limit') ?? 25);
    const to = from + limit;
    return {
      items: hits.slice(from, to),
      nextCursor: to < hits.length ? String(to) : null,
      caps: createTask === null ? {} : { createTask },
    };
  };
  const counts = (): TaskCountsWire => {
    const mine = rows.filter((r) => r.assignee?.id === NICO.id);
    const groups: Record<ScheduleGroupWire, number> = {
      overdue: 0,
      today: 0,
      tomorrow: 0,
      week: 0,
      later: 0,
      none: 0,
    };
    for (const r of mine) {
      if (r.status !== 'done' && r.status !== 'canceled') groups[scheduleGroupOf(r.dueDate)] += 1;
    }
    const byStatus = { todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0 };
    for (const r of mine) byStatus[r.status] += 1;
    return { mine: groups, byStatus };
  };
  const step = (url: string): AuthReply => {
    const [, id, action] = /\/api\/app\/tasks\/([^/?]+)\/([a-z]+)/.exec(url) ?? [];
    const refused = options.refuse?.[id];
    if (refused) return refused;
    const r = rows.find((x) => x.id === id);
    if (!r || !STEP[action]) return { status: 404, body: { error: 'Tugas tidak ditemukan.' } };
    r.status = STEP[action];
    r.can = CAN[r.status];
    return {
      body: { task: { id, number: r.number, status: r.status }, can: { ...r.can, primary: null } },
    };
  };
  const routes: AuthRoutes = {
    '/api/app/tasks/counts': () => ({ body: options.counts ?? counts() }),
    '/api/app/projects': { body: { items: [ATLAS, SINAR], total: 2, page: 1, limit: 100 } },
    '/api/app/tasks': (url, init) => (init?.method === 'POST' ? step(url) : { body: list(url) }),
  };
  /** The status of task #no on the server now. */
  const status = (no: number) => rows.find((r) => r.number === no)?.status;
  return { routes, rows, status };
}

/** The `GET /api/app/tasks` requests among `calls`, as their query strings without paging. */
export const listCalls = (calls: readonly string[]) =>
  calls
    .filter((u) => /\/api\/app\/tasks\?/.test(u))
    .map((u) => new URL(u).search.slice(1).replace(/&limit=\d+(&cursor=[^&]*)?$/, ''));
