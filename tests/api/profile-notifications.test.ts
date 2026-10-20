/** GET/PUT /api/app/profile/notifications: defaults, per-switch upsert, validation, isolation and the effect on the Inbox. */
import { afterAll, afterEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { notificationPref } from '../../server/db/schema';
import { filterRecipients } from '../../server/notification/notification.recipients';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createUserFactory } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const users = createUserFactory(cleaner, { tag: 'notifprefs' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const PATH = '/app/profile/notifications';
const ALL_ON = { eventReminder: true, inboxNews: true };
const rowsOf = (userId: string) =>
  db.select().from(notificationPref).where(eq(notificationPref.userId, userId));

describe('GET /profile/notifications', () => {
  test('a user without rows has both switches on', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('GET', PATH);
    expect<number>(res.status).toBe(200);
    expect(res.body).toEqual(ALL_ON);
    expect(await rowsOf(me.id)).toEqual([]);
  });

  test('anonymous → 401', async () => {
    auth.as(null);
    expectApiError(await call('GET', PATH), 401, 'UNAUTHORIZED');
  });
});

describe('PUT /profile/notifications', () => {
  test('turns one switch off, stores a notification_pref row and leaves the other on', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('PUT', PATH, { inboxNews: false });
    expect<number>(res.status).toBe(200);
    expect(res.body).toEqual({ eventReminder: true, inboxNews: false });
    expect(await rowsOf(me.id)).toMatchObject([{ category: 'news', inApp: false }]);
    expect((await call('GET', PATH)).body).toEqual({ eventReminder: true, inboxNews: false });
  });

  test('is idempotent per switch and switching back on keeps a single row', async () => {
    const me = await users.user();
    auth.as(me);
    await call('PUT', PATH, { eventReminder: false });
    await call('PUT', PATH, { eventReminder: false });
    expect(await rowsOf(me.id)).toHaveLength(1);
    const res = await call('PUT', PATH, { eventReminder: true });
    expect(res.body).toEqual(ALL_ON);
    expect(await rowsOf(me.id)).toMatchObject([{ category: 'event_reminder', inApp: true }]);
  });

  test('changes both switches in one call and an empty body changes nothing', async () => {
    const me = await users.user();
    auth.as(me);
    const both = await call('PUT', PATH, { eventReminder: false, inboxNews: false });
    expect(both.body).toEqual({ eventReminder: false, inboxNews: false });
    const empty = await call('PUT', PATH, {});
    expect<number>(empty.status).toBe(200);
    expect(empty.body).toEqual({ eventReminder: false, inboxNews: false });
  });

  test.each([[{ inboxNews: 'no' }], [{ eventReminder: null }], [{ eventReminder: 1 }]])(
    'rejects %p with 422 and writes nothing',
    async (body) => {
      const me = await users.user();
      auth.as(me);
      expectApiError(await call('PUT', PATH, body), 422, 'VALIDATION');
      expect(await rowsOf(me.id)).toEqual([]);
    },
  );

  test('ignores a switch that does not exist (the "Perlu Anda tanggapi" cards cannot be muted)', async () => {
    const me = await users.user();
    auth.as(me);
    const res = await call('PUT', PATH, { action: false, task_assigned: false, inboxNews: false });
    expect<number>(res.status).toBe(200);
    expect(res.body).toEqual({ eventReminder: true, inboxNews: false });
    expect(await rowsOf(me.id)).toMatchObject([{ category: 'news' }]);
  });

  test("never reads or writes another account's switches", async () => {
    const me = await users.user();
    const other = await users.user();
    auth.as(other);
    await call('PUT', PATH, { inboxNews: false, eventReminder: false });
    auth.as(me);
    expect((await call('GET', PATH)).body).toEqual(ALL_ON);
    await call('PUT', PATH, { inboxNews: false });
    expect(await rowsOf(other.id)).toHaveLength(2);
    expect(await rowsOf(me.id)).toHaveLength(1);
  });

  test('anonymous → 401 and nothing is written', async () => {
    auth.as(null);
    expectApiError(await call('PUT', PATH, { inboxNews: false }), 401, 'UNAUTHORIZED');
  });
});

describe('what the switches do to the Inbox', () => {
  const input = (id: string, lane: 'info' | 'action', category?: 'event_reminder' | 'news') => ({
    ids: [id],
    actorId: null,
    projectId: null,
    lane,
    category,
  });

  test('"Kabar terbaru" off mutes news cards only; reminders and action cards still arrive', async () => {
    const me = await users.user();
    auth.as(me);
    await call('PUT', PATH, { inboxNews: false });
    expect(await filterRecipients(db, input(me.id, 'info', 'news'))).toEqual([]);
    expect(await filterRecipients(db, input(me.id, 'info', 'event_reminder'))).toEqual([me.id]);
    expect(await filterRecipients(db, input(me.id, 'action'))).toEqual([me.id]);
  });

  test('"Pengingat acara" off mutes reminders and switching it back on restores them', async () => {
    const me = await users.user();
    auth.as(me);
    await call('PUT', PATH, { eventReminder: false });
    expect(await filterRecipients(db, input(me.id, 'info', 'event_reminder'))).toEqual([]);
    expect(await filterRecipients(db, input(me.id, 'info', 'news'))).toEqual([me.id]);
    await call('PUT', PATH, { eventReminder: true });
    expect(await filterRecipients(db, input(me.id, 'info', 'event_reminder'))).toEqual([me.id]);
  });
});
