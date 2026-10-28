import { monthDay } from './dates';
import { me } from './people';
import { findProject } from './projects.state';
import { type Role, TASK_REVIEWERS } from './sample';
import type { TaskCard } from './tasks.card';
import { boardColumns, COLUMNS } from './tasks.columns';
import { applyQuery, isFiltered, searchTasks, type TaskQuery } from './tasks.query';
import { getQuery } from './tasks.query-state';
import {
  assignees,
  daysLate,
  deniedNotice,
  dueIn,
  fullName,
  mayChange,
  note,
  stepsDone,
  type TaskItem,
  whoLabel,
} from './tasks.shared';
import { getTasksState, type TasksState } from './tasks.state';

/*
 * Tasks data built from the sample store (tasks.store): the legacy path. The Tasks tab reads the server through
 * tasks.list; what stays here feeds a project's Tasks tab and Overview, which read the sample until Projects is wired.
 *
 * TODO(mobile-W3-projects/events): delete this path (getTasksList, taskCard, the sample store) once Projects and
 * Events read /api/app/tasks; its importers are listed in docs/phase2-gap-disembunyikan.md §4.
 */

export type { TaskCard } from './tasks.card';
export { getTaskSettings } from './tasks.settings';
export { getCsvImport, getQuickWrite } from './tasks.write';

export type TaskCardGroup = { title: string | null; tasks: TaskCard[] };

const PROJECT_SCOPE = 'project:';
type ProjectScope = `project:${string}`;

export type TasksListOptions = {
  scope: ProjectScope;
  view: 'list' | 'board';
  /** Defaults to the scope's applied query (tasks.query-state). */
  query?: TaskQuery;
  search?: string;
};

/** noMatch = the project's tasks, narrowed by the query or search, leave nothing (Reset filters). */
export type TasksEmpty = 'noMatch' | null;

export type TasksList = {
  scope: ProjectScope;
  query: TaskQuery;
  /** The dot on the filter icon. */
  filtered: boolean;
  empty: TasksEmpty;
} & (
  | { view: 'list'; groups: TaskCardGroup[] }
  | { view: 'board'; columns: (ReturnType<typeof boardColumns>[number] & { cards: TaskCard[] })[] }
);

/** Reviewer the In review notes fall back to for a task without one: #17's, as in the prototype. */
const FALLBACK_REVIEWER = TASK_REVIEWERS[17]?.split(' ')[0] ?? '';

/** Card view of task t for `role`. */
export function taskCard(s: TasksState, role: Role, t: TaskItem): TaskCard {
  const viewer = me(role);
  const days = dueIn(t);
  const late = days < 0;
  return {
    no: t.no,
    title: t.title,
    project: t.project,
    type: t.type,
    priority: t.priority,
    status: t.status,
    id: null,
    people: assignees(t).map((name) => ({ name, full: fullName(name) })),
    whoLabel: whoLabel(t),
    note: note(t, s.info[t.no], viewer, FALLBACK_REVIEWER),
    due: monthDay(t.due),
    late,
    lateOnBoard: late && t.status !== 'Done',
    lateBy: late ? daysLate(-days) : null,
    steps: stepsDone(s.info[t.no]?.steps ?? []),
    // The sample rule: every other column, for a viewer who may change the task.
    ...(mayChange(viewer, t)
      ? { moves: COLUMNS.map((c) => c.status).filter((x) => x !== t.status), denied: null }
      : { moves: [], denied: deniedNotice(t) }),
  };
}

/** One project's tasks, by the project's id in the projects store: a renamed project keeps its tasks. */
function sourceOf(s: TasksState, id: string): readonly TaskItem[] {
  const project = findProject(id);
  if (!project) throw new Error(`Cannot list the tasks of project "${id}": no such project`);
  return s.tasks.filter((t) => t.project === project.name);
}

/** A project's tasks, as a list or a board, for `role` (the Tasks tab itself reads tasks.list). */
export function getTasksList(
  role: Role,
  options: TasksListOptions,
  s: TasksState = getTasksState(),
): TasksList {
  const { scope, view, search = '' } = options;
  const query = options.query ?? getQuery(scope);
  const name = me(role).name;
  const card = (t: TaskItem) => taskCard(s, role, t);
  const filtered = isFiltered(query);
  const narrowed = filtered || !!search.trim();
  const base = { scope, query, filtered };
  const source = searchTasks(sourceOf(s, scope.slice(PROJECT_SCOPE.length)), search);
  if (view === 'board') {
    const tasks = applyQuery(source, query, { board: true, me: name });
    const columns = boardColumns(tasks).map((c) => ({ ...c, cards: c.tasks.map(card) }));
    // An empty board without filters keeps its empty columns (prototype); a narrowed one says so, with Reset (UX §4).
    return { ...base, view, columns, empty: !tasks.length && narrowed ? 'noMatch' : null };
  }
  const tasks = applyQuery(source, query, { me: name }).map(card);
  const groups: TaskCardGroup[] = tasks.length ? [{ title: null, tasks }] : [];
  return { ...base, view, groups, empty: groups.length ? null : 'noMatch' };
}
