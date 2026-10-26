/**
 * Everything the Tasks module reads from `/api/app/tasks*` that is one object rather than a list:
 * one `resource` per thing asked for, and the rule from `docs/phase2-pola-data.md` §1 that a
 * second asker joins the request in flight instead of starting another.
 *
 * The lists are their own module (`tasks.api.lists.ts`) because a list on screen is several
 * requests; they are re-exported from here so a write has one place to ask what exists.
 *
 * Why a resource *family* and not one store each: a task detail, a timeline and the form options
 * are all "one per ref", and two screens asking for the same ref must share one request. So each
 * is keyed, and `taskDetails()` / `taskTimelines()` hand the live ones to a write so it can say
 * what it made stale (§2) — a write must never guess which refs are loaded.
 */
import { apiGet } from '@/api/client';

import { type Resource, resource } from './resource';
import { forgetTaskLists } from './tasks.api.lists';
import { type Paged, paged } from './tasks.api.paging';
import type {
  WireFormOptions,
  WireTaskCounts,
  WireTaskDetail,
  WireTimelineEntry,
  WireTimelinePage,
} from './tasks.api.types';

export {
  type TaskGroupPage,
  type TaskGroupSpec,
  type TaskListData,
  type TaskListParams,
  type TaskListResource,
  taskList,
  taskListQuery,
  taskLists,
} from './tasks.api.lists';
export type { Paged } from './tasks.api.paging';

/** My tasks per schedule group and per status, so a group title or an empty state needs no full list. */
export const taskCounts = resource<WireTaskCounts>('tasks.counts', () =>
  apiGet<WireTaskCounts>('/api/app/tasks/counts'),
);

const details = new Map<string, Resource<WireTaskDetail>>();

/** One task by `ref`: all digits = its global number, anything else = its id. */
export function taskDetail(ref: string | number): Resource<WireTaskDetail> {
  const key = String(ref);
  const found = details.get(key);
  if (found) return found;
  const made = resource<WireTaskDetail>(`tasks/${key}`, () =>
    apiGet<WireTaskDetail>(`/api/app/tasks/${encodeURIComponent(key)}`),
  );
  details.set(key, made);
  return made;
}

/** Every task detail asked for so far. */
export const taskDetails = (): Resource<WireTaskDetail>[] => [...details.values()];

const timelines = new Map<string, Paged<WireTimelinePage>>();

/** Comments and activity of one task, newest first, a page at a time. */
export function taskTimeline(ref: string | number): Paged<WireTimelinePage> {
  const key = String(ref);
  const found = timelines.get(key);
  if (found) return found;
  const path = `/api/app/tasks/${encodeURIComponent(key)}/timeline`;
  const made = paged<WireTimelineEntry, WireTimelinePage>(`tasks/${key}/timeline`, (cursor) =>
    apiGet<WireTimelinePage>(`${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  );
  timelines.set(key, made);
  return made;
}

/** Every timeline asked for so far. */
export const taskTimelines = (): Paged<WireTimelinePage>[] => [...timelines.values()];

const formOptions = new Map<string, Resource<WireFormOptions>>();

/**
 * The projects a task may be added to, each with its kinds and phases (A12). Without `projectId`
 * that is every such project — what New task needs; with one, only that project, which is what Edit
 * needs and what answers 404 for a project that is gone.
 */
export function taskFormOptions(projectId?: string): Resource<WireFormOptions> {
  const key = projectId ?? '';
  const found = formOptions.get(key);
  if (found) return found;
  const made = resource<WireFormOptions>(`tasks.form-options${key && `?${key}`}`, () =>
    apiGet<WireFormOptions>(
      `/api/app/tasks/form-options${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
    ),
  );
  formOptions.set(key, made);
  return made;
}

/** Every form-options answer asked for so far. */
export const taskFormOptionsAll = (): Resource<WireFormOptions>[] => [...formOptions.values()];

/**
 * Drop the resource families, so the next `ensure()` builds them again. For tests: the app itself
 * only ever needs `forgetAllResources()` on sign out, which empties these without removing them.
 */
export function forgetTaskResources(): void {
  for (const r of [...taskDetails(), ...taskTimelines(), ...taskFormOptionsAll()]) r.forget();
  forgetTaskLists();
  taskCounts.forget();
  details.clear();
  timelines.clear();
  formOptions.clear();
}
