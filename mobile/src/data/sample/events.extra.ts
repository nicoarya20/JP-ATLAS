// Event fields the shared sample (./events.ts) leaves out, from the prototype's sample.js: who created each event, its
// note-taker, agenda, repeat and last update, plus the kickoff's confirmed outcomes and the stand-up minutes. Dates are
// ISO; the list group and day label are derived from the event's date (src/data/events.dates.ts), not copied.

export type Repeat = 'daily' | 'every week' | 'every 2 weeks';

export type EventExtra = {
  creator: string;
  noteTaker?: string;
  agenda?: string[];
  repeat?: Repeat;
  /** Date of the last change (ISO). */
  updated?: string;
};

export const EVENT_EXTRA: Record<string, EventExtra> = {
  kickoff: { creator: 'Nico', noteTaker: 'Dodi' },
  review: {
    creator: 'Rina',
    noteTaker: 'Dodi',
    updated: '2026-10-07',
    agenda: ['New onboarding flow', 'Feedback from the trial users', 'Trial schedule'],
  },
  daily: { creator: 'Nico' },
  sinar: { creator: 'Nico' },
  sprint: {
    creator: 'Nico',
    repeat: 'every 2 weeks',
    updated: '2026-09-25',
    agenda: [
      "Demo of this sprint's work",
      'What went well and what to fix',
      'Plan for the next sprint',
    ],
  },
  rehearsal: { creator: 'Nico' },
  party: { creator: 'Ayu' },
};

/** An open question carried to the next meeting. */
export type OpenQuestion = { text: string; meta: string };

/** A task the kickoff's outcomes created, with its status when they were confirmed. */
export type ResultTask = { no: number; title: string; status: string };

/** Confirmed outcomes of "Atlas kickoff" (prototype D.kickoff; minutes from events.confirmed.jsx). */
export const EVENT_RESULTS = {
  /** Id of the event these outcomes belong to. */
  event: 'kickoff',
  when: 'Thu, Oct 1, 2026 · 10:00–11:00 AM · Meeting Room 1',
  confirmed: 'Confirmed by Nico · Oct 1, 2026, 11:40 AM',
  tasks: [
    { no: 8, title: 'Draft the architecture design', status: 'Done' },
    { no: 12, title: 'Fix SSO login', status: 'In progress' },
    { no: 14, title: 'Write the API spec', status: 'To do' },
  ] satisfies ResultTask[],
  decisions: [
    'Login uses the office SSO, not separate accounts',
    'Trial with 5 older users before release',
  ],
  info: ['Server budget approved through December'],
  question: {
    text: 'Who contacts PT Sinar about the demo schedule?',
    meta: 'For Nico · unanswered · carried to the next meeting agenda',
  } satisfies OpenQuestion,
  /** Source line, split where the prototype splits it: what the minutes came from, then who wrote and reviewed them. */
  source: ['Source: whiteboard photo (1)', 'Written by Dodi · reviewed by Nico'] as const,
  minutes:
    'Kickoff for Atlas Project. Login will use the office SSO instead of separate accounts. Before release we trial the app with 5 older users. The server budget is approved through December.',
};

/** A task the AI drafted from the stand-up; `due` is an ISO date, empty until someone picks one. */
export type DraftTask = { title: string; who: string; due: string };

/** Stand-up recording → transcript → draft tasks (prototype D.standup, Events ⑤a–⑥). */
export const STANDUP = {
  length: '14 min 52 sec',
  saved: 'Saved Oct 7, 9:16 AM',
  transcript: [
    'Agenda: SSO progress, test data, staging release.',
    'Nico: SSO login still errors on staging. Rina will fix the login page before Friday.',
    'Dodi prepares test data once SSO is fixed.',
    'Agreed: staging release moves to Monday, October 12.',
    'Info: staging server maintenance Thursday night.',
    'Rina asked: does the client need a demo before release? Nico will answer.',
  ],
  by: 'Written by Dodi (note-taker) · last edited 9:20 AM',
  tasks: [
    { title: 'Fix the login page before Friday', who: 'Rina', due: '2026-10-09' },
    { title: 'Prepare test data once SSO is fixed', who: 'Dodi', due: '' },
  ] satisfies DraftTask[],
  decisions: ['Staging release moves to Monday, October 12'],
  info: ['Staging server maintenance Thursday night'],
  question: {
    text: 'Does the client need a demo before release?',
    meta: 'For Nico · unanswered · carried to the next meeting agenda',
  } satisfies OpenQuestion,
};
