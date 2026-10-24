import { monthDay } from './dates';
import { me } from './people';
import { PROJECTS, type Role, TASK_REVIEWERS } from './sample';
import { boardColumns } from './tasks.columns';
import { buildTaskDetail, type TaskDetailView } from './tasks.detail';
import { myGroups } from './tasks.groups';
import {
  applyQuery,
  isFiltered,
  projectOfScope,
  searchTasks,
  type TaskQuery,
  type TaskScope,
} from './tasks.query';
import { getQuery } from './tasks.query-state';
import {
  assigned,
  assignees,
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
 * Tasks data in one call per screen, the swap point to the API: today built from the sample data in tasks.store,
 * later a fetch of /api/app/tasks returning the same shapes. Screens import their getters from here; a screen that
 * re-renders on changes passes the state it read with useTasks((s) => s) as `s`.
 */

export { getTaskEdit, getTaskForm } from './tasks.form';
export { getTaskSettings } from './tasks.settings';
export { getCsvImport, getQuickWrite } from './tasks.write';

/** A task card as the lists and the board show it, from the viewer's side. */
export type TaskCard = Pick<
  TaskItem,
  'no' | 'title' | 'project' | 'type' | 'priority' | 'status'
> & {
  people: { name: string; full: string }[];
  /** "Nico Pratama +1". */
  whoLabel: string;
  note: string;
  /** "Oct 5". */
  due: string;
  /** Lists: past due. Board: past due and not Done. */
  late: boolean;
  lateOnBoard: boolean;
  /** "2/3", or null without steps. */
  steps: string | null;
  /** The viewer may move, edit and cancel it (a Member only their own). */
  mayChange: boolean;
};

export type TaskCardGroup = { title: string | null; tasks: TaskCard[] };

export type TasksListOptions = {
  scope: TaskScope;
  view: 'list' | 'board';
  /** Defaults to the scope's applied query (tasks.query-state). */
  query?: TaskQuery;
  search?: string;
};

/** none = My tasks has no tasks at all (New task); noMatch = the query or search leaves nothing (Reset filters). */
export type TasksEmpty = 'none' | 'noMatch' | null;

export type TasksList = {
  scope: TaskScope;
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
  const late = dueIn(t) < 0;
  return {
    no: t.no,
    title: t.title,
    project: t.project,
    type: t.type,
    priority: t.priority,
    status: t.status,
    people: assignees(t).map((name) => ({ name, full: fullName(name) })),
    whoLabel: whoLabel(t),
    note: note(t, s.info[t.no], viewer, FALLBACK_REVIEWER),
    due: monthDay(t.due),
    late,
    lateOnBoard: late && t.status !== 'Done',
    steps: stepsDone(s.info[t.no]?.steps ?? []),
    mayChange: mayChange(viewer, t),
  };
}

/** Tasks a scope starts from: mine, every listed task, or one project's. */
function sourceOf(s: TasksState, scope: TaskScope, name: string): readonly TaskItem[] {
  if (scope === 'mine') return s.tasks.filter((t) => assigned(t, name));
  const id = projectOfScope(scope);
  if (!id) return s.tasks;
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) throw new Error(`Cannot list the tasks of project "${id}": no such project`);
  return s.tasks.filter((t) => t.project === project.name);
}

/** My tasks / All tasks / a project's tasks, as a list or a board, for `role`. */
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
  if (view === 'board') {
    const source = searchTasks(sourceOf(s, scope, name), search);
    const tasks = applyQuery(source, query, { board: true, me: name });
    const columns = boardColumns(tasks).map((c) => ({ ...c, cards: c.tasks.map(card) }));
    return { ...base, view, columns, empty: null };
  }
  // My tasks reads every task: its review queue spans the team, myGroups picks the viewer's own.
  const groups: TaskCardGroup[] =
    scope === 'mine'
      ? myGroups(role, searchTasks(s.tasks, search), query, name).map((g) => ({
          title: g.title,
          tasks: g.tasks.map(card),
        }))
      : [
          {
            title: null,
            tasks: applyQuery(searchTasks(sourceOf(s, scope, name), search), query, {
              me: name,
            }).map(card),
          },
        ].filter((g) => g.tasks.length);
  const empty: TasksEmpty = groups.length
    ? null
    : scope === 'mine' && !narrowed
      ? 'none'
      : 'noMatch';
  return { ...base, view, groups, empty };
}

/** Detail of task #no for `role`; null when there is no such task. */
export const getTaskDetail = (
  role: Role,
  no: number,
  s: TasksState = getTasksState(),
): TaskDetailView | null => buildTaskDetail(s, role, no);
