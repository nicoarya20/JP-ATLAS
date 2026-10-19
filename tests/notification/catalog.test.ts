/** Inbox kind catalog (S3 I02, P5 §5.2): every kind has a lane, a category and Indonesian copy. */
import { describe, expect, it, test } from 'bun:test';
import {
  cardButton,
  cardSentence,
  isNotificationKind,
  kindsByLane,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_COPY,
  NOTIFICATION_KIND_LIST,
  NOTIFICATION_KINDS,
  NOTIFICATION_LANES,
  prefCategoryOf,
  RESOLVE_REASONS,
  shippedKinds,
} from '../../server/notification/notification.catalog';
import type { NotificationKind } from '../../server/notification/notification.types';

// The kinds really emitted: S3's (P5 §5.2 "Katalog yang dikirim di S3", user_pending since I14) and S7's four event cards.
const SHIPPED: NotificationKind[] = [
  'task_assigned',
  'task_unassigned',
  'task_done',
  'task_commented',
  'task_changed',
  'project_member_added',
  'project_role_changed',
  'user_pending',
  'event_reminder',
  'event_invited',
  'event_changed',
  'event_canceled',
];
// Reserved on purpose: the feature behind them lands in S4 (Periksa, mention).
const RESERVED: NotificationKind[] = [
  'task_review_requested',
  'task_review_fallback',
  'task_returned',
  'mention',
];
// Words the Inbox never shows a user: English jargon or role codes (R11 glossary, P5 §6 I02).
const JARGON = /assignee|reviewer|assign|task\b|project\b|deadline|resolve|inbox|null/i;
// `it.each` on a readonly tuple widens the case to `unknown`; a mutable copy keeps the kind typed.
const EVERY_KIND: NotificationKind[] = [...NOTIFICATION_KIND_LIST];
// Every placeholder the copy may use; `cardSentence` fills exactly these.
const ALL_VARS = {
  actor: 'Dodi', // test-only
  number: 14,
  title: 'Cek ukuran lemari dapur', // test-only
  project: 'Renovasi Dapur', // test-only
  name: 'Rina', // test-only
  role: 'Anggota',
  count: 5,
};

describe('NOTIFICATION_KINDS', () => {
  it('lists every kind exactly once and splits them into shipped and reserved', () => {
    expect([...NOTIFICATION_KIND_LIST].sort()).toEqual([...SHIPPED, ...RESERVED].sort());
    expect(new Set(NOTIFICATION_KIND_LIST).size).toBe(NOTIFICATION_KIND_LIST.length);
    expect(shippedKinds().sort()).toEqual([...SHIPPED].sort());
  });

  it.each(EVERY_KIND)('%s has a known lane and category', (kind) => {
    const meta = NOTIFICATION_KINDS[kind];
    expect(NOTIFICATION_LANES).toContain(meta.lane);
    expect(NOTIFICATION_CATEGORIES).toContain(meta.category);
    // An `action` card is work and is never filed under a news-style preference, and the other way round.
    expect(meta.category === 'action').toBe(meta.lane === 'action');
    expect(typeof meta.shipped).toBe('boolean');
  });

  it('the two lanes partition the catalog', () => {
    expect([...kindsByLane('action'), ...kindsByLane('info')].sort()).toEqual(
      [...NOTIFICATION_KIND_LIST].sort(),
    );
    expect(kindsByLane('action')).toContain('task_assigned');
    expect(kindsByLane('info')).toContain('task_commented');
  });

  it('only the mention card expires on its own, after 14 days', () => {
    const withTtl = NOTIFICATION_KIND_LIST.filter(
      (k) => NOTIFICATION_KINDS[k].ttlDays !== undefined,
    );
    expect(withTtl).toEqual(['mention']);
    expect(NOTIFICATION_KINDS.mention.ttlDays).toBe(14);
  });

  it('maps a kind to the preference row that may silence it; action cards cannot be hidden', () => {
    expect(prefCategoryOf('task_assigned')).toBeNull();
    expect(prefCategoryOf('user_pending')).toBeNull();
    expect(prefCategoryOf('task_commented')).toBe('news');
    expect(prefCategoryOf('project_member_added')).toBe('news');
    expect(prefCategoryOf('event_reminder')).toBe('event_reminder');
    // Invitation, change and cancellation are news; the reminder has its own switch.
    for (const kind of ['event_invited', 'event_changed', 'event_canceled'] as const) {
      expect(prefCategoryOf(kind)).toBe('news');
      expect(NOTIFICATION_KINDS[kind].lane).toBe('info');
    }
  });

  it('recognises stored kind values and refuses anything else', () => {
    expect(isNotificationKind('task_assigned')).toBe(true);
    expect(isNotificationKind('task_exploded')).toBe(false);
    expect(isNotificationKind(null)).toBe(false);
    expect(isNotificationKind(42)).toBe(false);
  });

  it('re-exports the resolve reasons from the schema, so the DB CHECK and the service agree', () => {
    expect([...RESOLVE_REASONS]).toEqual([
      'acted',
      'elsewhere',
      'target_closed',
      'superseded',
      'expired',
    ]);
  });
});

describe('copy', () => {
  it.each(EVERY_KIND)('%s has a sentence and an imperative button label', (kind) => {
    const copy = NOTIFICATION_COPY[kind];
    expect(copy.sentence.length).toBeGreaterThan(0);
    expect(cardButton(kind).length).toBeGreaterThan(0);
    // One button per card, so the label names the destination ("Lihat tugas"), never "OK".
    expect(cardButton(kind)).not.toMatch(/^(ok|submit|kirim)$/i);
  });

  it.each(EVERY_KIND)('%s renders without a leftover placeholder', (kind) => {
    for (const vars of [ALL_VARS, { ...ALL_VARS, actor: null }, { ...ALL_VARS, count: 1 }]) {
      const sentence = cardSentence(kind, vars);
      expect(sentence).not.toContain('{');
      expect(sentence).not.toContain('  ');
      expect(sentence.trim()).toBe(sentence);
      expect(sentence.length).toBeGreaterThan(0);
    }
  });

  it.each(EVERY_KIND)('%s is written in plain Indonesian, without jargon', (kind) => {
    const copy = NOTIFICATION_COPY[kind];
    for (const text of [copy.sentence, copy.bundled, copy.system, copy.button]) {
      // Placeholders carry English names ({project}); only the words a user reads are checked.
      if (text) expect(text.replace(/\{\w+\}/g, '')).not.toMatch(JARGON);
    }
  });

  test('the assignment card names the actor, and says it plainly when the system acted', () => {
    expect(cardSentence('task_assigned', { actor: 'Dodi', number: 14 })).toBe(
      'Dodi menunjuk Anda mengerjakan #14',
    );
    expect(cardSentence('task_assigned', { number: 14 })).toBe('Anda ditunjuk mengerjakan #14');
  });

  test('a bundled card counts the events instead of naming the last actor', () => {
    expect(cardSentence('task_commented', { actor: 'Rina', number: 12, count: 5 })).toBe(
      '5 komentar baru di #12',
    );
    expect(cardSentence('task_changed', { actor: 'Rina', number: 12, count: 3 })).toBe(
      '3 perubahan di #12',
    );
    // A single event keeps the personal wording.
    expect(cardSentence('task_commented', { actor: 'Rina', number: 12, count: 1 })).toBe(
      'Rina menulis komentar di #12',
    );
  });

  test('a kind without bundled copy keeps its sentence even when the card bundled', () => {
    expect(cardSentence('task_done', { actor: 'Dodi', number: 7, count: 4 })).toBe(
      'Dodi menandai #7 selesai',
    );
  });

  test('event cards name the actor and the meeting, and fall back to the system wording', () => {
    const title = 'Rapat kickoff'; // test-only
    expect(cardSentence('event_invited', { actor: 'Dodi', title })).toBe(
      'Dodi mengundang Anda ke acara Rapat kickoff',
    );
    expect(cardSentence('event_changed', { actor: 'Dodi', title })).toBe(
      'Dodi mengubah acara Rapat kickoff',
    );
    expect(cardSentence('event_changed', { actor: 'Dodi', title, count: 3 })).toBe(
      '3 perubahan pada acara Rapat kickoff',
    );
    expect(cardSentence('event_canceled', { actor: 'Dodi', title })).toBe(
      'Dodi membatalkan acara Rapat kickoff',
    );
    expect(cardSentence('event_canceled', { title })).toBe('Acara Rapat kickoff dibatalkan');
    expect(cardSentence('event_reminder', { title })).toBe('Acara Rapat kickoff segera dimulai');
    expect(cardButton('event_canceled')).toBe('Lihat acara');
  });

  test('project and account cards name the project or the person, not an id', () => {
    expect(cardSentence('project_member_added', { actor: 'Dodi', project: 'Renovasi Dapur' })).toBe(
      'Dodi menambahkan Anda ke proyek Renovasi Dapur',
    );
    expect(cardSentence('user_pending', { name: 'Rina' })).toBe(
      'Rina baru mendaftar dan menunggu persetujuan',
    );
    expect(cardButton('user_pending')).toBe('Buka Pengguna');
  });
});
