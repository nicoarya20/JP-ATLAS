// `/api/app/inbox` as the server sends it, for the tests that read the Inbox. Written against the
// sample's own day (TEST_CLOCK: Wed 7 Oct 2026, Asia/Jakarta) so the day buckets and the clock times
// are checkable. Two instants are deliberately on the UTC day *before* the team day — that is the
// case that would put a card on the wrong day if anything recomputed the bucket locally (K2).
import type { InboxCountsWire, InboxItemWire, InboxPageWire } from '@/data/inbox.api';
import { ensureInbox } from '@/data/inbox.api';

import type { AuthRoutes } from './auth-server';

const BASE: InboxItemWire = {
  id: 'n-0',
  kind: 'task_assigned',
  lane: 'action',
  actor: { id: 'u-nico', name: 'Nico Arya', image: null },
  ref: { type: 'task', id: 't-16', number: 16 },
  payload: {},
  bundleCount: 1,
  read: false,
  group: 'today',
  createdAt: '2026-10-07T02:30:00Z',
  updatedAt: '2026-10-07T02:30:00Z',
  href: '/app/tasks/16',
  sentence: null,
  button: null,
};

/** One card, overriding what the test cares about. */
export const card = (over: Partial<InboxItemWire>): InboxItemWire => ({ ...BASE, ...over });

/** A task assigned to me: a person behind it, a number, a project and a button. */
export const ASSIGNED = card({
  id: 'n-assigned',
  payload: { title: 'Prepare test data', number: 16, projectName: 'Atlas Project' },
  sentence: 'Nico Arya menugaskan "Prepare test data" kepada Anda.',
  button: 'Buka tugas',
});

/** An account waiting for approval: no actor (the system), no number, 06.00 WIB on the UTC day before. */
export const PENDING = card({
  id: 'n-pending',
  kind: 'user_pending',
  actor: null,
  ref: { type: 'user', id: 'u-sari', number: null },
  payload: { name: 'Sari Wulandari' },
  sentence: 'Sari Wulandari menunggu persetujuan akun.',
  button: 'Buka Users',
  createdAt: '2026-10-06T23:00:00Z',
  updatedAt: '2026-10-06T23:00:00Z',
});

/** A mention, which is the one card that carries a quoted excerpt into the work queue. */
export const MENTION = card({
  id: 'n-mention',
  kind: 'mention',
  actor: { id: 'u-rina', name: 'Rina Hapsari', image: null },
  ref: { type: 'task', id: 't-12', number: 12 },
  payload: {
    title: 'Fix SSO login',
    number: 12,
    projectName: 'Atlas Project',
    excerpt: '@Nico SSO-nya sudah bisa dicoba?',
  },
  sentence: 'Rina Hapsari menyebut Anda di tugas #12.',
  button: 'Balas',
  createdAt: '2026-10-07T01:00:00Z',
});

/** A kind this build does not know: the server sends no sentence and no button for it. */
export const UNKNOWN_KIND = card({ id: 'n-unknown', kind: 'kind_from_the_future', payload: {} });

/** A comment on my task, with the quoted excerpt. */
export const COMMENTED = card({
  id: 'n-commented',
  kind: 'task_commented',
  lane: 'info',
  actor: { id: 'u-rina', name: 'Rina Hapsari', image: 'https://cdn.test/rina.png' },
  ref: { type: 'task', id: 't-14', number: 14 },
  payload: {
    title: 'Write the API spec',
    number: 14,
    projectName: 'Atlas Project',
    excerpt: 'Sudah bisa dicoba?',
  },
  sentence: 'Rina Hapsari mengomentari tugas #14.',
  button: 'Buka tugas',
  updatedAt: '2026-10-07T03:00:00Z',
});

/** Yesterday, already read; a project card, so its route is the project's. */
export const ROLE_CHANGED = card({
  id: 'n-role',
  kind: 'project_role_changed',
  lane: 'info',
  ref: { type: 'project', id: 'atlas', number: null },
  payload: { projectName: 'Atlas Project', role: 'viewer' },
  sentence: 'Rina Hapsari mengubah peran Anda di Atlas Project.',
  button: 'Buka proyek',
  read: true,
  group: 'yesterday',
  updatedAt: '2026-10-06T10:00:00Z',
});

/** Older than yesterday: the bucket mobile had no heading for before. */
export const EVENT_CHANGED = card({
  id: 'n-event',
  kind: 'event_changed',
  lane: 'info',
  ref: { type: 'event', id: 'review', number: null },
  payload: { title: 'Onboarding design review', projectName: 'Atlas Project' },
  sentence: 'Rina Hapsari mengubah acara Onboarding design review.',
  button: 'Buka acara',
  group: 'older',
  updatedAt: '2026-10-01T08:15:00Z',
});

export const ACTION_PAGE: InboxPageWire = {
  items: [ASSIGNED, MENTION, PENDING, UNKNOWN_KIND],
  nextCursor: null,
};

/** A second page exists, so the list says the lane does not end here. */
export const INFO_PAGE: InboxPageWire = {
  items: [COMMENTED, ROLE_CHANGED, EVENT_CHANGED],
  nextCursor: 'cursor-2',
};

export const INBOX_COUNTS: InboxCountsWire = { action: 3, infoUnread: 2 };

type InboxBodies = {
  action?: InboxPageWire;
  info?: InboxPageWire;
  counts?: InboxCountsWire;
  home?: unknown;
};

/** Routes for `serveAuth` that answer the Inbox (and the clock call Home makes on mount). */
export const inboxRoutes = (bodies: InboxBodies = {}): AuthRoutes => ({
  '/api/app/inbox/count': { body: bodies.counts ?? INBOX_COUNTS },
  '/api/app/inbox?lane=action': { body: bodies.action ?? ACTION_PAGE },
  '/api/app/inbox?lane=info': { body: bodies.info ?? INFO_PAGE },
});

/** Fills the three Inbox resources from the stubbed server, as the screen's own effect would. */
export const loadInbox = (): Promise<unknown> => ensureInbox();
