/**
 * Client for the Trash (S1-18, S6 D1) through Eden: the merged Trash list (projects and tasks),
 * moving a project to the Trash (`DELETE /projects/:id`) and restoring it. Errors carry the project
 * wording, like `projects-api`; the task side lives in `task-trash-api`.
 */
import type { TrashProjectItem } from '@server/project/project-trash.query';
import type { TrashTaskItem } from '@server/task/task-trash.query';
import type { TrashCounts } from '@server/trash/trash.list.query';
import { client } from './eden';
import { unwrap } from './projects-api';

export type { TrashCounts, TrashProjectItem, TrashTaskItem };
export type TrashKind = 'project' | 'task';
type ItemOf = { project: TrashProjectItem; task: TrashTaskItem };
/** One page of the Trash for one kind; `counts` always covers both kinds. */
export type TrashPage<K extends TrashKind = 'project'> = {
  items: ItemOf[K][];
  total: number;
  page: number;
  limit: number;
  counts: TrashCounts;
};
/** What moved with the project, both ways. */
export type TrashChange = { id: string; tasks: number };
export type TrashQuery = { page?: number; limit?: number };

/** React-query keys; a delete or restore also refreshes `projectKeys.all` (and `taskKeys.all` for tasks). */
export const trashKeys = {
  all: ['trash'] as const,
  list: (q: TrashQuery, kind: TrashKind = 'project') => ['trash', 'list', kind, q] as const,
};

/** Eden pastes path params as they are, so ids are escaped here. */
const pathId = (id: string) => encodeURIComponent(id);

export async function fetchTrash<K extends TrashKind>(
  kind: K,
  query: TrashQuery,
): Promise<TrashPage<K>> {
  // Eden types the items as the union of both kinds; the `kind` filter makes the page homogeneous.
  return unwrap(await client.api.app.trash.get({ query: { ...query, kind } })) as TrashPage<K>;
}

export async function trashProject(id: string): Promise<TrashChange> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).delete());
}

export async function restoreProject(id: string): Promise<TrashChange> {
  return unwrap(await client.api.app.trash.project({ id: pathId(id) }).restore.post());
}
