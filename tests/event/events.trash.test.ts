/**
 * Event Trash (S7 E-07): a deleted event leaves the List and the Agenda and shows up in the Trash,
 * comes back whole (guests and minutes), follows its project into the Trash and out again, and an
 * event deleted by hand is not swept back by a project restore.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { event, project as projectTable } from '../../server/db/schema';
import { requestEventClock } from '../../server/event/events.clock';
import { agendaFor, getEvent, listEvents } from '../../server/event/events.query';
import { restoreEvent, trashEvent } from '../../server/event/events.trash';
import { toPrincipal } from '../../server/project/membership.query';
import { restoreProject, trashProject } from '../../server/project/project-trash.service';
import { listTrash } from '../../server/trash/trash.list.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { createEventFactory, type EventInput } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'etrash' });
const events = createEventFactory({ tag: 'etrash-e', now: () => ATLAS_NOW });
afterEach(() => events.flush());
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

const MIN = 60_000;
const DAY = 86_400_000;
const at = (min: number) => new Date(ATLAS_NOW.getTime() + min * MIN);
const clock = requestEventClock(ATLAS_NOW);
const as = (u: TestUser, impersonating = false): Principal => ({
  ...toPrincipal({ user: u, role: u.role }),
  impersonating,
});

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

/** A project event an hour from `ATLAS_NOW`, created by `creator`, with `guest` invited and minutes written. */
const meeting = (over: Partial<EventInput> = {}) =>
  events.event({
    creator,
    guests: [guest],
    project,
    startsInMin: 60,
    note: { body: 'Hasil rapat: pasang rak dulu.', status: 'confirmed' }, // test-only
    ...over,
  });

const rowOf = async (id: string) => {
  const [row] = await db.select().from(event).where(eq(event.id, id));
  return row;
};
const listedIds = async (u: TestUser) => {
  const r = await listEvents(as(u), { tab: 'upcoming' }, clock);
  if (!r.ok) throw new Error(`listEvents refused with ${r.code}`);
  return r.items.map((i) => i.id);
};
const trashIds = async (u: TestUser, kind: 'all' | 'event' = 'event') =>
  (await listTrash(as(u), { kind, limit: 100, offset: 0, now: ATLAS_NOW })).items.map((i) => i.id);

describe('trashEvent', () => {
  it('hides the event from the List and the Agenda and files it in the Trash', async () => {
    const e = await meeting();
    expect(await listedIds(creator)).toContain(e.id);
    expect((await agendaFor(as(creator), clock)).map((a) => a.id)).toContain(e.id);

    const r = await trashEvent(as(creator), e.id, ATLAS_NOW);
    expect(r).toEqual({
      ok: true,
      value: { kind: 'event', id: e.id, label: e.title, projectId: project.id },
    });

    for (const u of [creator, guest, lead, admin]) expect(await listedIds(u)).not.toContain(e.id);
    // A stale link does not open a deleted event as if it were live.
    expect(await getEvent(as(creator), e.id)).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect((await agendaFor(as(creator), clock)).map((a) => a.id)).not.toContain(e.id);
    expect(await trashIds(creator)).toEqual([e.id]);
    expect(await rowOf(e.id)).toMatchObject({ deletedBy: creator.id, deletedWithProjectId: null });
  });

  it('lets the project manager and an Admin delete it, and refuses a guest, a viewer and an outsider', async () => {
    for (const u of [lead, admin]) {
      const e = await meeting();
      expect((await trashEvent(as(u), e.id, ATLAS_NOW)).ok).toBe(true);
    }
    const e = await meeting();
    const refusals = await Promise.all(
      [guest, viewer, outsider].map((u) => trashEvent(as(u), e.id, ATLAS_NOW)),
    );
    expect(refusals).toEqual([
      { ok: false, code: 'NOT_MANAGER' },
      { ok: false, code: 'NOT_MANAGER' },
      { ok: false, code: 'NOT_FOUND' },
    ]);
    expect((await rowOf(e.id))?.deletedAt).toBeNull();
  });

  it('is refused while impersonating, and a repeated delete answers NOT_FOUND', async () => {
    const e = await meeting();
    expect(await trashEvent(as(creator, true), e.id, ATLAS_NOW)).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
    expect((await trashEvent(as(creator), e.id, ATLAS_NOW)).ok).toBe(true);
    expect(await trashEvent(as(creator), e.id, ATLAS_NOW)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
    expect(await trashEvent(as(creator), 'no-such-event', ATLAS_NOW)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it('can delete a cancelled event too', async () => {
    const e = await meeting({ canceledAt: at(-5), cancelReason: 'Batal', canceledBy: lead });
    expect((await trashEvent(as(creator), e.id, ATLAS_NOW)).ok).toBe(true);
  });
});

describe('restoreEvent', () => {
  it('brings the event back whole, with its guests and minutes', async () => {
    const e = await meeting();
    await trashEvent(as(creator), e.id, ATLAS_NOW);

    const r = await restoreEvent(as(creator), e.id, at(10));
    expect(r).toMatchObject({ ok: true, value: { kind: 'event', id: e.id } });

    expect(await listedIds(guest)).toContain(e.id);
    expect(await trashIds(creator)).toEqual([]);
    const back = await getEvent(as(guest), e.id);
    if (!back.ok) throw new Error(`getEvent refused with ${back.code}`);
    expect(back.event.participants.map((p) => p.id).sort()).toEqual([creator.id, guest.id].sort());
    expect(back.event.note).toMatchObject({
      body: 'Hasil rapat: pasang rak dulu.',
      status: 'confirmed',
    });
    expect(await rowOf(e.id)).toMatchObject({ deletedAt: null, deletedBy: null });
  });

  it('is allowed for the creator, the project manager and an Admin, not for a guest or a viewer', async () => {
    for (const u of [creator, lead, admin]) {
      const e = await meeting();
      await trashEvent(as(creator), e.id, ATLAS_NOW);
      expect((await restoreEvent(as(u), e.id, at(1))).ok).toBe(true);
    }
    const e = await meeting();
    await trashEvent(as(creator), e.id, ATLAS_NOW);
    expect(await restoreEvent(as(guest), e.id, at(1))).toEqual({ ok: false, code: 'NOT_MANAGER' });
    expect(await restoreEvent(as(outsider), e.id, at(1))).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(await restoreEvent(as(creator, true), e.id, at(1))).toEqual({
      ok: false,
      code: 'IMPERSONATING',
    });
  });

  it('refuses a live event and answers EXPIRED after the retention window', async () => {
    const live = await meeting();
    expect(await restoreEvent(as(creator), live.id, at(1))).toEqual({
      ok: false,
      code: 'WRONG_STATE',
    });
    const old = await meeting();
    await trashEvent(as(creator), old.id, ATLAS_NOW);
    expect(
      await restoreEvent(as(creator), old.id, new Date(ATLAS_NOW.getTime() + 31 * DAY)),
    ).toEqual({
      ok: false,
      code: 'EXPIRED',
    });
  });

  it('answers PROJECT_IN_TRASH (409) while its project is in the Trash', async () => {
    const e = await meeting();
    await trashEvent(as(creator), e.id, ATLAS_NOW);
    await db
      .update(projectTable)
      .set({ deletedAt: ATLAS_NOW, deletedBy: lead.id })
      .where(eq(projectTable.id, project.id));
    try {
      expect(await restoreEvent(as(creator), e.id, at(1))).toEqual({
        ok: false,
        code: 'PROJECT_IN_TRASH',
      });
      expect((await rowOf(e.id))?.deletedAt).not.toBeNull();
    } finally {
      await db
        .update(projectTable)
        .set({ deletedAt: null, deletedBy: null })
        .where(eq(projectTable.id, project.id));
    }
  });
});

describe('project Trash cascade', () => {
  /** A project of its own, so trashing it does not disturb the shared one. */
  const ownProject = () => f.project({ lead, members: [[creator, 'member']] });

  it('takes the live events of a deleted project along, and brings them back with it', async () => {
    const p = await ownProject();
    const inProject = await meeting({ project: p });
    const personal = await meeting({ project: null });

    const gone = await trashProject(as(lead), p.id, ATLAS_NOW);
    expect(gone.ok).toBe(true);
    expect(await rowOf(inProject.id)).toMatchObject({
      deletedBy: lead.id,
      deletedWithProjectId: p.id,
    });
    expect((await rowOf(inProject.id))?.deletedAt).not.toBeNull();
    // A personal event never belonged to the project, so it stays where it is.
    expect((await rowOf(personal.id))?.deletedAt).toBeNull();
    expect(await listedIds(creator)).not.toContain(inProject.id);
    // The project row stands for the events that went with it: no row of their own in the Trash.
    expect(await trashIds(lead)).toEqual([]);

    const back = await restoreProject(as(lead), p.id, at(5));
    expect(back.ok).toBe(true);
    expect(await rowOf(inProject.id)).toMatchObject({
      deletedAt: null,
      deletedBy: null,
      deletedWithProjectId: null,
    });
    expect(await listedIds(creator)).toContain(inProject.id);
    const detail = await getEvent(as(guest), inProject.id);
    expect(detail.ok && detail.event.note?.body).toBe('Hasil rapat: pasang rak dulu.');
  });

  it('does not restore an event that was deleted by hand before the project', async () => {
    const p = await ownProject();
    const byHand = await meeting({ project: p });
    const withProject = await meeting({ project: p });
    await trashEvent(as(creator), byHand.id, ATLAS_NOW);

    await trashProject(as(lead), p.id, at(1));
    expect((await rowOf(byHand.id))?.deletedWithProjectId).toBeNull();
    // Its own Trash row stays, flagged as waiting for the project.
    const [item] = (await listTrash(as(lead), { kind: 'event', limit: 10, offset: 0, now: at(2) }))
      .items;
    expect(item).toMatchObject({
      kind: 'event',
      id: byHand.id,
      blockedBy: { projectId: p.id },
      can: { restore: 'PROJECT_IN_TRASH' },
    });

    await restoreProject(as(lead), p.id, at(3));
    expect((await rowOf(withProject.id))?.deletedAt).toBeNull();
    expect((await rowOf(byHand.id))?.deletedAt).not.toBeNull();
    expect((await restoreEvent(as(creator), byHand.id, at(4))).ok).toBe(true);
  });
});

describe('Trash list', () => {
  it('shows the deleter, the restore limit and the restore right, and no contact detail', async () => {
    const e = await meeting();
    await trashEvent(as(lead), e.id, ATLAS_NOW);

    const page = await listTrash(as(creator), { kind: 'all', limit: 50, offset: 0, now: at(5) });
    const item = page.items.find((i) => i.id === e.id);
    expect(item).toMatchObject({
      kind: 'event',
      title: e.title,
      eventKind: 'meeting',
      startsAt: e.startsAt.toISOString(),
      project: { id: project.id },
      blockedBy: null,
      deletedBy: { id: lead.id, name: lead.name },
      can: { restore: true },
    });
    expect(page.counts.event).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(item)).not.toContain('@');
  });

  it('shows an event only to its Admin, its creator, its deleter and its project managers', async () => {
    const e = await meeting();
    await trashEvent(as(creator), e.id, ATLAS_NOW);
    for (const u of [creator, lead, admin]) expect(await trashIds(u)).toContain(e.id);
    for (const u of [guest, viewer, outsider]) expect(await trashIds(u)).not.toContain(e.id);
  });
});
