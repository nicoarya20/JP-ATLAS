// Inbox cards as `GET /api/app/inbox` sends them (`server/notification/notification.query.ts` InboxItem), in the
// server's own words. test-only
import type { InboxItemWire, InboxPageWire } from '@/data/inbox.api';

const AT = '2026-10-07T07:05:00.000Z'; // 14:05 in Asia/Jakarta, on the test clock's day

/** One card; override what the test is about. */
export const card = (over: Partial<InboxItemWire> = {}): InboxItemWire => ({
  id: 'n-1',
  kind: 'task_assigned',
  lane: 'action',
  actor: { id: 'u-rina', name: 'Rina Wulandari', image: null },
  ref: { type: 'task', id: 't-12', number: 12 },
  payload: { number: 12, title: 'Fix SSO login', projectName: 'Atlas Project' },
  bundleCount: 1,
  read: false,
  group: 'today',
  createdAt: AT,
  updatedAt: AT,
  href: '/app/tasks/12',
  sentence: 'Rina Wulandari menugaskan #12 kepada Anda',
  button: 'Lihat tugas',
  ...over,
});

/** A news card. */
export const news = (over: Partial<InboxItemWire> = {}): InboxItemWire =>
  card({
    id: 'i-1',
    kind: 'task_commented',
    lane: 'info',
    sentence: 'Rina Wulandari mengomentari #12',
    payload: { number: 12, projectName: 'Atlas Project', excerpt: 'Sudah saya cek, aman.' },
    ...over,
  });

export const page = (items: InboxItemWire[], nextCursor: string | null = null): InboxPageWire => ({
  items,
  nextCursor,
});

/** The bell numbers. */
export const counts = (action: number, infoUnread = 0) => ({ action, infoUnread });

/** The query string of a request, as a map. */
export const query = (url: string) => Object.fromEntries(new URL(url).searchParams);
