// Copy of the Tasks screens, verbatim from the prototype (screens/tasks/*.jsx). Copy that depends on data (notes, facts,
// notices after an action) comes from src/data/tasks*.ts instead.
import { tasksCount } from '@/data/tasks.columns';

export const S = {
  title: 'Tasks',
  search: 'Search title, #number, or tag…',
  /** The server matches the title or an exact number; prefixes and tags it cannot (A15). */
  searchServer: 'Search title or exact #number…',
  more: 'Load more',
  scopes: ['My tasks', 'All tasks'],
  views: ['List', 'Kanban'],
  due: (date: string) => `Due ${date}`,
  empty: {
    icon: 'No tasks',
    title: 'No tasks for you yet.',
    text: 'Tasks assigned to you will show up here.',
    action: 'New task',
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
    column: (status: string, n: number) => `${status}, ${tasksCount(n)}`,
    select: 'Select',
    cancel: 'Cancel',
    selectAll: (all: boolean, status: string) =>
      `${all ? 'Deselect' : 'Select'} all ${status} tasks`,
    addTask: 'Add task',
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
    menuItem: { edit: 'Edit task', cancel: 'Cancel task', archive: 'Move to Archive' },
    returnTask: 'Return',
    restore: 'Restore',
    description: 'Description',
    history: 'Chat & history',
    comment: 'Write a comment… (@name to mention)',
    commentLabel: 'Comment',
    /** The Edit form still lists evidence from the sample store; the detail no longer shows any (A5). */
    photo: 'Photo',
    undo: 'Undo',
    /** Nobody is working on the task; the fact says so instead of being left blank. */
    unassigned: 'Unassigned',
    /** After a step the server accepted. */
    done: {
      start: 'Task started',
      markDone: 'Marked as done',
      reopen: 'Task reopened',
      restore: 'Task restored',
      canceled: 'Task canceled',
      archived: 'Task moved to Archive',
      unarchived: 'Task restored',
      commented: 'Comment added',
    },
    /** When the server refused and sent no sentence of its own to show. */
    failed: 'Could not do that. Try again.',
    send: 'Send',
    // Not in the prototype, which never opens a task that is gone: a deep link to one deleted from Archive.
    missing: 'This task is no longer here.',
    missingText: 'It may have been deleted, or moved to Archive.',
  },
  sheet: {
    returnTitle: 'Return task',
    quick: 'Quick pick (fills the reason)',
    /** Field adds the star of 'Reason *'. */
    reason: 'Reason',
    reasonHint: 'Explain what needs fixing…',
    returnNote: (n: number, who: string) =>
      `The task goes back to In progress and is logged as "Returned ×${n}". ${who} gets a notification.`,
    cancel: 'Cancel',
    returnAction: 'Return',
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
    reopenTitle: 'Reopen task',
    reopenAction: 'Reopen',
    reopenHint: 'Say what still needs doing…',
    reopenNote:
      'The task goes back to In progress with this reason in its history. Everyone following it is notified.',
  },
} as const;

/** Edit task, New task (Just write ✦ / Fill form), Import CSV and Project settings. */
export const F = {
  editTitle: 'Edit task',
  newTitle: 'New task',
  modes: ['Just write ✦', 'Fill form'],
  title: 'Title',
  assignee: 'Assignee',
  pickOne: 'Pick at least one person.',
  due: 'Due date',
  priority: 'Priority',
  type: 'Type',
  phase: 'Phase',
  project: 'Project',
  description: 'Description',
  descHint: 'What needs to be done…',
  start: 'Start date',
  hours: 'Estimated hours',
  more: 'Show more',
  less: 'Show less',
  review: {
    title: 'Needs review',
    yes: 'Yes',
    locked: 'Locked while the task is in review.',
    managerOnly: 'Only a Manager or Admin can turn it off.',
    reviewer: 'Reviewer',
    memberNote: 'A Manager or Admin of the project reviews it.',
    projectNote: (project: string) =>
      `Needs review starts from the project setting (${project.split(' ')[0]}: off).`,
  },
  tags: {
    label: 'Tag',
    add: 'Add tag',
    hint: 'Type a tag, then Enter…',
    remove: (t: string) => `Remove tag ${t}`,
  },
  steps: {
    title: 'Steps',
    done: (n: number) => `Step ${n} done`,
    step: (n: number) => `Step ${n}`,
    hint: 'Describe the step…',
    remove: (n: number) => `Remove step ${n}`,
    add: '+ Add step',
  },
  evidence: {
    title: 'Evidence',
    caption: (file: string) => `Caption for ${file}`,
    hint: 'Add a caption…',
    remove: (file: string) => `Remove ${file}`,
    attach: '+ Attach evidence',
  },
  statusNote: "Status changes from the task's buttons or the Kanban board.",
  cancel: 'Cancel',
  save: 'Save',
  created: 'Task created',
  back: 'Back',
} as const;
