/**
 * The event cards (S7 E-04), seen from the Inbox. Driven through the event service, because the
 * hook belongs to the service: a card must follow the write whatever called it, not only the route.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { notification, notificationPref } from '../../server/db/schema';
import {
  addParticipants,
  cancelEvent,
  createEvent,
  removeParticipant,
  updateEvent,
} from '../../server/event/events.service';
import { listInbox } from '../../server/notification/notification.query';
import { toPrincipal } from '../../server/project/membership.query';
import { createEventFactory } from '../event/factory.event';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitevt' });
const events = createEventFactory({ tag: 'emitevt-e', now: () => ATLAS_NOW });
afterEach(() => events.flush());
afterAll(async () => {
  await events.flush();
  await cleaner.flushAll();
});

const MS_PER_MIN = 60_000;
const at = (min: number) => new Date(ATLAS_NOW.getTime() + min * MS_PER_MIN).toISOString();
const as = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

let organiser: TestUser;
let guest: TestUser;
let other: TestUser;
let project: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    organiser = await f.user({ role: 'project_manager' });
    guest = await f.user();
    other = await f.user();
    project = await f.project({
      lead: organiser,
      members: [
        [guest, 'member'],
        [other, 'member'],
      ],
      name: 'Renovasi Dapur', // test-only
    });
  });
});

/** Creates through the service so the invitation hook runs, and tracks the row for the sweep. */
async function create(guests: TestUser[], projectId: string | null = project.id) {
  const r = await createEvent(as(organiser), {
    title: 'Rapat kickoff', // test-only
    startsAt: at(1440),
    endsAt: at(1500),
    projectId,
    participantIds: guests.map((g) => g.id),
  });
  if (!r.ok) throw new Error(`createEvent refused with ${r.code}`);
  return events.track(r.event.id);
}

const cardsOf = (u: TestUser, eventId: string) =>
  db
    .select()
    .from(notification)
    .where(and(eq(notification.recipientId, u.id), eq(notification.refId, eventId)))
    .orderBy(notification.kind);

const kinds = async (u: TestUser, eventId: string) =>
  (await cardsOf(u, eventId)).map((c) => c.kind);

describe('createEvent', () => {
  it('sends each invited guest one event_invited card and keeps the organiser out', async () => {
    const id = await create([guest, other]);

    for (const u of [guest, other]) {
      const cards = await cardsOf(u, id);
      expect(cards).toHaveLength(1);
      expect(cards[0]).toMatchObject({
        kind: 'event_invited',
        lane: 'info',
        refType: 'event',
        projectId: project.id,
        actorId: organiser.id,
      });
      expect(cards[0].payload).toMatchObject({
        title: 'Rapat kickoff',
        startsAt: at(1440),
        projectName: 'Renovasi Dapur',
      });
    }
    expect(await kinds(organiser, id)).toEqual([]);
  });

  it('carries no email or phone in the card', async () => {
    const id = await create([guest]);
    const [card] = await cardsOf(guest, id);
    expect(Object.keys(card.payload).sort()).toEqual(['projectName', 'startsAt', 'title']);
  });

  it('points the card button at the event page', async () => {
    const id = await create([guest]);
    const list = await listInbox(as(guest), { lane: 'info' }, ATLAS_NOW);
    if (!list.ok) throw new Error(`listInbox refused with ${list.code}`);
    const card = list.items.find((c) => c.ref.id === id);
    expect(card?.href).toBe(`/app/events/${id}`);
    expect(card?.button).toBe('Lihat acara');
  });

  it('works for a personal event, which has no project to gate the card', async () => {
    const stranger = await f.user();
    const id = await create([stranger], null);
    const [card] = await cardsOf(stranger, id);
    expect(card).toMatchObject({ kind: 'event_invited', projectId: null });
  });

  it('skips a guest who muted "Kabar terbaru"', async () => {
    await db.insert(notificationPref).values({ userId: other.id, category: 'news', inApp: false });
    try {
      const id = await create([guest, other]);
      expect(await kinds(other, id)).toEqual([]);
      expect(await kinds(guest, id)).toEqual(['event_invited']);
    } finally {
      await db.delete(notificationPref).where(eq(notificationPref.userId, other.id));
    }
  });
});

describe('addParticipants', () => {
  it('invites only the people who were not already on the list', async () => {
    const id = await create([guest]);
    const r = await addParticipants(as(organiser), id, [guest.id, other.id]);
    expect(r.ok).toBe(true);

    expect(await cardsOf(guest, id)).toHaveLength(1);
    expect(await kinds(other, id)).toEqual(['event_invited']);
  });
});

describe('updateEvent', () => {
  it('tells the guests when the time moves, not the person who moved it', async () => {
    const id = await create([guest]);
    const r = await updateEvent(as(organiser), id, { startsAt: at(1500), endsAt: at(1560) });
    expect(r.ok).toBe(true);

    expect(await kinds(guest, id)).toEqual(['event_changed', 'event_invited']);
    expect(await kinds(organiser, id)).toEqual([]);
    const changed = (await cardsOf(guest, id)).find((c) => c.kind === 'event_changed');
    expect(changed?.payload).toMatchObject({ startsAt: at(1500) });
  });

  it('also tells them when the title or the place changes', async () => {
    const id = await create([guest]);
    await updateEvent(as(organiser), id, { title: 'Rapat kickoff proyek' }); // test-only
    await updateEvent(as(organiser), id, { locationText: 'Ruang Mawar' }); // test-only

    const changed = (await cardsOf(guest, id)).find((c) => c.kind === 'event_changed');
    // Both edits fall in one hour, so they are one bundled card.
    expect(changed?.bundleCount).toBe(2);
  });

  it('stays quiet for an edit guests do not act on (agenda, reminders, kind)', async () => {
    const id = await create([guest]);
    await updateEvent(as(organiser), id, {
      agenda: 'Bahas anggaran', // test-only
      remindersMinutes: [60],
      kind: 'review',
    });
    expect(await kinds(guest, id)).toEqual(['event_invited']);
  });

  it('stays quiet when the "change" repeats the stored values', async () => {
    const id = await create([guest]);
    await updateEvent(as(organiser), id, { title: 'Rapat kickoff', startsAt: at(1440) });
    expect(await kinds(guest, id)).toEqual(['event_invited']);
  });
});

describe('cancelEvent', () => {
  it('sends every guest one cancellation card, even after earlier changes', async () => {
    const id = await create([guest, other]);
    await updateEvent(as(organiser), id, { title: 'Rapat kickoff ulang' }); // test-only
    const r = await cancelEvent(as(organiser), id, 'Narasumber berhalangan', ATLAS_NOW);
    expect(r.ok).toBe(true);

    for (const u of [guest, other]) {
      expect(await kinds(u, id)).toEqual(['event_canceled', 'event_changed', 'event_invited']);
    }
    const [canceled] = (await cardsOf(guest, id)).filter((c) => c.kind === 'event_canceled');
    expect(canceled.dedupeKey).toBe(`event_canceled:event:${id}:canceled`);
    expect(await kinds(organiser, id)).toEqual([]);
  });

  it('does not send a second card when the cancel is refused as already canceled', async () => {
    const id = await create([guest]);
    await cancelEvent(as(organiser), id, 'Batal', ATLAS_NOW);
    const again = await cancelEvent(as(organiser), id, 'Batal lagi', ATLAS_NOW);
    expect(again.ok).toBe(false);
    const [card] = (await cardsOf(guest, id)).filter((c) => c.kind === 'event_canceled');
    expect(card.bundleCount).toBe(1);
  });
});

describe('removeParticipant', () => {
  it('deletes the removed guest’s cards for the event and leaves the others alone', async () => {
    const id = await create([guest, other]);
    await removeParticipant(as(organiser), id, guest.id);

    expect(await cardsOf(guest, id)).toEqual([]);
    expect(await kinds(other, id)).toEqual(['event_invited']);
  });
});
