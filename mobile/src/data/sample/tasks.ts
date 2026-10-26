// Sample tasks from the prototype; `due` and `doneOn` as ISO dates, `when` is the prototype's own label.

export type TaskStatus = 'To do' | 'In progress' | 'In review' | 'Done' | 'Canceled';

export type Task = {
  no: number;
  title: string;
  project: string;
  type: 'Task' | 'Bug';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: TaskStatus;
  who: string;
  /** Further assignees after `who`. */
  also?: string[];
  due: string;
  when: string;
  /** Completion date of a Done task. */
  doneOn?: string;
};

export const TASKS: Task[] = [
  {
    no: 12,
    title: 'Fix SSO login',
    project: 'Atlas Project',
    type: 'Bug',
    priority: 'High',
    status: 'In progress',
    who: 'Nico',
    due: '2026-10-05',
    when: '2 days overdue',
  },
  {
    no: 17,
    title: 'Fix the save button on the profile page',
    project: 'Atlas Project',
    type: 'Bug',
    priority: 'Medium',
    status: 'In review',
    who: 'Dodi',
    due: '2026-10-08',
    when: 'Awaiting my review',
  },
  {
    no: 14,
    title: 'Write the API spec',
    project: 'Atlas Project',
    type: 'Task',
    priority: 'Medium',
    status: 'To do',
    who: 'Nico',
    due: '2026-10-07',
    when: 'Today',
  },
  {
    no: 15,
    title: 'Review the onboarding page design',
    project: 'Atlas Project',
    type: 'Task',
    priority: 'Medium',
    status: 'To do',
    who: 'Rina',
    due: '2026-10-09',
    when: 'This week',
  },
  {
    no: 16,
    title: 'Prepare test data',
    project: 'Atlas Project',
    type: 'Task',
    priority: 'Medium',
    status: 'To do',
    who: 'Dodi',
    due: '2026-10-16',
    when: 'Next week',
  },
  {
    no: 8,
    title: 'Draft the architecture design',
    project: 'Atlas Project',
    type: 'Task',
    priority: 'High',
    status: 'Done',
    who: 'Nico',
    due: '2026-09-20',
    when: 'Done Sep 20',
    doneOn: '2026-09-20',
  },
  {
    no: 9,
    title: 'Progress report for PT Sinar',
    project: 'PT Sinar Client Portal',
    type: 'Task',
    priority: 'Medium',
    status: 'To do',
    who: 'Nico',
    due: '2026-10-08',
    when: 'Tomorrow',
  },
];

/** Reviewer per task number (prototype taskDetail); a task with a reviewer cannot be marked done straight from Home. */
export const TASK_REVIEWERS: Record<number, string> = {
  12: 'Admin',
  17: 'Nico (creator, Manager)',
};
