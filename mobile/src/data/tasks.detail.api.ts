/**
 * One task as its detail reads it: `GET /api/app/tasks/:ref` and its timeline, paged
 * (`tasks.paged.ts`), both by the task number in the route (`:ref` takes a number as the global
 * `#12`). Only the last DETAIL_CACHE tasks opened are kept; an older one is forgotten, so a write
 * does not refetch every task the person ever opened. Writes are `tasks.detail.write.ts`.
 */
import { apiGet } from '@/api/client';

import { type Resource, type ResourceState, resource } from './resource';
import type { TaskDetailWire, TimelinePageWire } from './tasks.detail.wire';
import { loadMorePaged, type Paged, pagedResource } from './tasks.paged';

/** Tasks kept loaded: the detail open now, and the few opened before it (back, then forward). */
export const DETAIL_CACHE = 8;

type Kept = { detail: Resource<TaskDetailWire>; timeline: Paged<TimelinePageWire> };

// Insertion order is use order, as the lists in tasks.api.ts.
const kept = new Map<number, Kept>();

function keptTask(no: number): Kept {
  const had = kept.get(no);
  if (had) {
    kept.delete(no);
    kept.set(no, had);
    return had;
  }
  const path = `/api/app/tasks/${no}`;
  const made: Kept = {
    detail: resource<TaskDetailWire>(`tasks:detail:${no}`, () => apiGet<TaskDetailWire>(path)),
    timeline: pagedResource<TimelinePageWire>(`tasks:timeline:${no}`, `${path}/timeline`),
  };
  kept.set(no, made);
  if (kept.size > DETAIL_CACHE) {
    const [oldest, old] = kept.entries().next().value as [number, Kept];
    kept.delete(oldest);
    old.detail.forget();
    old.timeline.res.forget();
  }
  return made;
}

/** Task #no as its detail shows it. */
export const taskDetailResource = (no: number): Resource<TaskDetailWire> => keptTask(no).detail;

/** Task #no's comments and activity, newest first, every page loaded so far. */
export const taskTimelineResource = (no: number): Resource<TimelinePageWire> =>
  keptTask(no).timeline.res;

/** The next page of task #no's timeline, appended. */
export const loadMoreTimeline = (no: number): Promise<ResourceState<TimelinePageWire>> =>
  loadMorePaged(keptTask(no).timeline);

/** Every detail and timeline still kept: a task write can change any of them. */
export const taskDetailTargets = (): Resource<unknown>[] =>
  [...kept.values()].flatMap((k) => [
    k.detail as Resource<unknown>,
    k.timeline.res as Resource<unknown>,
  ]);

/** Every kept task dropped. test-only */
export const resetTaskDetails = () => {
  for (const k of kept.values()) {
    k.detail.forget();
    k.timeline.res.forget();
  }
  kept.clear();
};
