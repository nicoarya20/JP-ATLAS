/** Cards as `GET /api/app/inbox` sends them, one builder per kind family, for the Inbox UI tests. */

import type { InboxItem } from '../../app/lib/inbox-api';
import type { InboxClock } from '../../app/lib/inbox-view';

// 10:00 Jakarta on Tue 20 Oct 2026; the clock every Inbox UI test reads.
export const NOW = Date.parse('2026-10-20T03:00:00Z'); // test-only
export const CLOCK: InboxClock = { now: NOW, timeZone: 'Asia/Jakarta' }; // test-only

const MIN = 60_000;
export const minutesAgo = (n: number) => new Date(NOW - n * MIN).toISOString();

const NICO = { id: 'u-nico', name: 'Nico', image: null };

/** A task card (the default kind is the work-queue "assigned" card). */
export function taskCard(over: Partial<InboxItem> = {}): InboxItem {
  return {
    id: 'n-1',
    kind: 'task_assigned',
    lane: 'action',
    actor: NICO,
    ref: { type: 'task', id: 't-14', number: 14 },
    payload: { title: 'Tulis spesifikasi API', number: 14, projectName: 'Proyek Atlas' },
    bundleCount: 1,
    read: false,
    group: 'today',
    createdAt: minutesAgo(20),
    updatedAt: minutesAgo(20),
    href: '/app/tasks/14',
    sentence: 'Nico menunjuk Anda mengerjakan #14',
    button: 'Lihat tugas',
    ...over,
  };
}

/** The leave card an Admin's record produces (P14 D5): news, one button to Ketersediaan. */
export function leaveRecordedCard(over: Partial<InboxItem> = {}): InboxItem {
  return taskCard({
    id: 'n-leave',
    kind: 'leave_recorded',
    lane: 'info',
    actor: { id: 'u-ayu', name: 'Ayu', image: null },
    ref: { type: 'leave', id: 'p-9', number: null },
    payload: { startDate: '2026-10-14', endDate: '2026-10-16', days: 3, change: 'set' },
    href: '/app/settings',
    sentence: 'Cuti Anda dicatat oleh Ayu',
    button: 'Lihat ketersediaan',
    ...over,
  });
}

/**
 * A row of the retired approval flow still sitting in the table (P14 §8 R3): the kind is one this
 * build no longer knows, so the server sends it without a sentence and without a button, and the
 * payload still has the old `dueTasks` / `decision` / `excerpt` fields in it.
 */
export function legacyLeaveCard(over: Partial<InboxItem> = {}): InboxItem {
  return taskCard({
    id: 'n-old-leave',
    kind: 'leave_requested',
    actor: { id: 'u-dodi', name: 'Dodi', image: null },
    ref: { type: 'leave', id: 'l-9', number: null },
    payload: {
      name: 'Dodi',
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      days: 3,
      dueTasks: 2,
    },
    href: '/app/settings',
    sentence: null,
    button: null,
    ...over,
  });
}

/** A news card: an event invitation under "Hari ini". */
export function eventCard(over: Partial<InboxItem> = {}): InboxItem {
  return taskCard({
    id: 'n-event',
    kind: 'event_invited',
    lane: 'info',
    ref: { type: 'event', id: 'e-1', number: null },
    payload: {
      title: 'Latihan presentasi',
      startsAt: '2026-10-27T08:00:00.000Z',
      projectName: 'Proyek Atlas',
    },
    href: '/app/events/e-1',
    sentence: 'Nico mengundang Anda ke acara Latihan presentasi',
    button: 'Lihat acara',
    ...over,
  });
}
