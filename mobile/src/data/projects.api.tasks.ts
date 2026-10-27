/**
 * The task reads a project's own screens need: the Tasks tab's list, and the "Tasks needing
 * attention" rows of the Overview.
 *
 * Both come from `/api/app/tasks?scope=project&projectId=<id>` — there is no project-side endpoint
 * for either (GAP A-7), and asking the task list is what the web does too. The wire types and the
 * card mapper are the Tasks module's (`tasks.api.types.ts`, `tasks.api.map.ts`) and are imported
 * rather than copied: a second card dialect for the same rows is exactly what one shared mapper
 * prevents. Nothing in that module is modified from here.
 *
 * **Statuses are always named.** `status` left out means *every* status on the server, so Done and
 * Canceled would leak into a list that asked for open work. The Tasks worker hit this first; the
 * same three statuses are spelled out here.
 *
 * The attention rows are one page each and have no "load more": the section is a short alarm list,
 * not a browse. When a reason has more rows than a page, the count the section shows is the one the
 * server gave for the page — said plainly on screen rather than passed off as a total.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';

import { cursorPaged, type Paged } from './projects.api.paging';
import { type Resource, resource } from './resource';
import type { WireTaskListItem, WireTaskPage, WireTaskStatus } from './tasks.api.types';

/** The three statuses of work that is not finished; named so the server does not send all five. */
const OPEN_STATUSES: readonly WireTaskStatus[] = ['todo', 'in_progress', 'in_review'];

/** How the project's Tasks tab narrows its list; each field is a parameter the server has. */
export type ProjectTaskParams = {
  /** The search box: the server matches the title, or a number exactly. */
  q?: string;
  /** One status when the filter picks one, the three open ones otherwise. */
  status?: readonly WireTaskStatus[];
  assigneeId?: string;
  priority?: readonly string[];
  sort?: string;
};

function taskQuery(id: string, params: ProjectTaskParams, cursor: string | null): string {
  const search = new URLSearchParams({ scope: 'project', projectId: id });
  for (const status of params.status ?? []) search.append('status', status);
  for (const priority of params.priority ?? []) search.append('priority', priority);
  if (params.q) search.set('q', params.q);
  if (params.assigneeId) search.set('assigneeId', params.assigneeId);
  if (params.sort) search.set('sort', params.sort);
  if (cursor) search.set('cursor', cursor);
  return search.toString();
}

/** The task list answers a cursor it will not take with `BAD_CURSOR`, asking for a fresh start. */
const isBadCursor = (cause: unknown): boolean => isApiError(cause) && cause.code === 'BAD_CURSOR';

const lists = new Map<string, Paged<WireTaskPage>>();

/** The project's tasks as the Tasks tab lists them, a page at a time. */
export function projectTaskList(id: string, params: ProjectTaskParams): Paged<WireTaskPage> {
  const key = taskQuery(id, params, null);
  const found = lists.get(key);
  if (found) return found;
  const made = cursorPaged<WireTaskListItem, WireTaskPage>(
    `projects/${id}/tasks?${key}`,
    (cursor) => apiGet<WireTaskPage>(`/api/app/tasks?${taskQuery(id, params, cursor)}`),
    isBadCursor,
  );
  lists.set(key, made);
  return made;
}

/** Why a task is on the Overview's attention list, in the order the section lists them. */
export type AttentionReason = 'Overdue' | 'Awaiting review' | 'Due today';

/** The request behind each reason. Grouping is the server's (`due=`), never recomputed here. */
const ATTENTION: readonly { reason: AttentionReason; query: string }[] = [
  { reason: 'Overdue', query: `${OPEN_STATUSES.map((s) => `status=${s}`).join('&')}&due=overdue` },
  { reason: 'Awaiting review', query: 'status=in_review' },
  {
    reason: 'Due today',
    query: `${OPEN_STATUSES.map((s) => `status=${s}`).join('&')}&due=today`,
  },
];

const attentionStores = new Map<string, Resource<WireTaskPage>>();

/** One reason's rows for one project; the three together make the Overview's section. */
export function projectAttention(id: string, reason: AttentionReason): Resource<WireTaskPage> {
  const entry = ATTENTION.find((a) => a.reason === reason);
  if (!entry) throw new Error(`No attention query for reason "${reason}"`);
  const key = `${id}|${reason}`;
  const found = attentionStores.get(key);
  if (found) return found;
  const made = resource<WireTaskPage>(`projects/${id}/attention/${reason}`, () =>
    apiGet<WireTaskPage>(
      `/api/app/tasks?scope=project&projectId=${encodeURIComponent(id)}&${entry.query}`,
    ),
  );
  attentionStores.set(key, made);
  return made;
}

/** The three attention resources of one project, in the order the section shows them. */
export const projectAttentions = (id: string): Resource<WireTaskPage>[] =>
  ATTENTION.map((a) => projectAttention(id, a.reason));

/** The reasons, in the order the section shows them. */
export const ATTENTION_REASONS: readonly AttentionReason[] = ATTENTION.map((a) => a.reason);

/** Every project task read asked for so far, so a write can name what it made stale. */
export const projectTaskReads = (): (Paged<WireTaskPage> | Resource<WireTaskPage>)[] => [
  ...lists.values(),
  ...attentionStores.values(),
];

/** Drop the families, so the next `ensure()` builds them again. test-only */
export function forgetProjectTaskResources(): void {
  for (const r of projectTaskReads()) r.forget();
  lists.clear();
  attentionStores.clear();
}
