import { canMarkDone } from './home.focus';
import { ME_BY_ROLE, PEOPLE, type Role } from './sample';
import { getTasksState } from './tasks.state';
import { moveTask } from './tasks.store';

/*
 * What Home writes: My Focus' Done (prototype FocusRow: moveTask(no, 'Done', { log })). It goes through tasks.store, so
 * Tasks, the task's history and Home itself show the change. A row Home does not offer Done on throws.
 */

/** History line for a task marked done from Home, as the prototype writes it. */
export const doneLog = (name: string) => `${name} marked this task done`;

/** My Focus' Done on task #no by the signed-in `role`. */
export function markFocusDone(role: Role, no: number) {
  const s = getTasksState();
  const t = s.tasks.find((x) => x.no === no);
  const name = PEOPLE[ME_BY_ROLE[role]].name;
  if (!t || t.who !== name || !canMarkDone(s, t)) {
    throw new Error(
      `Cannot mark task #${no} done from Home: My Focus does not offer it to ${name}`,
    );
  }
  moveTask(no, 'Done', { log: doneLog(name) });
}
