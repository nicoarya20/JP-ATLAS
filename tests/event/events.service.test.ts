/**
 * Event writes (S7 E-03): create in one transaction with the creator invited, the span rule,
 * guest checks, the permission refusals, cancellation, and the reminder claims an update clears
 * so the tick fires again at the new time (E-04 relies on that).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import {
  event,
  eventParticipant,
  eventReminder,
  project as projectTable,
} from '../../server/db/schema';
import {
  addParticipants,
  type CreateEventInput,
  cancelEvent,
  createEvent,
  removeParticipant,
  updateEvent,
} from '../../server/event/events.service';
import { EVENT_WRITE_MESSAGES } from '../../server/event/events.validate';
import { EVENT_REMINDER_OFFSETS_MIN } from '../../server/pm/enums';
import { toPrincipal } from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { createEventFactory } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'esvc' });
const perTest = createEventFactory({ tag: 'esvc-t', now: () => ATLAS_NOW });

afterEach(() => perTest.flush());
afterAll(async () => {
  await perTest.flush();
  await cleaner.flushAll();
});

const principal = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });
const MS_PER_MIN = 60_000;
const at = (min: number) => new Date(ATLAS_NOW.getTime() + min * MS_PER_MIN).toISOString();

let lead: TestUser;
let member: TestUser;
let viewer: TestUser;
let outsider: TestUser;
let pending: TestUser;
let project: TestProject;
let trashed: TestProject;

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    member = await f.user();
    viewer = await f.user();
    outsider = await f.user();
    pending = await f.user({ status: 'pending' });
    project = await f.project({
      lead,
      members: [
        [member, 'member'],
        [viewer, 'viewer'],
      ],
    });
    trashed = await f.project({ lead });
    await db
      .update(projectTable)
      .set({ deletedAt: ATLAS_NOW, deletedBy: lead.id })
      .where(eq(projectTable.id, trashed.id));
  });
});

/** Creates through the service and tracks the row so the sweep covers it. */
async function create(u: TestUser, input: Partial<CreateEventInput> = {}) {
  const res = await createEvent(principal(u), {
    title: 'Rapat koordinasi', // test-only
    startsAt: at(60),
    endsAt: at(120),
    ...input,
  });
  if (res.ok) perTest.track(res.event.id);
  return res;
}

const guestsOf = (eventId: string) =>
  db
    .select({ userId: eventParticipant.userId })
    .from(eventParticipant)
    .where(eq(eventParticipant.eventId, eventId));

const claimsOf = (eventId: string) =>
  db.select().from(eventReminder).where(eq(eventReminder.eventId, eventId));

describe('createEvent', () => {
  it('stores the event and invites the creator in the same write', async () => {
    const res = await create(member, { projectId: project.id, participantIds: [lead.id] });
    if (!res.ok) throw new Error(`refused with ${res.code}`);
    expect(res.event.project?.id).toBe(project.id);
    expect(res.event.creator?.id).toBe(member.id);
    expect(res.event.remindersMinutes).toEqual([...EVENT_REMINDER_OFFSETS_MIN]);
    const ids = (await guestsOf(res.event.id)).map((g) => g.userId).sort();
    expect(ids).toEqual([lead.id, member.id].sort());
  });

  it('lets any signed-in user create a personal event with no project', async () => {
    const res = await create(outsider, { projectId: null });
    if (!res.ok) throw new Error(`refused with ${res.code}`);
    expect(res.event.project).toBeNull();
    expect((await guestsOf(res.event.id)).map((g) => g.userId)).toEqual([outsider.id]);
  });

  it('refuses a Pemantau attaching an event to the project they only watch', async () => {
    expect(await create(viewer, { projectId: project.id })).toMatchObject({
      ok: false,
      code: 'NOT_MEMBER',
    });
  });

  it('refuses a project that is in the Trash', async () => {
    expect(await create(lead, { projectId: trashed.id })).toMatchObject({
      ok: false,
      code: 'PROJECT_IN_TRASH',
    });
  });

  it('answers NOT_FOUND for a project id that does not exist', async () => {
    expect(await create(lead, { projectId: 'esvc-no-such-project' })).toMatchObject({
      ok: false,
      code: 'NOT_FOUND',
    });
  });

  it('refuses an end that is not after the start, with the sentence the user reads', async () => {
    expect(await create(member, { startsAt: at(120), endsAt: at(60) })).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: EVENT_WRITE_MESSAGES.endsBeforeStarts,
    });
    expect(await create(member, { startsAt: at(60), endsAt: at(60) })).toMatchObject({
      ok: false,
      code: 'VALIDATION',
    });
  });

  it('refuses an unparseable date instead of throwing', async () => {
    expect(await create(member, { startsAt: 'besok pagi' })).toMatchObject({
      ok: false,
      code: 'VALIDATION',
    });
  });

  it('refuses a meeting link that is not http(s), so the detail page never renders a script href', async () => {
    for (const meetingUrl of [
      'javascript:alert(1)',
      'data:text/html,x',
      'vbscript:x',
      'meet.example',
    ]) {
      expect(await create(member, { meetingUrl })).toEqual({
        ok: false,
        code: 'VALIDATION',
        error: EVENT_WRITE_MESSAGES.meetingUrl,
      });
    }
    expect(await create(member, { meetingUrl: 'https://meet.example.test/ok' })).toMatchObject({
      ok: true,
    });
    expect(await create(member, { meetingUrl: null })).toMatchObject({ ok: true });
  });

  it('refuses a guest who is unknown or not approved, and writes nothing', async () => {
    const before = await db.select({ id: event.id }).from(event);
    expect(await create(member, { participantIds: [pending.id] })).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: EVENT_WRITE_MESSAGES.unknownGuest,
    });
    expect(await create(member, { participantIds: ['esvc-ghost'] })).toMatchObject({
      ok: false,
      code: 'VALIDATION',
    });
    expect(await db.select({ id: event.id }).from(event)).toHaveLength(before.length);
  });
});

describe('updateEvent', () => {
  it('changes the fields it is given and leaves the rest alone', async () => {
    const e = await perTest.event({ project, creator: lead, agenda: 'Bahas rilis' });
    const res = await updateEvent(principal(lead), e.id, {
      title: 'Rapat rilis', // test-only
      locationType: 'online',
      meetingUrl: 'https://meet.example.test/abc',
    });
    if (!res.ok) throw new Error(`refused with ${res.code}`);
    expect(res.event.title).toBe('Rapat rilis');
    expect(res.event.locationType).toBe('online');
    expect(res.event.agenda).toBe('Bahas rilis');
    expect(res.event.startsAt).toBe(e.startsAt.toISOString());
  });

  it('refuses a non-http(s) meeting link on update and keeps the stored one', async () => {
    const e = await perTest.event({
      project,
      creator: lead,
      meetingUrl: 'https://meet.example.test/a',
    });
    const res = await updateEvent(principal(lead), e.id, { meetingUrl: 'javascript:alert(1)' });
    expect(res).toEqual({ ok: false, code: 'VALIDATION', error: EVENT_WRITE_MESSAGES.meetingUrl });
    const [row] = await db.select({ url: event.meetingUrl }).from(event).where(eq(event.id, e.id));
    expect(row.url).toBe('https://meet.example.test/a');
  });

  it('clears the reminder claims when the start moves, so the tick fires at the new time', async () => {
    const e = await perTest.event({ project, creator: lead, claimed: [1440, 30] });
    expect(await claimsOf(e.id)).toHaveLength(2);
    const res = await updateEvent(principal(lead), e.id, { startsAt: at(600), endsAt: at(660) });
    expect(res.ok).toBe(true);
    expect(await claimsOf(e.id)).toHaveLength(0);
  });

  it('keeps the reminder claims when the start is untouched', async () => {
    const e = await perTest.event({ project, creator: lead, claimed: [30] });
    const res = await updateEvent(principal(lead), e.id, { title: 'Judul baru' }); // test-only
    expect(res.ok).toBe(true);
    expect(await claimsOf(e.id)).toHaveLength(1);
  });

  it('refuses a guest who is not the creator or a project manager', async () => {
    const e = await perTest.event({ project, creator: lead, guests: [member] });
    expect(await updateEvent(principal(member), e.id, { title: 'Coba ubah' })).toMatchObject({
      ok: false,
      code: 'NOT_MANAGER',
    });
  });

  it('lets the creator of a personal event change it', async () => {
    const e = await perTest.event({ project: null, creator: member });
    expect(await updateEvent(principal(member), e.id, { kind: 'important' })).toMatchObject({
      ok: true,
    });
  });

  it('reports an event the actor cannot see as NOT_FOUND, like a missing one', async () => {
    const e = await perTest.event({ project, creator: lead });
    const hidden = await updateEvent(principal(outsider), e.id, { title: 'Coba' });
    const missing = await updateEvent(principal(outsider), 'esvc-nope', { title: 'Coba' });
    expect(hidden).toEqual({ ok: false, code: 'NOT_FOUND' });
    expect(missing).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('refuses an update whose span would end before it starts', async () => {
    const e = await perTest.event({ project, creator: lead });
    expect(await updateEvent(principal(lead), e.id, { endsAt: at(-10) })).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: EVENT_WRITE_MESSAGES.endsBeforeStarts,
    });
  });
});

describe('cancelEvent', () => {
  it('records the reason and who cancelled, and drops the pending claims', async () => {
    const e = await perTest.event({ project, creator: lead, claimed: [30] });
    const res = await cancelEvent(principal(lead), e.id, '  Ruang rapat dipakai  ', ATLAS_NOW);
    if (!res.ok) throw new Error(`refused with ${res.code}`);
    expect(res.event.canceledAt).toBe(ATLAS_NOW.toISOString());
    expect(res.event.cancelReason).toBe('Ruang rapat dipakai');
    expect(res.event.canceledBy?.id).toBe(lead.id);
    expect(await claimsOf(e.id)).toHaveLength(0);
  });

  it('insists on a reason, so participants are never left guessing', async () => {
    const e = await perTest.event({ project, creator: lead });
    expect(await cancelEvent(principal(lead), e.id, '   ', ATLAS_NOW)).toMatchObject({
      ok: false,
      code: 'REASON_REQUIRED',
    });
  });

  it('refuses to cancel an event that is already cancelled', async () => {
    const e = await perTest.event({
      project,
      creator: lead,
      canceledAt: ATLAS_NOW,
      cancelReason: 'Sudah dibatalkan',
      canceledBy: lead,
    });
    expect(await cancelEvent(principal(lead), e.id, 'Sekali lagi', ATLAS_NOW)).toMatchObject({
      ok: false,
      code: 'WRONG_STATE',
    });
  });

  it('refuses while a super-admin is impersonating someone (Q9)', async () => {
    const e = await perTest.event({ project, creator: lead });
    const asLead = toPrincipal({ user: lead, role: lead.role, impersonatedBy: 'esvc-super' });
    expect(await cancelEvent(asLead, e.id, 'Tidak boleh', ATLAS_NOW)).toMatchObject({
      ok: false,
      code: 'IMPERSONATING',
    });
  });
});

describe('participants', () => {
  it('adds guests and reports the new list by id and name only', async () => {
    const e = await perTest.event({ project, creator: lead });
    const res = await addParticipants(principal(lead), e.id, [member.id, viewer.id]);
    if (!res.ok) throw new Error(`refused with ${res.code}`);
    expect(res.participants.map((p) => p.id).sort()).toEqual(
      [lead.id, member.id, viewer.id].sort(),
    );
    for (const person of res.participants) {
      expect(Object.keys(person).sort()).toEqual(['id', 'name']);
    }
  });

  it('treats re-inviting someone already on the list as a no-op', async () => {
    const e = await perTest.event({ project, creator: lead, guests: [member] });
    const res = await addParticipants(principal(lead), e.id, [member.id]);
    expect(res.ok).toBe(true);
    expect(await guestsOf(e.id)).toHaveLength(2);
  });

  it('removes one guest and ignores removing someone who is not on the list', async () => {
    const e = await perTest.event({ project, creator: lead, guests: [member] });
    const res = await removeParticipant(principal(lead), e.id, member.id);
    if (!res.ok) throw new Error(`refused with ${res.code}`);
    expect(res.participants.map((p) => p.id)).toEqual([lead.id]);
    expect(await removeParticipant(principal(lead), e.id, outsider.id)).toMatchObject({ ok: true });
  });

  it('refuses a guest changing the list, and an unknown person being added', async () => {
    const e = await perTest.event({ project, creator: lead, guests: [member] });
    expect(await addParticipants(principal(member), e.id, [viewer.id])).toMatchObject({
      ok: false,
      code: 'NOT_MANAGER',
    });
    expect(await addParticipants(principal(lead), e.id, [pending.id])).toEqual({
      ok: false,
      code: 'VALIDATION',
      error: EVENT_WRITE_MESSAGES.unknownGuest,
    });
  });
});
