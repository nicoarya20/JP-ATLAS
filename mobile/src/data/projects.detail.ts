// Project detail ⑨ Tasks tab on the sample data (prototype projects.tabs.jsx ProjectsTasks). The Overview, Phases and
// Members tabs read the server (projects.view.ts, projects.view.tabs.ts); this tab stays on the legacy path until the
// Tasks module reads the server, and the detail does not offer it meanwhile (GAP: Projects Tasks tab).
import type { Role } from './sample';
import { getTasksList, type TaskCard } from './tasks';
import { getTasksState, type TasksState } from './tasks.state';

/** Per-task action of the project's Tasks tab (Manager / Admin), by status; a Member, or a closed task, gets View. */
export type TaskAction =
  | { kind: 'notice'; label: string; notice: string }
  | { kind: 'open'; label: string };

const ACTIONS: Partial<Record<TaskCard['status'], TaskAction>> = {
  'To do': { kind: 'notice', label: 'Start working', notice: 'Task started' },
  'In progress': { kind: 'notice', label: 'Request review', notice: 'Sent for review' },
  'In review': { kind: 'open', label: 'Review' },
};
const VIEW: TaskAction = { kind: 'open', label: 'View' };

/** ⑨ Tasks of project id as a list (with each card's action) or a board, with the project scope's query. */
export function getProjectTasks(
  role: Role,
  id: string,
  view: 'list' | 'board',
  search: string,
  s: TasksState = getTasksState(),
) {
  const list = getTasksList(role, { scope: `project:${id}`, view, search }, s);
  const canEdit = role !== 'member';
  const cards =
    list.view === 'board'
      ? list.columns.flatMap((c) => c.cards)
      : list.groups.flatMap((g) => g.tasks);
  return {
    view: list.view,
    filtered: list.filtered,
    /** noMatch once the query or search leaves nothing (the board too, with Reset filters). */
    empty: list.empty,
    cards,
    /** List cards with their action; the board takes `cards` alone. */
    rows:
      list.view === 'list'
        ? cards.map((card) => ({ card, action: (canEdit && ACTIONS[card.status]) || VIEW }))
        : [],
    count: `${cards.length} ${cards.length === 1 ? 'task' : 'tasks'}`,
  };
}
