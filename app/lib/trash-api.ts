/**
 * Client for the project Trash (S1-18) through Eden: the Trash list, moving a project to the Trash
 * (`DELETE /projects/:id`) and restoring it. Errors carry the project wording, like `projects-api`.
 */
import type { TrashProjectItem } from '@server/project/project-trash.query';
import { client } from './eden';
import { unwrap } from './projects-api';

export type { TrashProjectItem };
export type TrashPage = { items: TrashProjectItem[]; total: number; page: number; limit: number };
/** What moved with the project, both ways. */
export type TrashChange = { id: string; tasks: number };
export type TrashQuery = { page?: number; limit?: number };

/** React-query keys; a delete or restore also refreshes `projectKeys.all`. */
export const trashKeys = {
  all: ['trash'] as const,
  list: (q: TrashQuery) => ['trash', 'list', q] as const,
};

/** Eden pastes path params as they are, so ids are escaped here. */
const pathId = (id: string) => encodeURIComponent(id);

export async function fetchTrash(query: TrashQuery): Promise<TrashPage> {
  return unwrap(await client.api.app.trash.get({ query }));
}

export async function trashProject(id: string): Promise<TrashChange> {
  return unwrap(await client.api.app.projects({ id: pathId(id) }).delete());
}

export async function restoreProject(id: string): Promise<TrashChange> {
  return unwrap(await client.api.app.trash.project({ id: pathId(id) }).restore.post());
}
