/**
 * Task read routes (`/api/app/tasks`, S2-03, SP2): the keyset list, the "Tugas saya" counts, the
 * form options and one task by `:ref` (all digits = global number, else id). The DTOs come from
 * `task/task.dto.ts` unchanged, so the task UI binds to `items[].{primary, can}` and
 * `caps.createTask` as built there.
 */
import { Elysia, t } from 'elysia';
import { fail } from '../pm/respond';
import { toPrincipal } from '../project/membership.query';
import { requestClock } from '../task/task.clock';
import { countTasks, listTasks } from '../task/task.query';
import { getTaskDetail } from '../task/task-detail.query';
import { getTaskFormProject, listTaskFormProjects } from '../task/task-form.query';
import { appContext } from './app-context';
import { taskDeleteApi } from './app-tasks.delete';
import { taskDraftApi } from './app-tasks.draft';
import { asList, FormOptionsQuery, ListQuery } from './app-tasks.schema';
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
  /**
   * Options the task form needs: the projects the caller may add a task to, each with its active
   * kinds and its phases (A12). `?projectId=` narrows it to that one project — what the Edit form
   * asks for — and answers the usual 404 when the project is missing, in the Trash or hidden.
   *
   * One shape for both, `{ projects }`, so the Edit form reads `projects[0]` and no second DTO is
   * born: the web loaders read exactly these lists from `task-form.query.ts`.
   *
   * Registered before `/:ref` so the literal segment wins over the parameter.
   */
  .get(
    '/form-options',
    async ({ actor, query, status }) => {
      const principal = toPrincipal(actor);
      if (query.projectId === undefined) {
        return { projects: await listTaskFormProjects(principal) };
      }
      const one = await getTaskFormProject(principal, query.projectId);
      return one ? { projects: [one] } : fail(status, 'NOT_FOUND');
    },
    { query: FormOptionsQuery },
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
