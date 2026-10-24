// "Needs your response" cards of the prototype Inbox (sample.inbox.js); Home only counts them. Admin reads the PM view.

export type InboxCard = { title: string; sub: string; meta: string; action: string };

/** PM view (Nico); Admin uses it too, as in the prototype. */
const PM_RESPOND: InboxCard[] = [
  {
    title: 'Dodi asked you to review a task',
    sub: 'Fix the save button on the profile page',
    meta: '#17 · Atlas Project · 10 min ago',
    action: 'Review',
  },
  {
    title: 'Meeting outcomes need your confirmation',
    sub: 'Atlas daily stand-up · 2 tasks, 1 decision, 1 info, 1 question',
    meta: 'Atlas Project · 1 hour ago',
    action: 'Check outcomes',
  },
  {
    title: 'Rina mentioned you in task #12 Fix SSO login',
    sub: '"@Nico can we try the SSO yet?"',
    meta: 'Atlas Project · 2 hours ago',
    action: 'Reply',
  },
];

/** Dodi (Member). */
const MEMBER_RESPOND: InboxCard[] = [
  {
    title: 'Nico assigned you a task',
    sub: 'Prepare test data',
    meta: '#16 · Atlas Project · 20 min ago',
    action: 'View',
  },
  {
    title: 'Rina invited you to an event',
    sub: 'Onboarding design review · Today 2:00–3:00 PM · Meeting Room 2',
    meta: 'Atlas Project · 1 hour ago',
    action: 'View',
  },
  {
    title: 'Nico mentioned you in task #12 Fix SSO login',
    sub: '"@Dodi is the error still showing on staging?"',
    meta: 'Atlas Project · 2 hours ago',
    action: 'Reply',
  },
];

export const INBOX_RESPOND = { member: MEMBER_RESPOND, pm: PM_RESPOND, admin: PM_RESPOND } as const;
