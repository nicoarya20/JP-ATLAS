/**
 * S7 gate, narrowed to create / cancel / delete (E-15, P6 §7): one named `it` per criterion that is
 * still in scope, driven through the real router with a signed-in caller wherever a user would act.
 *
 *   G4  Pemantau cannot create an event in the project       G3  a second tick does not double up
 *   G8  the list costs three queries, tabs split by the clock G2  the 1-day and 30-minute reminders
 *   G6  delete moves the event to Sampah and Urungkan restores G9  destructive routes refuse API keys
 *   cancel  a reason, a card for every guest, shown as Dibatalkan   meetingUrl  only http(s)
 *   project  deleting a project takes its events to Sampah, restoring it brings them back
 *
 * Left out on purpose (user decision 20 Okt 2026): notes UI (G5), Beranda Agenda (G7), calendar,
 * recurring events. G1 (at most four fields on the first screen) and G10 (375 px) are component
 * checks in `tests/app/event-form.test.tsx` and `tests/mobile-baseline.test.ts`.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { eventStatus } from '../../app/lib/events-format';
import type { Principal } from '../../server/access/types';
import { isPmKeyDenied } from '../../server/api-keys/scopes.pm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog, event, notification } from '../../server/db/schema';
import type { EventClock } from '../../server/event/events.dto';
import { listEvents } from '../../server/event/events.query';
import { runReminderTick } from '../../server/event/events.reminders';
import { toPrincipal } from '../../server/project/membership.query';
import { createEventFactory } from '../event/factory.event';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'egate' });
const events = createEventFactory({ tag: 'egate-e', now: () => new Date() });
const auditedIds: string[] = [];

const MIN = 60_000;
const DAY = 86_400_000;
const TIME_ZONE = 'Asia/Jakarta';
const BASE = '/app/events';

let lead: TestUser;
let host: TestUser;
let guest: TestUser;
let viewer: TestUser;
let project: TestProject;

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(async () => {
  await events.flush();
  if (auditedIds.length > 0) {
    await db.delete(auditLog).where(inArray(auditLog.targetId, auditedIds.splice(0)));
  }
});
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    host = await f.user();
    guest = await f.user();
    viewer = await f.user();
    project = await f.project({
      lead,
      members: [
        [host, 'member'],
        [guest, 'member'],
        [viewer, 'viewer'],
      ],
    });
  });
});

const body = (over: Json = {}) => ({
  title: 'Rapat koordinasi mingguan', // test-only
  startsAt: new Date(Date.now() + DAY).toISOString(),
  endsAt: new Date(Date.now() + DAY + 60 * MIN).toISOString(),
  ...over,
});

/** Creates through the API as `as`, and tracks the row so the sweep covers what the service wrote. */
async function create(as: TestUser, over: Json = {}) {
  auth.as(as);
  const res = await call('POST', BASE, body(over));
  if (res.status === 201) {
    events.track(res.body.id);
    auditedIds.push(res.body.id);
  }
  return res;
}

const idsOf = async (as: TestUser, query = '') => {
  auth.as(as);
  const res = await call('GET', `${BASE}?projectId=${project.id}${query}`);
  expect(res.status).toBe(200);
  return (res.body.items as { id: string }[]).map((i) => i.id);
};

const trashed = async (as: TestUser) => {
  auth.as(as);
  const res = await call('GET', '/app/trash?kind=event&limit=100');
  expect(res.status).toBe(200);
  return (res.body.items as { id: string }[]).map((i) => i.id);
};

/** `kind` of every Inbox card (Kabar terbaru) the person holds for this event. */
async function cardKinds(u: TestUser, eventId: string): Promise<string[]> {
  const rows = await db
    .select({ kind: notification.kind })
    .from(notification)
    .where(and(eq(notification.recipientId, u.id), eq(notification.refId, eventId)));
  return rows.map((r) => r.kind).sort();
}

describe('S7 gate: create', () => {
  it('G4: the creator becomes a participant and a Pemantau is refused NOT_MEMBER', async () => {
    const made = await create(host, { projectId: project.id, participantIds: [guest.id] });
    expect(made.status).toBe(201);
    const names = (made.body.participants as { id: string }[]).map((p) => p.id).sort();
    expect(names).toEqual([host.id, guest.id].sort());
    expect(made.body.creator.id).toBe(host.id);

    // A Pemantau may watch the project but not schedule in it; elsewhere they may still plan their own day.
    expectApiError(await create(viewer, { projectId: project.id }), 403, 'NOT_MEMBER');
    const personal = await create(viewer); // no project: anyone signed in may keep a private agenda
    expect(personal.status).toBe(201);
  });

  it('meetingUrl: only http(s) links are accepted, on create and on change', async () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'ftp://berkas.example.test']) {
      const res = await create(host, { meetingUrl: url });
      expectApiError(res, 422, 'VALIDATION');
      expect(res.body.error).toBe('Tautan rapat harus diawali http:// atau https://.');
    }
    const ok = await create(host, { meetingUrl: 'https://meet.example.test/rapat' }); // test-only
    expect(ok.status).toBe(201);
    expect(ok.body.meetingUrl).toBe('https://meet.example.test/rapat');

    auth.as(host);
    const patched = await call('PATCH', `${BASE}/${ok.body.id}`, { meetingUrl: 'javascript:1' });
    expectApiError(patched, 422, 'VALIDATION');
  });
});

describe('S7 gate: list', () => {
  const clockNow = (): EventClock => {
    const now = new Date();
    return { now, today: now.toISOString().slice(0, 10), timeZone: TIME_ZONE };
  };
  const principal = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

  it('G8: a page of events costs at most three queries, however long it is', async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        events.event({ creator: host, project, guests: [guest], startsInMin: 120 + i }),
      ),
    );
    const counter = countQueries();
    const res = await listEvents(
      principal(host),
      { projectId: project.id, limit: 100 },
      clockNow(),
      counter.exec,
    );
    expect(res.ok && res.items.length).toBeGreaterThanOrEqual(25);
    expect(counter.queries.length).toBeLessThanOrEqual(3);
  });

  it('G8: the Akan datang and Sudah lewat tabs split on the clock', async () => {
    const soon = await events.event({ creator: host, project, startsInMin: 90 });
    const gone = await events.event({ creator: host, project, startsInMin: -DAY / MIN });

    const upcoming = await idsOf(host, '&tab=upcoming');
    const past = await idsOf(host, '&tab=past');
    expect(upcoming).toContain(soon.id);
    expect(upcoming).not.toContain(gone.id);
    expect(past).toContain(gone.id);
    expect(past).not.toContain(soon.id);
  });
});

describe('S7 gate: cancel', () => {
  it('cancel: a reason is required, every guest gets event_canceled and the list shows Dibatalkan', async () => {
    const made = await create(host, { projectId: project.id, participantIds: [guest.id] });
    const id = made.body.id as string;
    expect(await cardKinds(guest, id)).toContain('event_invited');

    auth.as(host);
    expectApiError(await call('POST', `${BASE}/${id}/cancel`, { reason: '' }), 422, 'VALIDATION');
    expect(await cardKinds(guest, id)).not.toContain('event_canceled');

    const done = await call('POST', `${BASE}/${id}/cancel`, { reason: 'Ruangan dipakai audit' });
    expect(done.status).toBe(200);

    expect(await cardKinds(guest, id)).toContain('event_canceled');
    // The one who cancels is not told about their own action.
    expect(await cardKinds(host, id)).not.toContain('event_canceled');

    auth.as(guest);
    const inbox = await call('GET', '/app/inbox?lane=info&limit=100');
    expect(
      (inbox.body.items as { kind: string; href: string }[]).some(
        (c) => c.kind === 'event_canceled' && c.href === `/app/events/${id}`,
      ),
    ).toBe(true);

    auth.as(host);
    const list = await call('GET', `${BASE}?projectId=${project.id}`);
    const row = (list.body.items as Json[]).find((i) => i.id === id);
    // The row stays, with its reason, so people who planned around it can see why it is off.
    expect(row?.canceledAt).toBeTruthy();
    expect(eventStatus(row as never, Date.now())).toBe('canceled');
    const detail = await call('GET', `${BASE}/${id}`);
    expect(detail.body.cancelReason).toBe('Ruangan dipakai audit');
  });
});

describe('S7 gate: delete to Sampah and Urungkan', () => {
  it('G6: a deleted event leaves the list, shows in Sampah, and Urungkan restores it whole', async () => {
    const made = await create(host, { projectId: project.id, participantIds: [guest.id] });
    const id = made.body.id as string;
    auth.as(host);
    expect((await call('PUT', `${BASE}/${id}/note`, { body: 'Catatan rapat' })).status).toBe(200); // test-only

    const gone = await call('DELETE', `${BASE}/${id}`);
    expect(gone.status).toBe(200);
    expect(gone.body.trash).toMatchObject({ kind: 'event', id });

    expect(await idsOf(host)).not.toContain(id);
    expect(await idsOf(guest)).not.toContain(id);
    expect(await trashed(host)).toContain(id);
    auth.as(guest);
    expectApiError(await call('GET', `${BASE}/${id}`), 404, 'NOT_FOUND');

    auth.as(host);
    const back = await call('POST', `/app/trash/event/${id}/restore`);
    expect(back.status).toBe(200);
    expect(await trashed(host)).not.toContain(id);
    expect(await idsOf(host)).toContain(id);

    const detail = await call('GET', `${BASE}/${id}`);
    const people = (detail.body.participants as { id: string }[]).map((p) => p.id).sort();
    expect(people).toEqual([host.id, guest.id].sort());
    expect(detail.body.note).toMatchObject({ body: 'Catatan rapat' });
  });

  it('project: deleting a project takes its events to Sampah and restoring it brings them back', async () => {
    const own = await f.project({ lead, members: [[host, 'member']] });
    auditedIds.push(own.id);
    const inside = await events.event({ creator: host, project: own, startsInMin: 60 });
    const personal = await events.event({ creator: host, project: null, startsInMin: 60 });
    const listed = async () => {
      auth.as(host);
      const res = await call('GET', BASE);
      return (res.body.items as { id: string }[]).map((i) => i.id);
    };

    auth.as(lead);
    expect((await call('DELETE', `/app/projects/${own.id}`)).status).toBe(200);
    expect(await listed()).not.toContain(inside.id);
    expect(await listed()).toContain(personal.id);
    // It rides with the project's own Sampah row instead of becoming a row of its own.
    expect(await trashed(host)).not.toContain(inside.id);
    const [row] = await db.select().from(event).where(eq(event.id, inside.id));
    expect(row.deletedWithProjectId).toBe(own.id);
    expect(row.deletedAt).not.toBeNull();
    auth.as(host);
    expectApiError(await call('GET', `${BASE}/${inside.id}`), 404, 'NOT_FOUND');

    auth.as(lead);
    expect((await call('POST', `/app/trash/project/${own.id}/restore`)).status).toBe(200);
    expect(await listed()).toContain(inside.id);
    const [back] = await db.select().from(event).where(eq(event.id, inside.id));
    expect(back.deletedAt).toBeNull();
    expect(back.deletedWithProjectId).toBeNull();
  });
});

describe('S7 gate: reminders', () => {
  const START = new Date('2030-03-12T03:00:00Z'); // test-only: far from the wall clock
  const before = (min: number) => new Date(START.getTime() - min * MIN);
  const reminders = async (u: TestUser, id: string) =>
    (await cardKinds(u, id)).filter((k) => k === 'event_reminder').length;

  it('G2 and G3: a day before and half an hour before each send once, and a repeat tick adds none', async () => {
    const made = await create(host, {
      projectId: project.id,
      participantIds: [guest.id],
      startsAt: START.toISOString(),
      endsAt: new Date(START.getTime() + 60 * MIN).toISOString(),
    });
    const id = made.body.id as string;
    expect(made.body.remindersMinutes).toEqual([1440, 30]);

    await runReminderTick(before(1440));
    expect([await reminders(host, id), await reminders(guest, id)]).toEqual([1, 1]);

    await runReminderTick(before(1440)); // same moment again
    await runReminderTick(before(1000)); // later, still inside the quiet stretch
    expect([await reminders(host, id), await reminders(guest, id)]).toEqual([1, 1]);

    await runReminderTick(before(30));
    await runReminderTick(before(30));
    expect([await reminders(host, id), await reminders(guest, id)]).toEqual([2, 2]);
  });
});

describe('S7 gate: API keys', () => {
  const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

  it.each([
    ['DELETE', '/app/events/e1'],
    ['POST', '/app/events/e1/cancel'],
    ['POST', '/app/trash/event/e1/restore'],
  ])('G9: %s %s is session only, so a key is refused whatever its scope', async (method, path) => {
    expect(isPmKeyDenied(method, `/api${path}`)).toBe(true);
    const res = await call(method, path, method === 'POST' ? {} : undefined, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Endpoint ini tidak bisa diakses dengan API key');
  });

  it('G9: reading and creating events stay open to a key', () => {
    expect(isPmKeyDenied('GET', '/api/app/events')).toBe(false);
    expect(isPmKeyDenied('POST', '/api/app/events')).toBe(false);
  });
});
