/**
 * Task read routes (`/api/app/tasks`, S2-03, SP2): the keyset list, the "Tugas saya" counts and
 * one task by `:ref` (all digits = global number, else id). The DTOs come from `task/task.dto.ts`
 * unchanged, so the task UI binds to `items[].{primary, can}` and `caps.createTask` as built there.
 */
import { Elysia, type TSchema, t } from 'elysia';
import { isoDateIn } from '../metrics/dates';
import { SCHEDULE_GROUPS } from '../metrics/schedule';
import { PROJECT_PRIORITIES, TASK_STATUSES } from '../pm/enums';
import { getMetrics } from '../pm/metrics-env';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import type { TaskClock } from '../task/task.dto';
import { TASK_LIST_SCOPES, TASK_SEARCH_MAX, TASK_SORTS } from '../task/task.limits';
import { countTasks, listTasks } from '../task/task.query';
import { getTaskDetail } from '../task/task-detail.query';
import { CursorQuery } from './app-common';
import { appContext } from './app-context';

// Not `t.UnionEnum`: it silently defaults to its first value, which would turn "no filter" into a filter.
// The cast restores the literal type a mapped `t.Union` loses (it would infer `never`); runtime is unchanged.
const oneOf = <const T extends string>(values: readonly T[]) =>
  t.Union(values.map((v) => t.Literal(v))) as unknown as TSchema & { static: T };

/** One value or several (`?status=todo&status=done`); the query layer takes arrays. */
const many = <const T extends string>(values: readonly T[]) =>
  t.Optional(t.Union([oneOf(values), t.Array(oneOf(values), { minItems: 1 })]));

const asList = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

const ListQuery = t.Object({
  ...CursorQuery.properties,
  scope: t.Optional(oneOf(TASK_LIST_SCOPES)),
  projectId: t.Optional(t.String({ minLength: 1 })),
  status: many(TASK_STATUSES),
  assigneeId: t.Optional(t.String({ minLength: 1 })),
  priority: many(PROJECT_PRIORITIES),
  q: t.Optional(t.String({ maxLength: TASK_SEARCH_MAX })),
  due: t.Optional(oneOf(SCHEDULE_GROUPS)),
  sort: t.Optional(oneOf(TASK_SORTS)),
});

/** "Now" and "today" in the team zone, read per request so a day boundary is never cached. */
export function requestClock(now: Date = new Date()): TaskClock {
  return { now, today: isoDateIn(now, getMetrics().TIME_ZONE) };
}

export const tasksApi = new Elysia({ prefix: '/tasks' })
  .use(appContext)
  /**
   * One page of tasks the caller may see: `{ items, nextCursor, caps }`. `scope=project` needs a
   * `projectId` (422 otherwise); a malformed or foreign cursor answers 400 `BAD_CURSOR`.
   */
  .get(
    '/',
    async ({ actor, query, status }) => {
      const scope = query.scope ?? 'mine';
      if (scope === 'project' && !query.projectId) {
        return fail(status, 'VALIDATION', { error: 'Pilih proyeknya dulu.' });
      }
      const result = await listTasks(
        toPrincipal(actor),
        {
          scope,
          projectId: query.projectId,
          status: asList(query.status),
          assigneeId: query.assigneeId,
          priority: asList(query.priority),
          q: query.q?.trim() || undefined,
          due: query.due,
          sort: query.sort,
          limit: query.limit,
          cursor: query.cursor,
        },
        requestClock(),
      );
      if (!result.ok) {
        return status(400, {
          error: 'Halaman daftar tidak dikenali. Muat ulang daftar dari awal.',
          code: 'BAD_CURSOR',
        });
      }
      return { items: result.items, nextCursor: result.nextCursor, caps: result.caps };
    },
    { query: ListQuery },
  )
  /** Counts for the "Tugas saya" tabs: `{ mine: {per schedule group}, byStatus }`. */
  .get('/counts', async ({ actor }) => countTasks(toPrincipal(actor), requestClock()))
  /** One task with checklist, `can{}` and `primary`; missing, trashed and hidden all answer the same 404. */
  .get(
    '/:ref',
    async ({ actor, params, status }) => {
      const r = await getTaskDetail(toPrincipal(actor), params.ref, requestClock());
      return r.ok ? r.task : fail(status, 'NOT_FOUND');
    },
    { params: t.Object({ ref: t.String({ minLength: 1 }) }) },
  );
