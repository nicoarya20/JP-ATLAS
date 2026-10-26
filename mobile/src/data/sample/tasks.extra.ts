import type { TaskInfo, TaskItem, TaskPriority, TaskType } from '../tasks.shared';

/*
 * Tasks module extras on top of the shared sample tasks (sample/tasks.ts, which stays as it is): each task's next step,
 * last update and tags, the detail extras (the prototype's taskDetail), the "Just write ✦" sample and the CSV preview.
 * Ported from riset-keano/prototype-react/src/data/sample.js with dates as ISO. Reviewers come from TASK_REVIEWERS.
 */

export const TASK_EXTRA: Record<number, Pick<TaskItem, 'next' | 'updated' | 'tags'>> = {
  12: { next: 'Request review', updated: '2026-10-07T08:15', tags: ['sso', 'login'] },
  17: { next: 'Review', updated: '2026-10-06T16:20', tags: ['profile'] },
  14: { next: 'Start', updated: '2026-10-05T10:00', tags: ['api'] },
  15: { next: 'Start', updated: '2026-10-04T14:30', tags: ['design'] },
  16: { next: 'Start', updated: '2026-10-02T09:10', tags: ['testing'] },
  8: { next: 'Reopen', updated: '2026-09-20T17:45', tags: [] },
  9: { next: 'Start', updated: '2026-10-06T11:05', tags: [] },
};

export const TASK_DETAIL: Record<number, Omit<TaskInfo, 'reviewer'>> = {
  14: {
    phase: 'Development',
    desc: 'Write the login and profile endpoint spec for the mobile team.',
    by: 'Nico',
    on: '2026-10-05',
    steps: [],
    proof: [],
    history: [{ text: 'Nico created this task', on: '2026-10-05' }],
  },
  12: {
    phase: 'Development',
    desc: 'SSO login fails on staging after the redirect.',
    by: 'Rina',
    on: '2026-10-03',
    steps: [
      { text: 'Check the SSO config on staging', done: true },
      { text: 'Fix the redirect after login', done: true },
      { text: 'Retest in Safari and Chrome', done: false },
    ],
    proof: [
      { file: 'login-screenshot.png', caption: '"Redirect is correct in Chrome" · Nico · Oct 6' },
    ],
    history: [
      { text: 'Rina created this task', on: '2026-10-03' },
      { text: 'Nico started working', on: '2026-10-04' },
      { text: 'Dodi: "the error still shows on staging"', on: '2026-10-06' },
      { text: 'Nico attached proof login-screenshot.png', on: '2026-10-06' },
    ],
  },
  17: {
    phase: 'Development',
    desc: "The save button can't be tapped on phones.",
    by: 'Nico',
    on: '2026-10-05',
    asked: { by: 'Dodi', on: '2026-10-07' },
    steps: [
      { text: 'Reproduce on Android', done: true },
      { text: 'Fix the button hit area', done: true },
    ],
    proof: [
      { file: 'before.png', caption: "The button can't be tapped on phones" },
      { file: 'after.png', caption: 'The save button now works on phone and desktop' },
    ],
    history: [
      { text: 'Dodi started working', on: '2026-10-06' },
      { text: 'Dodi requested review · reviewer: Nico', on: '2026-10-07' },
    ],
  },
};

export type QuickDraft = {
  title: string;
  who: string;
  /** ISO due date and the word the prototype puts after it: "Oct 8 (tomorrow)". */
  due: string;
  dueHint: string;
  priority: TaskPriority;
  type: TaskType;
};

/** "Just write ✦" input and its AI draft (no LLM: the draft is sample data). */
export const QUICK_WRITE: { text: string; drafts: QuickDraft[]; ask: string[] } = {
  text: 'Rina fix the login page tomorrow, important. Dodi prepare test data before Friday.',
  drafts: [
    {
      title: 'Fix the login page',
      who: 'Rina',
      due: '2026-10-08',
      dueHint: 'tomorrow',
      priority: 'High',
      type: 'Bug',
    },
    {
      title: 'Prepare test data',
      who: 'Dodi',
      due: '2026-10-09',
      dueHint: 'Friday',
      priority: 'Medium',
      type: 'Task',
    },
  ],
  ask: ['Rina Wulandari', 'Rina Pratiwi'],
};

/** New task · Fill form description sample. */
export const FORM_DESC =
  'The login page layout breaks on phones. Fix it before the staging release.';

export type CsvState = 'ready' | 'error' | 'note';

export type CsvRow = {
  title: string;
  /** Assignee email; null = the cell is empty. */
  email: string | null;
  /** ISO due date; null = the cell is empty. */
  due: string | null;
  state: CsvState;
  note: string;
};

/** State label per CSV row state, verbatim from the prototype. */
export const CSV_STATE_LABEL: Record<CsvState, string> = {
  ready: '✓ Ready',
  error: '✕ Error',
  note: 'Note',
};

/** CSV import preview (Tasks ⑦). */
export const CSV_PREVIEW: { file: string; rows: CsvRow[] } = {
  file: 'atlas-tasks.csv',
  rows: [
    {
      title: 'Create the FAQ page',
      email: 'rina@kantor.id',
      due: '2026-10-15',
      state: 'ready',
      note: '',
    },
    {
      title: 'Test login on Android',
      email: 'dodi@kantor.id',
      due: '2026-10-12',
      state: 'error',
      note: "Type 'QC' doesn't exist in this project",
    },
    {
      title: 'Fix the menu icon',
      email: 'budi@kantor.id',
      due: '2026-10-10',
      state: 'note',
      note: 'budi@kantor.id is not an Atlas member, imported without an assignee',
    },
    {
      title: 'Write the user guide',
      email: 'nico@kantor.id',
      due: '2026-10-20',
      state: 'ready',
      note: '',
    },
    { title: 'Tidy up button labels', email: null, due: null, state: 'ready', note: '' },
  ],
};
