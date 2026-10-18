/**
 * Event API (S7 E-06, sync point SP-E2): the sign-in gate, the list and detail shapes, the write
 * refusals that carry a code the UI reads (`NOT_MEMBER`, `PROJECT_IN_TRASH`), the 404 a hidden
 * event shares with a missing one, and the 409 `NOTE_CONFLICT` that hands the loser the newer text.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project as projectTable } from '../../server/db/schema';
import { createEventFactory } from '../event/factory.event';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'evapi' });
const events = createEventFactory({ tag: 'evapi-t', now: () => new Date() });

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterEach(() => events.flush());
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

const BASE = '/app/events';

/** The detail keys SP-E2 locks for the event UI; adding one is fine, renaming one is a contract change. */
const DETAIL_KEYS = [
  'agenda',
  'can',
  'canceledAt',
  'canceledBy',
  'cancelReason',
  'createdAt',
  'creator',
  'endsAt',
  'id',
  'kind',
  'locationText',
  'locationType',
  'meetingUrl',
  'note',
  'noteStatus',
  'participants',
  'project',
  'remindersMinutes',
  'startsAt',
  'title',
  'updatedAt',
];

let lead: TestUser;
let host: TestUser;
let guest: TestUser;
let viewer: TestUser;
let outsider: TestUser;
let project: TestProject;
let otherProject: TestProject;
let trashedProject: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    host = await f.user();
    guest = await f.user();
    viewer = await f.user();
    outsider = await f.user();
    project = await f.project({
      lead,
      members: [
        [host, 'member'],
        [guest, 'member'],
        [viewer, 'viewer'],
      ],
    });
    otherProject = await f.project({ lead });
    trashedProject = await f.project({ lead });
    await db
      .update(projectTable)
      .set({ deletedAt: new Date(), deletedBy: lead.id })
      .where(eq(projectTable.id, trashedProject.id));
  });
});

/** A meeting in the shared project, hosted by `host`, with `guest` invited. */
const meeting = (over: Parameters<typeof events.event>[0] | Record<string, never> = {}) =>
  events.event({ creator: host, project, guests: [guest], ...over });

/** The body of `POST /app/events` stage 1: the four fields the first screen asks for. */
const newEvent = (over: Json = {}) => ({
  title: 'Rapat koordinasi mingguan', // test-only
  startsAt: new Date(Date.now() + 86_400_000).toISOString(),
  endsAt: new Date(Date.now() + 90_000_000).toISOString(),
  ...over,
});

/** Creates through the API and tracks the row, so the sweep covers what the service wrote. */
async function create(as: TestUser, body: Json = {}) {
  auth.as(as);
  const res = await call('POST', BASE, newEvent(body));
  if (res.status === 201) events.track(res.body.id);
  return res;
}

describe('sign-in gate', () => {
  it.each([
    ['GET', BASE],
    ['GET', `${BASE}/agenda`],
    ['GET', `${BASE}/people`],
    ['GET', `${BASE}/ev1`],
    ['POST', BASE],
    ['PATCH', `${BASE}/ev1`],
    ['POST', `${BASE}/ev1/cancel`],
    ['POST', `${BASE}/ev1/participants`],
    ['DELETE', `${BASE}/ev1/participants/u1`],
    ['PUT', `${BASE}/ev1/note`],
  ])('%s %s without a session is 401', async (method, path) => {
    expectApiError(await call(method, path), 401, 'UNAUTHORIZED');
  });

  it('answers 401, not 422, to an anonymous caller with a bad body', async () => {
    expectApiError(await call('POST', BASE, { nope: 1 }), 401, 'UNAUTHORIZED');
  });
});

describe('GET /app/events', () => {
  it('returns the events I may see with per-row can{} and the create capability', async () => {
    const mine = await meeting({ creator: host, project, guests: [guest], title: 'Rapat tim' });
    auth.as(host);
    const res = await call('GET', `${BASE}?projectId=${project.id}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['caps', 'items', 'nextCursor']);
    expect(res.body.caps).toEqual({ createEvent: true });
    const item = res.body.items.find((i: Json) => i.id === mine.id);
    expect(item).toMatchObject({ title: 'Rapat tim', kind: 'meeting', noteStatus: null });
    expect(item.participants).toEqual({ total: 2, isParticipant: true });
    expect(item.can).toMatchObject({ update: true, writeNote: true });
    expect(item.project.id).toBe(project.id);
  });

  it('splits the tabs on the server clock and filters by kind and title', async () => {
    const soon = await meeting({ creator: host, project, startsInMin: 120, title: 'Tinjauan Q4' });
    const past = await meeting({ creator: host, project, startsInMin: -600, kind: 'review' });
    auth.as(host);
    const upcoming = await call('GET', `${BASE}?projectId=${project.id}`);
    const ids = (r: Json) => r.body.items.map((i: Json) => i.id);
    expect(ids(upcoming)).toContain(soon.id);
    expect(ids(upcoming)).not.toContain(past.id);

    const history = await call('GET', `${BASE}?tab=past&projectId=${project.id}`);
    expect(ids(history)).toContain(past.id);
    expect(ids(await call('GET', `${BASE}?kind=review&tab=past`))).toContain(past.id);
    expect(ids(await call('GET', `${BASE}?q=tinjauan%20q4`))).toEqual([soon.id]);
  });

  it('pages with an opaque cursor and refuses a broken one with 400 BAD_CURSOR', async () => {
    await meeting({ creator: host, project, startsInMin: 30 });
    await meeting({ creator: host, project, startsInMin: 60 });
    auth.as(host);
    const first = await call('GET', `${BASE}?projectId=${project.id}&limit=1`);
    expect(first.body.items).toHaveLength(1);
    expect(typeof first.body.nextCursor).toBe('string');
    const next = await call(
      'GET',
      `${BASE}?projectId=${project.id}&limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`,
    );
    expect(next.body.items[0].id).not.toBe(first.body.items[0].id);
    expectApiError(await call('GET', `${BASE}?cursor=bukan-kursor`), 400, 'BAD_CURSOR');
  });

  it('refuses an unknown tab with 422 instead of silently showing the default', async () => {
    auth.as(host);
    expectApiError(await call('GET', `${BASE}?tab=besok`), 422, 'VALIDATION');
  });
});

describe('GET /app/events/agenda and /people', () => {
  it('gives at most the events of today and tomorrow I am part of', async () => {
    const mine = await meeting({ creator: host, project, startsInMin: 120 });
    const notMine = await events.event({ creator: lead, project: otherProject, startsInMin: 120 });
    auth.as(host);
    const res = await call('GET', `${BASE}/agenda`);
    expect(res.status).toBe(200);
    const ids = res.body.items.map((i: Json) => i.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(notMine.id);
    // The widget line needs no more than this; a guest list never travels with it.
    expect(Object.keys(res.body.items[0]).sort()).toEqual([
      'endsAt',
      'id',
      'kind',
      'locationType',
      'project',
      'startsAt',
      'title',
    ]);
  });

  it('offers guest candidates of a project as names and job titles only', async () => {
    auth.as(host);
    const res = await call('GET', `${BASE}/people?projectId=${project.id}`);
    expect(res.status).toBe(200);
    for (const person of res.body.items) {
      expect(Object.keys(person).sort()).toEqual(['id', 'image', 'jobTitle', 'name']);
    }
  });
});

describe('GET /app/events/:id', () => {
  it('returns one event with its guests, minutes and can{}', async () => {
    const e = await meeting({
      creator: host,
      project,
      guests: [guest],
      note: { body: 'Catatan rapat.', status: 'draft' },
    });
    auth.as(guest);
    const res = await call('GET', `${BASE}/${e.id}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([...DETAIL_KEYS].sort());
    expect(res.body.note).toMatchObject({ body: 'Catatan rapat.', status: 'draft' });
    expect(res.body.participants.map((p: Json) => p.id).sort()).toEqual([guest.id, host.id].sort());
    // A guest reads and writes the minutes, but does not get the edit buttons.
    expect(res.body.can.writeNote).toBe(true);
    expect(res.body.can.update).toBeUndefined();
  });

  it('answers a hidden event exactly as it answers a missing one', async () => {
    const hidden = await events.event({ creator: lead, project: otherProject });
    auth.as(outsider);
    const unseen = await call('GET', `${BASE}/${hidden.id}`);
    const missing = await call('GET', `${BASE}/evapi-no-such-event`);
    expectApiError(unseen, 404, 'NOT_FOUND');
    // The request id and the path differ by construction; everything else must be identical.
    const strip = ({ requestId: _id, path: _path, ...rest }: Json) => rest;
    expect(strip(unseen.body)).toEqual(strip(missing.body));
  });
});

describe('POST /app/events', () => {
  it('creates an event, invites the creator and answers 201 with the detail', async () => {
    const res = await create(host, { projectId: project.id, participantIds: [guest.id] });
    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual([...DETAIL_KEYS].sort());
    expect(res.body.creator.id).toBe(host.id);
    expect(res.body.participants.map((p: Json) => p.id).sort()).toEqual([guest.id, host.id].sort());
    expect(res.body.remindersMinutes).toEqual([1440, 30]);
  });

  it('lets any signed-in user keep a personal event with no project', async () => {
    const res = await create(outsider, { projectId: null });
    expect(res.status).toBe(201);
    expect(res.body.project).toBeNull();
  });

  it('refuses a Pemantau attaching an event to the project they only watch with 403', async () => {
    expectApiError(await create(viewer, { projectId: project.id }), 403, 'NOT_MEMBER');
  });

  it('refuses a project that is in the Trash with 409 PROJECT_IN_TRASH', async () => {
    expectApiError(await create(lead, { projectId: trashedProject.id }), 409, 'PROJECT_IN_TRASH');
  });

  it('refuses an end that is not after the start, with the sentence the user reads', async () => {
    const res = await create(host, {
      startsAt: new Date(Date.now() + 90_000_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expectApiError(res, 422, 'VALIDATION');
    expect(res.body.error).toBe('Jam selesai harus setelah jam mulai.');
  });

  it('refuses the fields of a later slice and ignores a key it does not know', async () => {
    expectApiError(await create(host, { recurrence: 'weekly' }), 422, 'VALIDATION');
    const res = await create(host, {
      createdBy: outsider.id,
      canceledAt: new Date().toISOString(),
    });
    expect(res.status).toBe(201);
    expect(res.body.creator.id).toBe(host.id);
    expect(res.body.canceledAt).toBeNull();
  });
});

describe('PATCH, cancel and the guest list', () => {
  it('changes an event for its host and refuses a guest with 403', async () => {
    const e = await meeting();
    auth.as(host);
    const ok = await call('PATCH', `${BASE}/${e.id}`, { title: 'Rapat koordinasi (pindah jam)' });
    expect(ok.status).toBe(200);
    expect(ok.body.title).toBe('Rapat koordinasi (pindah jam)');

    auth.as(guest);
    expectApiError(
      await call('PATCH', `${BASE}/${e.id}`, { title: 'Dari peserta' }),
      403,
      'NOT_MANAGER',
    );
  });

  it('refuses moving an event to another project', async () => {
    const e = await meeting();
    auth.as(host);
    expectApiError(
      await call('PATCH', `${BASE}/${e.id}`, { projectId: otherProject.id }),
      422,
      'VALIDATION',
    );
  });

  it('cancels with a reason, keeps the row, and needs a reason to do it', async () => {
    const e = await meeting();
    auth.as(host);
    expectApiError(await call('POST', `${BASE}/${e.id}/cancel`, { reason: '' }), 422, 'VALIDATION');
    const res = await call('POST', `${BASE}/${e.id}/cancel`, { reason: 'Ruangan dipakai audit' });
    expect(res.status).toBe(200);
    expect(res.body.cancelReason).toBe('Ruangan dipakai audit');
    expect(res.body.canceledBy.id).toBe(host.id);
    // Still readable: the guests planned around it, so it is cancelled, not gone.
    expect((await call('GET', `${BASE}/${e.id}`)).status).toBe(200);
  });

  it('adds and removes guests for the host and refuses a guest doing it', async () => {
    const e = await meeting();
    auth.as(host);
    const added = await call('POST', `${BASE}/${e.id}/participants`, { userIds: [lead.id] });
    expect(added.status).toBe(200);
    expect(added.body.participants.map((p: Json) => p.id).sort()).toEqual(
      [guest.id, host.id, lead.id].sort(),
    );
    const removed = await call('DELETE', `${BASE}/${e.id}/participants/${lead.id}`);
    expect(removed.body.participants.map((p: Json) => p.id).sort()).toEqual(
      [guest.id, host.id].sort(),
    );

    auth.as(guest);
    expectApiError(
      await call('POST', `${BASE}/${e.id}/participants`, { userIds: [outsider.id] }),
      403,
      'NOT_MANAGER',
    );
  });
});

describe('PUT /app/events/:id/note', () => {
  it('saves the minutes and answers the badge with them', async () => {
    const e = await meeting();
    auth.as(guest);
    const res = await call('PUT', `${BASE}/${e.id}/note`, { body: 'Tiga keputusan.' });
    expect(res.status).toBe(200);
    expect(res.body.badge).toBe('draft');
    expect(res.body.note).toMatchObject({ body: 'Tiga keputusan.', status: 'draft' });
  });

  it('answers 409 NOTE_CONFLICT with the newer minutes when the lock is lost', async () => {
    const e = await meeting();
    auth.as(guest);
    const opened = await call('PUT', `${BASE}/${e.id}/note`, { body: 'Versi satu.' });
    const won = await call('PUT', `${BASE}/${e.id}/note`, {
      body: 'Versi dua.',
      baseUpdatedAt: opened.body.note.updatedAt,
    });
    expect(won.status).toBe(200);

    const lost = await call('PUT', `${BASE}/${e.id}/note`, {
      body: 'Versi dua yang lain.',
      baseUpdatedAt: opened.body.note.updatedAt,
    });
    expectApiError(lost, 409, 'NOTE_CONFLICT');
    expect(lost.body.note).toEqual(won.body.note);
  });

  it('refuses the minutes of a cancelled meeting with 409 EVENT_CANCELED', async () => {
    const e = await meeting({ creator: host, project, guests: [guest], canceledAt: new Date() });
    auth.as(guest);
    expectApiError(
      await call('PUT', `${BASE}/${e.id}/note`, { body: 'Tetap ditulis.' }),
      409,
      'EVENT_CANCELED',
    );
  });

  it('refuses a Pemantau writing the minutes with 403', async () => {
    const e = await meeting();
    auth.as(viewer);
    expectApiError(
      await call('PUT', `${BASE}/${e.id}/note`, { body: 'Dari pemantau.' }),
      403,
      'NOT_MEMBER',
    );
  });
});
