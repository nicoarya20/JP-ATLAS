// What the prototype's projects carry beyond the shared sample (riset-keano/prototype-react/src/data/sample.js
// `projects`, `atlas`): health and the Atlas detail. Dates ISO. The AI story draft and the templates went with the New
// project ways that showed them (gap doc §3, P-10).

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
