/**
 * Task read routes (`/api/app/tasks`, S2-03, SP2): the keyset list, the "Tugas saya" counts and
 * one task by `:ref` (all digits = global number, else id). The DTOs come from `task/task.dto.ts`
 * unchanged, so the task UI binds to `items[].{primary, can}` and `caps.createTask` as built there.
 */
import { Elysia, t } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { countTasks, listTasks } from '../task/task.query';
import { getTaskDetail } from '../task/task-detail.query';
import { appContext } from './app-context';
import { taskDeleteApi } from './app-tasks.delete';
import { taskDraftApi } from './app-tasks.draft';
import { asList, ListQuery } from './app-tasks.schema';
import { taskWriteApi } from './app-tasks.write';

export const tasksApi = new Elysia({ prefix: '/tasks' })
  .use(appContext)
  .use(taskWriteApi)
  .use(taskDeleteApi)
  .use(taskDraftApi)
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
