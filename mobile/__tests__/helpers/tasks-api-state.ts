// A `/api/app/tasks*` that remembers what was written to it, for the screens that write: the status
// steps, the Cancel and Reopen sheets, the checklist, comments, and Move to Archive with its Undo.
//
// Why state and not a fixed reply: the thing worth proving about a write is what the *next* read
// answers. "Move to Archive took the row off the list" and "Reopen put the task back into In
// progress" are claims about the server's new answer, and a stub that replies the same thing
// whatever it was asked cannot tell a write that worked from one that silently did nothing — which
// is the exact failure that made the control be hidden in the first place.
//
// The state machine is `TASK_TRANSITIONS`' subset the app can reach, with the refusals that matter
// to a screen: a reason too short (422), a step the status does not allow (409), a task in the
// Trash (404).
import type {
  WireCancelCategory,
  WireTaskDetail,
  WireTaskListItem,
  WireTaskStatus,
  WireTimelineEntry,
} from '@/data/tasks.api.types';

import type { AuthReply, AuthRoutes } from './auth-server';
import { rowsFor, SAMPLE_ROWS } from './tasks-api-server';
import { CAPS_OF, PRIMARY_OF, wireActivity, wireCounts, wireDetail, wirePage } from './tasks-wire';

/** The steps this app can reach, each with the statuses it may be taken from. */
const STEPS: Record<string, { from: WireTaskStatus[]; to: WireTaskStatus; logs: string }> = {
  start: { from: ['todo'], to: 'in_progress', logs: 'started' },
  unstart: { from: ['in_progress'], to: 'todo', logs: 'unstarted' },
  complete: { from: ['todo', 'in_progress'], to: 'done', logs: 'completed' },
  reopen: { from: ['done'], to: 'in_progress', logs: 'reopened' },
  cancel: { from: ['todo', 'in_progress', 'in_review'], to: 'canceled', logs: 'canceled' },
  uncancel: { from: ['canceled'], to: 'todo', logs: 'uncanceled' },
};

/** The shortest reason `POST /reopen` takes (`REVIEW_NOTE_MIN_LENGTH`). */
const REASON_MIN = 3;

/** An instant to stamp a write with; fixed, so a test can read the day it lands on. */
const NOW = '2026-10-07T03:00:00.000Z';

/** The failure body every `/api` error carries. */
const fail = (status: number, code: string, error: string): AuthReply => ({
  status,
  body: { error, code, status, requestId: 'req-test' },
});

const bodyOf = (init?: RequestInit): Record<string, unknown> =>
  typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};

/** The path after `/api/app/tasks/<ref>`, and the ref itself. */
function refAndStep(url: string): { ref: string; step: string } {
  const after = url.slice(url.indexOf('/api/app/tasks/') + '/api/app/tasks/'.length);
  const [ref = '', ...rest] = after.split('?')[0]?.split('/') ?? [];
  return { ref, step: rest.join('/') };
}

export type FakeTaskApi = {
  /** Routes for `serveAuth`, in the order it must try them (longest path first). */
  routes: AuthRoutes;
  /** The rows the list would answer with now. */
  rows: () => WireTaskListItem[];
  /** One task as its detail reads now, or undefined once it is in the Trash. */
  task: (ref: string | number) => WireTaskDetail | undefined;
  /** What went to the Trash, newest first. */
  trashed: () => { id: string; number: number }[];
};

/**
 * A `/api/app/tasks*` seeded with `rows`, which writes change.
 *
 * Every row gets a detail built from it, so the list and the detail can never disagree about a task
 * — the way the server cannot either.
 */
export function fakeTaskApi(
  rows: readonly WireTaskListItem[] = SAMPLE_ROWS,
  details: Record<number, Partial<WireTaskDetail>> = {},
): FakeTaskApi {
  const live = new Map<string, WireTaskDetail>();
  const bin = new Map<string, WireTaskDetail>();
  const logs = new Map<string, WireTimelineEntry[]>();
  for (const row of rows) {
    const { checklist, ...rest } = row;
    live.set(
      String(row.number),
      wireDetail({
        ...rest,
        // The row's own caps, as the server's starting answer; a step recomputes them below the
        // way the server would.
        // The list row counts its steps without carrying them; a detail that wants the items
        // themselves names them in `details`.
        checklist: { ...checklist, items: [] },
        ...details[row.number],
      }),
    );
  }

  /** The task `ref` names, by its number or its id, whether or not it is in the Trash. */
  const find = (ref: string, where: Map<string, WireTaskDetail> = live) =>
    where.get(ref) ?? [...where.values()].find((t) => t.id === ref);

  const log = (task: WireTaskDetail, entry: WireTimelineEntry) =>
    logs.set(String(task.number), [entry, ...(logs.get(String(task.number)) ?? [])]);

  /** The list row of a task, which is its detail minus what only the detail carries. */
  const rowOf = (t: WireTaskDetail): WireTaskListItem => ({
    id: t.id,
    number: t.number,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    assignee: t.assignee,
    project: t.project,
    phase: t.phase,
    labels: t.labels,
    checklist: { done: t.checklist.done, total: t.checklist.total },
    primary: t.primary,
    can: t.can,
  });

  const allRows = () => [...live.values()].map(rowOf);

  /** One step, with the refusals a screen has to show. */
  function step(ref: string, name: string, init?: RequestInit): AuthReply {
    const task = find(ref);
    if (!task) return fail(404, 'NOT_FOUND', 'Tugas tidak ditemukan.');
    const move = STEPS[name];
    if (!move) return fail(404, 'NOT_FOUND', 'Langkah itu belum tersedia.');
    if (!move.from.includes(task.status))
      return fail(409, 'WRONG_STATE', 'Status tugas sudah berubah. Muat ulang halaman.');
    const body = bodyOf(init);
    if (name === 'reopen') {
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (reason.length < REASON_MIN)
        return fail(422, 'REASON_REQUIRED', 'Alasan wajib diisi, 3–200 karakter.');
    }
    if (name === 'cancel') {
      const category = body.category as WireCancelCategory | undefined;
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (!category) return fail(422, 'VALIDATION', 'Kategori pembatalan wajib dipilih.');
      if (category === 'other' && !note)
        return fail(422, 'NOTE_REQUIRED', 'Catatan wajib diisi untuk kategori Lainnya.');
      task.cancel = { category, note: note || null };
    }
    if (name === 'uncancel') task.cancel = null;
    task.status = move.to;
    task.completedAt = move.to === 'done' ? NOW : null;
    task.canceledAt = move.to === 'canceled' ? NOW : null;
    if (name === 'reopen') task.reopenCount += 1;
    task.can = CAPS_OF[task.status];
    task.primary = PRIMARY_OF[task.status];
    log(task, wireActivity(move.logs, { id: `a-${move.logs}-${task.number}`, at: NOW }));
    return {
      body: {
        task: {
          id: task.id,
          number: task.number,
          status: task.status,
          assigneeId: task.assignee?.id ?? null,
          needsReview: task.needsReview,
          reopenCount: task.reopenCount,
          cancel: task.cancel,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          canceledAt: task.canceledAt,
          lastActivityAt: NOW,
        },
        can: { ...task.can, primary: task.primary },
      },
    };
  }

  /** Tick, untick or rename one checklist item. */
  function checklist(ref: string, itemId: string, init?: RequestInit): AuthReply {
    const task = find(ref);
    const item = task?.checklist.items.find((i) => i.id === itemId);
    if (!task || !item) return fail(404, 'NOT_FOUND', 'Langkah tidak ditemukan.');
    const body = bodyOf(init);
    if (typeof body.isDone === 'boolean') item.isDone = body.isDone;
    if (typeof body.text === 'string') item.text = body.text;
    task.checklist.done = task.checklist.items.filter((i) => i.isDone).length;
    task.checklist.total = task.checklist.items.length;
    return { body: { item, checklist: task.checklist } };
  }

  /** Everything addressed as `/api/app/tasks/<ref>...`, told apart by method and suffix. */
  function oneTask(url: string, init?: RequestInit): AuthReply {
    const { ref, step: rest } = refAndStep(url);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'DELETE' && !rest) {
      const task = find(ref);
      if (!task) return fail(404, 'NOT_FOUND', 'Tugas tidak ditemukan.');
      live.delete(String(task.number));
      bin.set(task.id, task);
      return {
        body: { trash: { kind: 'task', id: task.id, number: task.number, label: task.title } },
      };
    }
    if (method === 'POST' && rest === 'comments') {
      const task = find(ref);
      if (!task) return fail(404, 'NOT_FOUND', 'Tugas tidak ditemukan.');
      const body = bodyOf(init);
      log(task, {
        kind: 'comment',
        id: `c-${(logs.get(String(task.number))?.length ?? 0) + 1}`,
        at: NOW,
        author: { id: 'u-nico', name: 'Nico' },
        body: String(body.body ?? ''),
        editedAt: null,
      });
      return { body: { id: 'c-new' } };
    }
    if (rest.startsWith('checklist/')) return checklist(ref, rest.slice('checklist/'.length), init);
    if (method === 'POST') return step(ref, rest, init);
    const task = find(ref);
    // A task in the Trash answers 404 like one that never existed (A14): there is no detail with a
    // note on it to show, which is why the detail says only that the task is gone.
    if (!task) return fail(404, 'NOT_FOUND', 'Tugas tidak ditemukan.');
    return { body: task };
  }

  const routes: AuthRoutes = {
    // The same counts `tasks-api-server.ts` answered before writes could change them, so the group
    // titles in the list suites still read about the same numbers.
    '/api/app/tasks/counts': () => ({
      body: wireCounts({
        mine: {
          overdue: rowsFor('?status=todo&due=overdue', allRows()).length,
          today: rowsFor('?status=todo&status=in_progress&due=today', allRows()).length,
        },
        byStatus: { todo: allRows().filter((r) => r.status === 'todo').length },
      }),
    }),
    '/api/app/tasks/form-options': { body: { projects: [] } },
    '/api/app/trash/task/': (url) => {
      const id =
        url
          .slice(url.indexOf('/api/app/trash/task/') + '/api/app/trash/task/'.length)
          .split('/')[0] ?? '';
      const task = bin.get(id);
      if (!task) return fail(404, 'NOT_FOUND', 'Item sampah tidak ditemukan.');
      bin.delete(id);
      live.set(String(task.number), task);
      return { body: { id: task.id, number: task.number } };
    },
    '/timeline': (url) => ({
      body: { items: logs.get(refAndStep(url).ref) ?? [], nextCursor: null },
    }),
    '/api/app/tasks?': (url) => ({ body: wirePage(rowsFor(url, allRows())) }),
    '/api/app/tasks/': oneTask,
  };

  return {
    routes,
    rows: allRows,
    task: (ref) => find(String(ref)),
    trashed: () => [...bin.values()].map((t) => ({ id: t.id, number: t.number })),
  };
}
