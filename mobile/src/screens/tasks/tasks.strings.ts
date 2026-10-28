// Copy of the Tasks screens, verbatim from the prototype (screens/tasks/*.jsx). Copy that depends on data (notes, facts,
// notices after an action) comes from src/data/tasks*.ts instead.
import { countedTasks } from '@/data/tasks.columns';

export const S = {
  title: 'Tasks',
  search: 'Search title, #number, or tag…',
  /** What `q` matches on the server: part of the title, or a task number exactly, "12" or "#12" (T-5). */
  searchServer: 'Search title or #number…',
  scopes: ['My tasks', 'All tasks'],
  views: ['List', 'Kanban'],
  due: (date: string) => `Due ${date}`,
  /** A card's date line: "Due Oct 5", or this for a task without a due date. */
  noDue: 'No due date',
  empty: {
    icon: 'No tasks',
    title: 'No tasks for you yet.',
    text: 'Tasks assigned to you will show up here.',
    action: 'New task',
    /** All tasks with nothing in it: no task in any project the viewer can see. */
    allTitle: 'No tasks yet.',
    allText: 'Tasks in your projects will show up here.',
  },
  noMatch: {
    title: 'No tasks match these filters.',
    text: 'Change the filters, or reset them to see the whole list.',
  },
  filter: {
    status: 'Status',
    project: 'Project',
    allProjects: 'All projects',
    assignee: 'Assignee',
    priority: 'Priority',
    sort: 'Sort by',
  },
  board: {
    label: 'Kanban board',
    /** `count` is what the column shows by its name ("3", "25+"). */
    column: (status: string, count: string) => `${status}, ${countedTasks(count)}`,
    select: 'Select',
    cancel: 'Cancel',
    selectAll: (all: boolean, status: string) =>
      `${all ? 'Deselect' : 'Select'} all ${status} tasks`,
    addTask: 'Add task',
    moveFailed: 'Could not move. Try again.',
    loadMore: 'Load more',
  },
  radial: {
    close: 'Close',
    now: 'Now',
    dialog: (group: boolean, n: number, card: string) =>
      group ? `Move ${n} tasks` : `Move ${card}`,
    head: (group: boolean, n: number, card: string) => (group ? `${n} tasks` : card),
    hold: 'Slide to a status and let go',
    tap: (group: boolean) => `Tap a status to move the task${group ? 's' : ''}`,
  },
  detail: {
    title: 'Task detail',
    menu: 'Task actions',
    menuItem: { edit: 'Edit task', cancel: 'Cancel task' },
    description: 'Description',
    noDescription: 'No description yet.',
    history: 'Chat & history',
    noHistory: 'Nothing has happened yet.',
    loadMore: 'Load more',
    comment: 'Write a comment…',
    commentLabel: 'Comment',
    commentMissing: 'Write a comment to send it.',
    send: 'Send',
    addStep: '+ Add step',
    noSteps: 'No steps yet.',
    stepLabel: 'New step',
    stepHint: 'Describe the step…',
    stepSave: 'Add',
    stepMissing: 'Describe the step to add it.',
    saving: 'Saving',
    /** A task whose `can{}` offers nothing: no step, no change, no menu. */
    viewOnly: 'You can view this task, but not change it.',
    // Not in the prototype, which never opens a task that is gone: the server answers a missing, trashed or hidden
    // task the same way (404).
    missing: 'This task is no longer here.',
    missingText: 'It may have been deleted, or you no longer have access to it.',
  },
  sheet: {
    /** Field adds the star of 'Reason *'. */
    reason: 'Reason',
    reopenTitle: 'Reopen task',
    reopenHint: 'Why does it need more work?',
    reopenNote: 'The task goes back to In progress, and the reason is kept in its history.',
    reopenAction: 'Reopen',
    cancelTitle: 'Cancel task',
    /** Labelled adds the star of 'Why cancel? *'. */
    why: 'Why cancel?',
    /** 'Note * (required for Other)'; Field adds the star (at the end) once Other is picked. */
    note: 'Note (required for Other)',
    noteHint: 'Add a note…',
    cancelNote:
      'The task stays in the project, marked Canceled, and can be restored from its detail.',
    back: 'Back',
    cancelAction: 'Cancel task',
  },
} as const;

/** Edit task, New task (Just write ✦ / Fill form), Import CSV and Project settings. */
export const F = {
  editTitle: 'Edit task',
  newTitle: 'New task',
  modes: ['Just write ✦', 'Fill form'],
  title: 'Title',
  assignee: 'Assignee',
  unassigned: 'Unassigned',
  /** Assignee's hint while the project's people load. */
  peopleLoading: 'Loading the project’s people…',
  due: 'Due date',
  priority: 'Priority',
  type: 'Type',
  phase: 'Phase',
  noPhase: 'No phase',
  project: 'Project',
  description: 'Description',
  descHint: 'What needs to be done…',
  start: 'Start date',
  more: 'Show more',
  less: 'Show less',
  /** Edit task: where the rest of a task changes. */
  statusNote: "Status changes from the task's buttons or the Kanban board, and steps on its page.",
  cancel: 'Cancel',
  save: 'Save',
  created: 'Task created',
  updated: 'Task updated',
  back: 'Back',
  /** New task when form-options lists no project (the server decides who may add tasks where). */
  noProjects: 'No project to add a task to',
  noProjectsText: 'You can add tasks to projects you work in. Ask a project manager to add you.',
  /** Edit task when `can.update` is absent or a deny code. */
  locked: "You can't edit this task",
  lockedText: 'You can view this task, but not change it.',
  /** Edit task when form-options answers 404 for the task's project. */
  noProject: 'This project is no longer here',
  noProjectText: 'It may be in the Trash, or you no longer have access to it.',
} as const;
