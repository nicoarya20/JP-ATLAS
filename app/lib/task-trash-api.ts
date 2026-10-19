/**
 * Client for sending a task to the Trash and bringing it back (S6 D1): `DELETE /tasks/:ref` and
 * `POST /trash/task/:id/restore`, through Eden. Errors carry the task wording, like `tasks-api`.
 */
import { client } from './eden';
import { unwrapTask } from './tasks-api';

/** What `DELETE /tasks/:ref` answers: enough to name the task and to restore it by id. */
export type DeletedTask = { kind: 'task'; id: string; number: number; label: string };

/** Eden pastes path params as they are, so ids are escaped here. */
const pathId = (id: string) => encodeURIComponent(id);

/** Sends the task to the Trash (a soft delete the Trash page can undo). */
export async function deleteTask(ref: string): Promise<DeletedTask> {
  const res = unwrapTask(await client.api.app.tasks({ ref: pathId(ref) }).delete());
  return res.trash;
}

/** Brings a trashed task back by id; the task keeps its number. */
export async function restoreTrashedTask(id: string): Promise<{ id: string; number: number }> {
  return unwrapTask(await client.api.app.trash.task({ id: pathId(id) }).restore.post());
}
