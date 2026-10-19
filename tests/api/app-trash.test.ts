/**
 * Trash API, event kind (S7 E-07): `DELETE /app/events/:id` answers the Urungkan payload,
 * `GET /app/trash` lists events with `counts.event`, `POST /app/trash/event/:id/restore` brings one
 * back, and every one of these stays session only for API keys. The project and task halves of the
 * Trash are covered by `trash.test.ts` and `task-trash.test.ts`.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { auditLog } from '../../server/db/schema';
import { createEventFactory } from '../event/factory.event';
import { call, expectApiError, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW, freezeAt } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'etrapi' });
// The API reads the real clock, so the events start an hour from the real "now": they sit in the Upcoming tab.
const events = createEventFactory({ tag: 'etrapi-e', now: () => new Date() });
const auditedIds: string[] = [];

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

const DAY_MS = 86_400_000;
const del = (id: string) => call('DELETE', `/app/events/${id}`);
const restore = (id: string) => call('POST', `/app/trash/event/${id}/restore`);
type Item = { id: string; kind: string; can: { restore?: unknown }; blockedBy: unknown };

let lead: TestUser;
let creator: TestUser;
let guest: TestUser;
let viewer: TestUser;
let outsider: TestUser;
let admin: TestUser;
let project: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    creator = await f.user();
    guest = await f.user();
    viewer = await f.user();
    outsider = await f.user();
    admin = await f.user({ role: 'admin' });
    project = await f.project({
      lead,
      members: [
        [creator, 'member'],
        [guest, 'member'],
        [viewer, 'viewer'],
      ],
    });
  });
});

/** A project event for `creator` and `guest`, inserted straight into the table. */
const meeting = () =>
  events.event({
    creator,
    guests: [guest],
    project,
    startsInMin: 60,
    note: { body: 'Catatan rapat', status: 'draft' }, // test-only
  });

const trashItems = async (u: TestUser, query = '?kind=event') => {
  auth.as(u);
  const res = await call('GET', `/app/trash${query}`);
  expect(res.status).toBe(200);
  return res;
};

describe('sign-in gate', () => {
  it('answers 401 to a delete and a restore without a session', async () => {
    expectApiError(await del('e1'), 401, 'UNAUTHORIZED');
    expectApiError(await restore('e1'), 401, 'UNAUTHORIZED');
  });
});

describe('DELETE /app/events/:id', () => {
  it('moves the event to the Trash and answers the Urungkan payload', async () => {
    const e = await meeting();
    auth.as(creator);
    const res = await del(e.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ trash: { kind: 'event', id: e.id, label: e.title } });
    const list = await call('GET', '/app/events');
    expect((list.body.items as Item[]).map((i) => i.id)).not.toContain(e.id);
    const agenda = await call('GET', '/app/events/agenda');
    expect((agenda.body.items as Item[]).map((i) => i.id)).not.toContain(e.id);
    expectApiError(await call('GET', `/app/events/${e.id}`), 404, 'NOT_FOUND');
  });

  it('writes an audit entry with a masked email, the ids and no title', async () => {
    const e = await meeting();
    auditedIds.push(e.id);
    auth.as({ ...creator, email: 'nama.panjang@contoh.test' }); // test-only
    await del(e.id);

    const rows = await waitForAudit(
      eq(auditLog.targetId, e.id),
      eq(auditLog.action, 'event.trash'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.targetType).toBe('event');
    expect(rows[0]?.actorEmail).not.toContain('nama.panjang');
    expect(rows[0]?.meta).toEqual({ projectId: project.id });
    expect(JSON.stringify(rows[0])).not.toContain(e.title);
  });

  it('refuses a guest and a viewer with 403, a stranger with 404 and a repeat with 404', async () => {
    const e = await meeting();
    for (const u of [guest, viewer]) {
      auth.as(u);
      expectApiError(await del(e.id), 403, 'NOT_MANAGER');
    }
    auth.as(outsider);
    expectApiError(await del(e.id), 404, 'NOT_FOUND');
    auth.as(lead);
    expect((await del(e.id)).status).toBe(200);
    expectApiError(await del(e.id), 404, 'NOT_FOUND');
  });

  it('is refused while impersonating', async () => {
    const e = await meeting();
    auth.as(creator, { impersonatedBy: 'someone-else' });
    expectApiError(await del(e.id), 403, 'IMPERSONATING');
  });
});

describe('GET /app/trash', () => {
  it('lists the event with its restore right and counts it, next to the other kinds', async () => {
    const e = await meeting();
    auth.as(creator);
    await del(e.id);

    const res = await trashItems(lead, '');
    const item = (res.body.items as Item[]).find((i) => i.id === e.id);
    expect(item).toMatchObject({
      kind: 'event',
      title: e.title,
      project: { id: project.id },
      deletedBy: { id: creator.id },
      can: { restore: true },
      blockedBy: null,
    });
    expect(res.body.counts.event).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.counts.task).toBe('number');
    expect(typeof res.body.counts.project).toBe('number');
  });

  it('filters by kind=event and hides the event from people who cannot restore it', async () => {
    const e = await meeting();
    auth.as(creator);
    await del(e.id);

    const only = await trashItems(admin);
    expect((only.body.items as Item[]).every((i) => i.kind === 'event')).toBe(true);
    for (const u of [guest, viewer, outsider]) {
      const res = await trashItems(u);
      expect((res.body.items as Item[]).map((i) => i.id)).not.toContain(e.id);
    }
  });
});

describe('POST /app/trash/event/:id/restore', () => {
  it('brings the event back with its guests and minutes, and audits it', async () => {
    const e = await meeting();
    auditedIds.push(e.id);
    auth.as(creator);
    await del(e.id);
    const res = await restore(e.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: e.id });
    auth.as(guest);
    const detail = await call('GET', `/app/events/${e.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.participants).toHaveLength(2);
    expect(detail.body.note).toMatchObject({ body: 'Catatan rapat', status: 'draft' });
    const rows = await waitForAudit(
      eq(auditLog.targetId, e.id),
      eq(auditLog.action, 'event.restore'),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.summary).not.toContain(e.title);
  });

  it('lets the project manager and an Admin restore, and refuses a guest with 403', async () => {
    const e = await meeting();
    auth.as(creator);
    await del(e.id);
    auth.as(guest);
    expectApiError(await restore(e.id), 403, 'NOT_MANAGER');
    auth.as(outsider);
    expectApiError(await restore(e.id), 404, 'NOT_FOUND');
    auth.as(admin);
    expect((await restore(e.id)).status).toBe(200);
    auth.as(lead);
    expectApiError(await restore(e.id), 409, 'WRONG_STATE');
  });

  it('answers 409 PROJECT_IN_TRASH and shows the button disabled while the project is deleted', async () => {
    const own = await f.project({ lead, members: [[creator, 'member']] });
    const e = await events.event({ creator, project: own, startsInMin: 60 });
    auth.as(creator);
    await del(e.id);
    auth.as(lead);
    expect((await call('DELETE', `/app/projects/${own.id}`)).status).toBe(200);
    auditedIds.push(own.id);

    expectApiError(await restore(e.id), 409, 'PROJECT_IN_TRASH');
    const res = await trashItems(lead);
    const item = (res.body.items as Item[]).find((i) => i.id === e.id);
    expect(item?.can.restore).toBe('PROJECT_IN_TRASH');
    expect(item?.blockedBy).toMatchObject({ projectId: own.id });
  });

  it('answers 410 EXPIRED after the retention window', async () => {
    const e = await meeting();
    auth.as(creator);
    freezeAt(ATLAS_NOW);
    await del(e.id);
    freezeAt(new Date(ATLAS_NOW.getTime() + 30 * DAY_MS));
    expectApiError(await restore(e.id), 410, 'EXPIRED');
  });
});

describe('with the project', () => {
  it('deleting a project takes its events along and restoring it brings them back', async () => {
    const own = await f.project({ lead, members: [[creator, 'member']] });
    auditedIds.push(own.id);
    const e = await events.event({ creator, project: own, startsInMin: 60 });
    const personal = await events.event({ creator, project: null, startsInMin: 60 });
    const ids = async () => {
      const res = await call('GET', '/app/events');
      return (res.body.items as Item[]).map((i) => i.id);
    };

    auth.as(lead);
    expect((await call('DELETE', `/app/projects/${own.id}`)).status).toBe(200);
    auth.as(creator);
    expect(await ids()).not.toContain(e.id);
    expect(await ids()).toContain(personal.id);

    auth.as(lead);
    expect((await call('POST', `/app/trash/project/${own.id}/restore`)).status).toBe(200);
    auth.as(creator);
    expect(await ids()).toContain(e.id);
  });
});

describe('API keys', () => {
  const key = { 'x-api-key': `${API_KEY_PREFIX}not-a-real-key` }; // test-only

  it.each([
    ['DELETE', '/app/events/e1'],
    ['POST', '/app/events/e1/cancel'],
    ['POST', '/app/events/e1/participants'],
    ['DELETE', '/app/events/e1/participants/u1'],
    ['POST', '/app/trash/event/e1/restore'],
  ])('refuses a key on %s %s outright (session only)', async (method, path) => {
    const res = await call(method, path, method === 'POST' ? {} : undefined, key);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Endpoint ini tidak bisa diakses dengan API key');
  });
});
