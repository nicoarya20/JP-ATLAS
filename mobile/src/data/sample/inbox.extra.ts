// "Latest updates" of the prototype Inbox (sample.inbox.js `updates`, inbox.shared.js ADMIN_UPDATES), next to the
// "Needs your response" cards in inbox.ts. Each update is written for the signed-in person ("you").

export type InboxDay = 'Today' | 'Yesterday';

/** One update; the last part of `meta` ("30 min ago") is its time. */
export type InboxUpdate = { day: InboxDay; title: string; meta: string };

/** PM view (Nico). */
const PM_UPDATES: InboxUpdate[] = [
  {
    day: 'Today',
    title: 'Rina commented on task #14 Write the API spec',
    meta: 'Atlas Project · 30 min ago',
  },
  {
    day: 'Today',
    title: 'Rina invited you to Onboarding design review',
    meta: 'Wed, Oct 7 · 2:00–3:00 PM · Meeting Room 2 · 1 hour ago',
  },
  {
    day: 'Today',
    title: '5 changes on task #12 Fix SSO login',
    meta: 'Status, steps, and proof changed by Dodi · Atlas Project · 3 hours ago',
  },
  {
    day: 'Yesterday',
    title: 'Dodi started working on task #17 Fix the save button on the profile page',
    meta: 'Atlas Project · Yesterday 4:40 PM',
  },
  {
    day: 'Yesterday',
    title: 'Ayu created the event Office anniversary party',
    meta: 'Thu, Oct 15 · 4:00–5:00 PM · Pantry, 3rd floor · Yesterday 9:15 AM',
  },
];

/** Dodi (Member). */
const MEMBER_UPDATES: InboxUpdate[] = [
  {
    day: 'Today',
    title: 'Nico commented on task #17 Fix the save button on the profile page',
    meta: 'Atlas Project · 30 min ago',
  },
  {
    day: 'Today',
    title: 'Nico moved the Atlas staging release to Mon, Oct 12',
    meta: 'Atlas Project · 1 hour ago',
  },
  {
    day: 'Yesterday',
    title: 'Nico added you to Atlas sprint review',
    meta: 'Fri, Oct 9 · 1:00–2:00 PM · Meeting Room 1 · Yesterday 3:20 PM',
  },
  {
    day: 'Yesterday',
    title: 'Ayu created the event Office anniversary party',
    meta: 'Thu, Oct 15 · 4:00–5:00 PM · Pantry, 3rd floor · Yesterday 9:15 AM',
  },
];

/** Ayu (Admin): her own feed; the PM feed is written for Nico. */
const ADMIN_UPDATES: InboxUpdate[] = [
  {
    day: 'Today',
    title: 'Rina replied to your comment',
    meta: 'Task #12 Fix SSO login · Atlas Project · 40 min ago',
  },
  PM_UPDATES[2],
  {
    day: 'Yesterday',
    title: 'You were made Viewer of project PT Sinar Client Portal',
    meta: 'by Rina · Yesterday 2:10 PM',
  },
];

export const INBOX_UPDATES = {
  member: MEMBER_UPDATES,
  pm: PM_UPDATES,
  admin: ADMIN_UPDATES,
} as const;

/** Why the Admin reviews the task in the first card (prototype inbox.respond.jsx). */
export const ADMIN_REVIEW_WHY = "You're the task reviewer because the project has only one Manager";
