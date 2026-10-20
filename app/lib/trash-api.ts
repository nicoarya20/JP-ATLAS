/**
 * Client for the Trash (S1-18, S6 D1, E-07) through Eden: the merged Trash list (projects, tasks and events),
 * moving a project to the Trash (`DELETE /projects/:id`) and restoring it. Errors carry the project
 * wording, like `projects-api`; the task side lives in `task-trash-api`.
 */
import type { TrashEventItem } from '@server/event/events.trash.query';
import type { TrashProjectItem } from '@server/project/project-trash.query';
import type { TrashTaskItem } from '@server/task/task-trash.query';
import type { TrashCounts, TrashItem, TrashKindFilter } from '@server/trash/trash.list.query';
import { client } from './eden';
import { unwrap } from './projects-api';

export type { TrashCounts, TrashEventItem, TrashItem, TrashProjectItem, TrashTaskItem };
/** The tab of the Trash page: `all` is the merged list, the rest narrow it to one kind. */
export type TrashTab = TrashKindFilter;
/** One page of the Trash for one tab; `total` follows the tab, `counts` always covers every kind. */
export type TrashPage = {
  items: TrashItem[];
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
  list: (q: TrashQuery, tab: TrashTab = 'all') => ['trash', 'list', tab, q] as const,
};

/** Eden pastes path params as they are, so ids are escaped here. */
const pathId = (id: string) => encodeURIComponent(id);

export async function fetchTrash(tab: TrashTab, query: TrashQuery): Promise<TrashPage> {
  return unwrap(await client.api.app.trash.get({ query: { ...query, kind: tab } })) as TrashPage;
}

export async function trashProject(id: string): Promise<TrashChange> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).delete());
}

export async function restoreProject(id: string): Promise<TrashChange> {
  return unwrap(await client.api.app.trash.project({ id: pathId(id) }).restore.post());
}
