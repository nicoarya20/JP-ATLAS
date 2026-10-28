// A stubbed `/api/app/tasks` for the Tasks screens: rows as `server/task/task.dto.ts` sends them, and a small server
// that answers the list (scope, project, status, priority, q, sort, limit, cursor), the counts, a task's detail and
// timeline, and the writes (workflow steps, checklist, comments) the way the real one does (map `phase2-map-tasks.md`
// §0), so a change shows up only because the screen asked again. test-only
import type { TaskDetailWire, TimelineEntryWire } from '@/data/tasks.detail.wire';
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
  todo: { update: true, start: true, complete: true, cancel: true, comment: true },
  in_progress: { update: true, unstart: true, complete: true, cancel: true, comment: true },
  in_review: { update: true, comment: true },
  done: { reopen: true, update: 'LOCKED_BY_STATUS', comment: 'LOCKED_BY_STATUS' },
  canceled: { uncancel: true, update: 'LOCKED_BY_STATUS', comment: 'LOCKED_BY_STATUS' },
};
/** The step the server would highlight for a row in each status. */
const PRIMARY: Partial<Record<TaskStatusWire, TaskListItemWire['primary']>> = {
  todo: 'start',
  in_progress: 'complete',
  done: 'reopen',
  canceled: 'uncancel',
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
  reopen: 'in_progress',
  cancel: 'canceled',
  uncancel: 'todo',
};
/** `TASK_ACTIVITY` of each step. */
const DONE_ACTION: Record<string, string> = {
  start: 'started',
  unstart: 'unstarted',
  complete: 'completed',
  reopen: 'reopened',
  cancel: 'canceled',
  uncancel: 'uncanceled',
};
const AT = '2026-10-07T02:00:00.000Z'; // 09:00 in Jakarta, the test clock's day
const SEARCH_NUMBER = /^#?(\d+)$/;

type Options = {
  /** `caps.createTask` of every list page; default: allowed. */
  createTask?: true | string | null;
  /** Answer a step on task `id` with this instead of doing it. */
  refuse?: Record<string, AuthReply>;
  /** Answer the counts with this; default: worked out from the rows. */
  counts?: TaskCountsWire;
  /** What only a task's detail carries, by task number; default: `detailOf`. */
  details?: Record<number, Partial<TaskDetailWire>>;
  /** A task's timeline, newest first, by task number; default: empty. */
  timeline?: Record<number, TimelineEntryWire[]>;
};

/** One write the server took: method, path after `/api/app/tasks/`, and the body as sent. */
export type TaskWrite = { method: string; path: string; body: unknown };

/** The detail of `row`: a Bug in the Development phase, created by Nico on Oct 1, unless `over` says otherwise. */
export const detailOf = (
  r: TaskListItemWire,
  over: Partial<TaskDetailWire> = {},
): TaskDetailWire => ({
  ...r,
  primary: PRIMARY[r.status] ?? null,
  phase: r.phase ?? { id: 'ph-dev', name: 'Development' },
  description: null,
  startDate: null,
  kind: { id: 'k-bug', name: 'Bug', baseKind: 'issue' },
  creator: NICO,
  reviewer: null,
  needsReview: false,
  reopenCount: 0,
  cancel: null,
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  createdAt: '2026-10-01T03:00:00.000Z',
  updatedAt: AT,
  ...over,
  checklist: over.checklist ?? { ...r.checklist, items: [] },
});

/** An activity line of the timeline. */
export const activity = (
  id: string,
  action: string,
  payload: unknown = {},
  author: { id: string | null; name: string } = NICO,
  at = AT,
): TimelineEntryWire => ({ kind: 'activity', id, at, author, action, payload });

/** A comment of the timeline. */
export const comment = (
  id: string,
  body: string,
  author: { id: string | null; name: string } = NICO,
  at = AT,
  editedAt: string | null = null,
): TimelineEntryWire => ({ kind: 'comment', id, at, author, body, editedAt });

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
  const details = Object.fromEntries(
    Object.entries(options.details ?? {}).map(([no, d]) => [no, { ...d }]),
  ) as Record<number, Partial<TaskDetailWire>>;
  const timelines = Object.fromEntries(
    Object.entries(options.timeline ?? {}).map(([no, t]) => [no, [...t]]),
  ) as Record<number, TimelineEntryWire[]>;
  const writes: TaskWrite[] = [];
  let made = 0;
  const notFound: AuthReply = {
    status: 404,
    body: { error: 'Tugas tidak ditemukan.', code: 'NOT_FOUND' },
  };
  const extra = (no: number) => {
    details[no] = details[no] ?? {};
    return details[no];
  };
  const find = (ref: string) => rows.find((x) => x.id === ref || String(x.number) === ref);
  const log = (r: TaskListItemWire, entry: TimelineEntryWire) => {
    timelines[r.number] = [entry, ...(timelines[r.number] ?? [])];
  };
  const step = (r: TaskListItemWire, action: string, body: Record<string, unknown>): AuthReply => {
    const refused = options.refuse?.[r.id];
    if (refused) return refused;
    if (!STEP[action]) return notFound;
    const from = r.status;
    r.status = STEP[action];
    r.can = CAN[r.status];
    const d = extra(r.number);
    if (action === 'cancel') {
      d.cancel = { category: body.category as 'other', note: (body.note as string) ?? null };
      d.canceledAt = AT;
    }
    if (action === 'uncancel') d.cancel = null;
    if (action === 'complete') d.completedAt = AT;
    log(r, activity(`a-${++made}`, DONE_ACTION[action], { from, to: r.status, ...body }));
    return {
      body: {
        task: { id: r.id, number: r.number, status: r.status },
        can: { ...r.can, primary: PRIMARY[r.status] ?? null },
      },
    };
  };
  const detail = (r: TaskListItemWire) => {
    const d = details[r.number] ?? {};
    return detailOf(r, { ...d, can: { ...r.can, ...d.can } });
  };
  const checklist = (
    r: TaskListItemWire,
    itemId: string | undefined,
    body: Record<string, unknown>,
  ) => {
    const d = extra(r.number);
    const items = [...(d.checklist?.items ?? [])];
    if (itemId) {
      const i = items.findIndex((x) => x.id === itemId);
      if (i < 0) return notFound;
      items[i] = { ...items[i], isDone: !!body.isDone };
    } else {
      items.push({
        id: `c-${++made}`,
        text: String(body.text),
        isDone: false,
        position: items.length,
      });
    }
    const done = items.filter((x) => x.isDone).length;
    d.checklist = { done, total: items.length, items };
    r.checklist = { done, total: items.length };
    return { status: itemId ? 200 : 201, body: { item: items.at(-1), checklist: d.checklist } };
  };
  const timeline = (r: TaskListItemWire, url: string) => {
    const p = new URL(url).searchParams;
    const all = timelines[r.number] ?? [];
    const from = Number(p.get('cursor') ?? 0);
    const to = from + Number(p.get('limit') ?? 25);
    return {
      body: { items: all.slice(from, to), nextCursor: to < all.length ? String(to) : null },
    };
  };
  const task = (url: string, init?: RequestInit): AuthReply => {
    const path = new URL(url).pathname.replace(/^\/api\/app\/tasks\/?/, '');
    if (!path) return { body: list(url) };
    const [ref, part, itemId] = path.split('/');
    const r = find(decodeURIComponent(ref));
    if (!r) return notFound;
    const method = init?.method ?? 'GET';
    if (method === 'GET') return part === 'timeline' ? timeline(r, url) : { body: detail(r) };
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    writes.push({ method, path, body });
    if (part === 'checklist') return checklist(r, itemId, body);
    if (part === 'comments') {
      log(r, comment(`m-${++made}`, String(body.body)));
      return {
        status: 201,
        body: { id: `m-${made}`, body: body.body, author: NICO, createdAt: AT, editedAt: null },
      };
    }
    return step(r, part, body);
  };
  const routes: AuthRoutes = {
    '/api/app/tasks/counts': () => ({ body: options.counts ?? counts() }),
    '/api/app/projects': { body: { items: [ATLAS, SINAR], total: 2, page: 1, limit: 100 } },
    '/api/app/tasks': task,
  };
  /** The status of task #no on the server now. */
  const status = (no: number) => rows.find((r) => r.number === no)?.status;
  return { routes, rows, status, writes };
}

/** The `GET /api/app/tasks` requests among `calls`, as their query strings without paging. */
export const listCalls = (calls: readonly string[]) =>
  calls
    .filter((u) => /\/api\/app\/tasks\?/.test(u))
    .map((u) => new URL(u).search.slice(1).replace(/&limit=\d+(&cursor=[^&]*)?$/, ''));
