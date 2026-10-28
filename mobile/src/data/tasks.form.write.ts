/**
 * What the task forms write (map `phase2-map-tasks.md` §4): `POST /tasks` for New task and `PATCH /tasks/:ref` for
 * Edit task, which sends only the fields that changed (`editChanges`). Each throws the server's error, whose message
 * the form shows as it is (K5); a failure also reaches the session (pattern §3). Only a success invalidates: every
 * task view (lists, counts, Home, the kept details) and the project's own header and list row, whose task counts and
 * overdue numbers a task's dates move. Just write ✦ saves its kept drafts one after another (createTasks).
 */
import { apiPatch, apiPost } from '@/api/client';
import { type ApiError, isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { projectResource, projectsResource } from './projects.api';
import { invalidateAll, type Resource, write } from './resource';
import { taskWriteTargets } from './tasks.api';
import type { TaskDetailWire } from './tasks.detail.wire';
import type { CreateTaskBody, TaskChanges } from './tasks.form';

async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

const targets = (projectId: string): Resource<unknown>[] => [
  ...taskWriteTargets(),
  projectResource(projectId) as Resource<unknown>,
  projectsResource as Resource<unknown>,
];

/** Adds the task; resolves with its number, for the detail it opens on. */
export async function createTask(body: CreateTaskBody): Promise<number> {
  const task = await write(
    () => send(() => apiPost<TaskDetailWire>('/api/app/tasks', body)),
    targets(body.projectId),
  );
  return task.number;
}

/** Saves the changed fields of task `id` in project `projectId`. */
export async function updateTask(
  id: string,
  projectId: string,
  changes: TaskChanges,
): Promise<void> {
  await write(
    () => send(() => apiPatch<TaskDetailWire>(`/api/app/tasks/${encodeURIComponent(id)}`, changes)),
    targets(projectId),
  );
}

/** What saving several tasks did: how many went in, and the refusal that stopped the rest (null when none did). */
export type CreatedTasks = { saved: number; error: ApiError | null };

/**
 * Adds the tasks in order and stops at the first refusal, so the person knows exactly which ones are in. Whatever
 * was saved marks the task views stale, even when a later one was refused.
 */
export async function createTasks(
  projectId: string,
  bodies: readonly CreateTaskBody[],
): Promise<CreatedTasks> {
  let saved = 0;
  try {
    for (const body of bodies) {
      await send(() => apiPost<TaskDetailWire>('/api/app/tasks', body));
      saved += 1;
    }
    return { saved, error: null };
  } catch (e) {
    if (!isApiError(e)) throw e;
    return { saved, error: e };
  } finally {
    if (saved) invalidateAll(targets(projectId));
  }
}
