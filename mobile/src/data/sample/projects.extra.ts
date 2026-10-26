// What the prototype's projects carry beyond the shared sample (riset-keano/prototype-react/src/data/sample.js
// `projects`, `atlas`, `story`, `templates`): health, the Atlas detail, the AI story draft and the templates. Dates ISO.

/** Project role of a member (prototype projects.tabs.jsx ROLE). */
export type ProjectRole = 'Manager' | 'Member' | 'Viewer';

/** Health line of a project card: "! Needs attention · 1 important task overdue". */
export type ProjectExtra = {
  health: string;
  /** Why it has that health; '' = health alone. */
  why: string;
  /** Deadline pill of the detail header ("Extended ×1"). */
  extended?: string;
  /** Start date, known for Atlas only. */
  started?: string;
};

export const PROJECT_EXTRA: Record<string, ProjectExtra> = {
  atlas: {
    health: '! Needs attention',
    why: '1 important task overdue',
    extended: 'Extended ×1',
    started: '2026-09-01',
  },
  sinar: { health: '! Needs attention', why: '2 critical bugs overdue' },
  migration: { health: 'Overdue', why: 'deadline passed 7 days ago' },
  tools: { health: '✓ On track', why: 'on schedule' },
  attendance: { health: 'No tasks yet', why: '' },
  website: { health: '✓ Done', why: '' },
};

/** Project roles that differ from the default (the Lead is Manager, everyone else Member). */
export const PROJECT_ROLES: Record<string, Record<string, ProjectRole>> = {
  // Sri joined Atlas as Observer, the prototype's Viewer
  atlas: { Sri: 'Viewer' },
};

export type PhaseState = 'Done' | 'In progress' | 'Not started';

export type Phase = {
  name: string;
  start: string;
  end: string;
  state: PhaseState;
  /** Milestone at the end of the phase; reached = its date has been met. */
  milestone?: { name: string; date: string; reached: boolean };
};

/** One line of Recent activity. */
export type ActivityLine = { text: string; on: string };

export type ProjectDetailSample = {
  /** Progress of the phase in progress, in %. */
  phasePct: number;
  phases: Phase[];
  activity: ActivityLine[];
  deadlineHistory: {
    from: string;
    to: string;
    reason: string;
    note: string;
    by: string;
    on: string;
  };
  /** Extend deadline sheet, filled in as in the prototype. */
  extend: { next: string; reason: string; impact: string };
};

/** Only Atlas has a full detail in the sample (orchestrator, 2026-10-25). */
export const PROJECT_DETAIL: Record<string, ProjectDetailSample> = {
  atlas: {
    phasePct: 60,
    phases: [
      {
        name: 'Planning',
        start: '2026-09-01',
        end: '2026-09-24',
        state: 'Done',
        milestone: { name: 'Design approved', date: '2026-09-24', reached: true },
      },
      {
        name: 'Development',
        start: '2026-09-25',
        end: '2026-10-20',
        state: 'In progress',
        milestone: { name: 'Beta release', date: '2026-10-20', reached: false },
      },
      { name: 'Testing', start: '2026-10-21', end: '2026-10-27', state: 'Not started' },
      { name: 'Release', start: '2026-10-28', end: '2026-10-31', state: 'Not started' },
    ],
    activity: [
      { text: 'Nico extended the deadline Oct 15 → Oct 31', on: '2026-10-01' },
      { text: 'Nico started the Development phase', on: '2026-09-28' },
      { text: 'Sri was added as Observer', on: '2026-09-25' },
      { text: 'Milestone "Design approved" reached', on: '2026-09-24' },
    ],
    deadlineHistory: {
      from: '2026-10-15',
      to: '2026-10-31',
      reason: 'Scope grew',
      note: '"Add SSO login"',
      by: 'Nico',
      on: '2026-10-01',
    },
    extend: {
      next: '2026-11-14',
      reason: 'Client asked to add an attendance report',
      impact: '3 tasks and 1 milestone go past the old deadline.',
    },
  },
};

/** Task type the AI draft picks (prototype projects.draft.jsx). */
export type DraftType = 'Task' | 'Bug' | 'Idea';

export type StoryPhase = {
  name: string;
  start: string;
  end: string;
  milestone: string;
  tasks: { title: string; type: DraftType }[];
};

export type ProjectStory = {
  text: string;
  summary: string;
  /** Sample project the draft becomes (its name heads Project info). */
  project: string;
  start: string;
  end: string;
  months: number;
  /** People the story names, as person keys; the signed-in one is left out. */
  helpers: string[];
  phases: StoryPhase[];
};

/** The attendance story and the draft the "AI" builds from it (no LLM in Phase 1). */
export const PROJECT_STORY: ProjectStory = {
  text: 'We want to build an employee attendance app on phones, using a selfie photo and location. Target 2 months, Dodi and Rina help.',
  summary: 'Employee attendance app on phones with selfie photo and location',
  project: 'attendance',
  start: '2026-10-07',
  end: '2026-12-07',
  months: 2,
  helpers: ['dodi', 'rina'],
  phases: [
    {
      name: 'Planning',
      start: '2026-10-07',
      end: '2026-10-16',
      milestone: 'Design approved',
      tasks: [
        { title: 'Collect attendance requirements', type: 'Task' },
        { title: 'Design the screens', type: 'Task' },
      ],
    },
    {
      name: 'Development',
      start: '2026-10-17',
      end: '2026-11-20',
      milestone: 'Selfie & location features ready',
      tasks: [
        { title: 'Build the selfie photo feature', type: 'Task' },
        { title: 'Build the location check', type: 'Task' },
        { title: 'Build the attendance report', type: 'Task' },
      ],
    },
    {
      name: 'Testing',
      start: '2026-11-21',
      end: '2026-11-30',
      milestone: 'Trial finished',
      tasks: [
        { title: 'Trial with 10 employees', type: 'Task' },
        { title: 'Fix issues from the trial', type: 'Bug' },
      ],
    },
    {
      name: 'Release',
      start: '2026-12-01',
      end: '2026-12-07',
      milestone: 'Used by all employees',
      tasks: [{ title: 'Install the app on employee phones', type: 'Task' }],
    },
  ],
};

export type ProjectTemplate = {
  id: string;
  name: string;
  days: number;
  phases: number;
  tasks: number;
  types: number;
  from: string;
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'internal-app',
    name: 'Internal app',
    days: 60,
    phases: 4,
    tasks: 8,
    types: 3,
    from: 'From the story "Attendance App"',
  },
  {
    id: 'company-website',
    name: 'Company website',
    days: 45,
    phases: 3,
    tasks: 10,
    types: 3,
    from: 'From the project "Company Profile Website"',
  },
  {
    id: 'data-migration',
    name: 'Data migration',
    days: 30,
    phases: 3,
    tasks: 8,
    types: 3,
    from: 'From the project "Legacy Data Migration"',
  },
];

/** Use template, filled in as in the prototype: a new project starting Mon, Oct 12. */
export const TEMPLATE_PROJECT = { name: 'Leave Request App', start: '2026-10-12' };
