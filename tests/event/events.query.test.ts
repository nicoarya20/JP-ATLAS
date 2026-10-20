/**
 * Event reads (S7 E-03): the three-query budget of `listEvents`,
 * search, keyset paging, the Agenda window, and the two leaks the acceptance names — contact
 * columns in a guest list, and a non-member seeing an event they have no path to.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { eventParticipant, project as projectTable } from '../../server/db/schema';
import type { EventClock, ListEventsInput, ListEventsResult } from '../../server/event/events.dto';
import { AGENDA_LIMIT } from '../../server/event/events.dto';
import { agendaFor, getEvent, listEvents } from '../../server/event/events.query';
import { toPrincipal } from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { countQueries } from '../support/query-count';
import { createEventFactory } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'eqry' });
const shared = createEventFactory({ tag: 'eqry-s', now: () => ATLAS_NOW });
const perTest = createEventFactory({ tag: 'eqry-t', now: () => ATLAS_NOW });

afterEach(() => perTest.flush());
afterAll(async () => {
  await perTest.flush();
  await shared.flush();
  await cleaner.flushAll();
});

const TIME_ZONE = 'Asia/Jakarta';
// 2026-10-07 10:00 WIB; the Agenda window therefore closes at 2026-10-09 00:00 WIB.
const clock: EventClock = { now: ATLAS_NOW, today: '2026-10-07', timeZone: TIME_ZONE };
const principal = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

const MIN_PER_DAY = 1440;

function good(res: ListEventsResult) {
  if (!res.ok) throw new Error(`list refused with ${res.code}`);
  return res;
}

const ids = (res: ListEventsResult) => good(res).items.map((i) => i.id);

let lead: TestUser;
let member: TestUser;
let guest: TestUser;
let outsider: TestUser;
let viewer: TestUser;
let pm: TestUser;
let admin: TestUser;
let project: TestProject;
let trashed: TestProject;
let soon: { id: string };
let later: { id: string };
let personal: { id: string };
let guestOnly: { id: string };
let inTrashedProject: { id: string };

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    member = await f.user();
    guest = await f.user();
    outsider = await f.user();
    viewer = await f.user();
    pm = await f.user({ role: 'project_manager' });
    admin = await f.user({ role: 'admin' });
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

  soon = await shared.event({
    project,
    creator: lead,
    title: 'Rapat mingguan tim',
    startsInMin: 30,
  });
  later = await shared.event({
    project,
    creator: lead,
    title: 'Tinjauan 50% proyek',
    kind: 'review',
    startsInMin: MIN_PER_DAY * 3,
  });
  // Already over: the list tests below count on it being there as history, never as upcoming.
  await shared.event({
    project,
    creator: lead,
    title: 'Rapat kickoff',
    startsInMin: -MIN_PER_DAY,
  });
  // No project: visible to its creator and guests only, never to a Project Manager (Q7).
  personal = await shared.event({ project: null, creator: member, title: 'Dokter gigi' });
  // A project event the outsider is invited to: the guest-list path, with no membership at all.
  guestOnly = await shared.event({ project, creator: lead, guests: [outsider], startsInMin: 90 });
  inTrashedProject = await shared.event({ project: trashed, creator: lead, startsInMin: 120 });
});

describe('query budget', () => {
  it('spends exactly three queries on a page of project events', async () => {
    const counter = countQueries();
    const res = good(
      await listEvents(principal(lead), { projectId: project.id }, clock, counter.exec),
    );
    expect(res.items.length).toBeGreaterThan(1);
    expect(counter.queries).toHaveLength(3);
  });

  it('still spends three queries when the page is twenty times longer (no N+1)', async () => {
    const many = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        perTest.event({ project, creator: lead, guests: [member], startsInMin: 200 + i }),
      ),
    );
    const counter = countQueries();
    const res = good(
      await listEvents(principal(lead), { projectId: project.id, limit: 100 }, clock, counter.exec),
    );
    expect(res.items.length).toBeGreaterThanOrEqual(many.length);
    expect(counter.queries).toHaveLength(3);
  });

  it('fills the guest-list aggregate for the whole page from one query', async () => {
    const counter = countQueries();
    const res = good(
      await listEvents(principal(lead), { projectId: project.id }, clock, counter.exec),
    );
    const found = res.items.find((i) => i.id === guestOnly.id);
    // Creator + invited outsider: the count comes from the aggregate, not a per-row lookup.
    expect(found?.participants).toEqual({ total: 2, isParticipant: true });
    // One grouped statement for the whole page; the other mention of the table is the
    // visibility EXISTS inside the page query itself.
    expect(counter.queries.filter((q) => /group by/i.test(q))).toHaveLength(1);
  });
});

describe('filters', () => {
  it('finds an event by part of its title, ignoring case', async () => {
    expect(ids(await listEvents(principal(lead), { q: 'mingguan' }, clock))).toContain(soon.id);
    expect(ids(await listEvents(principal(lead), { q: 'MINGGUAN' }, clock))).toContain(soon.id);
    expect(ids(await listEvents(principal(lead), { q: 'tidak ada judul begini' }, clock))).toEqual(
      [],
    );
  });

  it('treats LIKE wildcards in the search text as literal characters', async () => {
    const literal = await perTest.event({ project, creator: lead, title: 'Rapat 100%_akhir' });
    // Same shape with real characters where the wildcards are: an unescaped `%_` would match it too.
    await perTest.event({ project, creator: lead, title: 'Rapat 100XYakhir' });
    expect(ids(await listEvents(principal(lead), { q: '100%_akhir' }, clock))).toEqual([
      literal.id,
    ]);
  });

  it('filters by kind and by project', async () => {
    expect(ids(await listEvents(principal(lead), { kind: ['review'] }, clock))).toEqual([later.id]);
    const mine = ids(await listEvents(principal(member), { projectId: project.id }, clock));
    expect(mine).not.toContain(personal.id);
  });

  it('never lists an event whose project is in the Trash', async () => {
    const all = ids(await listEvents(principal(admin), {}, clock));
    expect(all).not.toContain(inTrashedProject.id);
  });

  it('never lists a soft-deleted event', async () => {
    const gone = await perTest.event({ project, creator: lead, deletedAt: ATLAS_NOW });
    expect(ids(await listEvents(principal(admin), { projectId: project.id }, clock))).not.toContain(
      gone.id,
    );
  });
});

describe('keyset paging', () => {
  const PAGE = 4;

  /** Reads every page and returns the ids in order plus how many pages it took. */
  async function walk(p: Principal, input: ListEventsInput) {
    const seen: string[] = [];
    let cursor: string | undefined;
    let pages = 0;
    do {
      const res = good(
        await listEvents(p, { ...input, limit: PAGE, ...(cursor ? { cursor } : {}) }, clock),
      );
      seen.push(...res.items.map((i) => i.id));
      cursor = res.nextCursor ?? undefined;
      pages++;
    } while (cursor);
    return { seen, pages };
  }

  it('walks a tied page without skipping or repeating a row', async () => {
    // Every event starts at the same instant, so only the id tiebreaker can order them.
    const tied = await Promise.all(
      Array.from({ length: 11 }, () =>
        perTest.event({ project, creator: lead, startsAt: new Date(ATLAS_NOW.getTime() + 9e6) }),
      ),
    );
    const { seen, pages } = await walk(principal(lead), { projectId: project.id });
    expect(pages).toBeGreaterThan(1);
    expect(new Set(seen).size).toBe(seen.length);
    for (const e of tied) expect(seen).toContain(e.id);
  });

  it('answers BAD_CURSOR for a tampered cursor and for one from another list', async () => {
    const broken = await listEvents(principal(lead), { cursor: 'not-a-cursor' }, clock);
    expect(broken).toEqual({ ok: false, code: 'BAD_CURSOR' });
    // A numeric sort value belongs to a task list, not to this one.
    const numeric = Buffer.from(JSON.stringify([3, soon.id]), 'utf8').toString('base64url');
    expect(await listEvents(principal(lead), { cursor: numeric }, clock)).toEqual({
      ok: false,
      code: 'BAD_CURSOR',
    });
  });
});

describe('participant privacy', () => {
  /** Every string anywhere in the payload, so a leak cannot hide in a nested field. */
  const strings = (v: unknown): string[] =>
    typeof v === 'string'
      ? [v]
      : Array.isArray(v)
        ? v.flatMap(strings)
        : v && typeof v === 'object'
          ? Object.values(v).flatMap(strings)
          : [];

  it('carries no email address or phone number in a list page', async () => {
    const res = good(await listEvents(principal(lead), { projectId: project.id }, clock));
    const text = strings(res).join(' ');
    expect(text).not.toContain(outsider.email);
    expect(text).not.toContain('@');
  });

  it('shows the detail guest list as id and name only', async () => {
    const detail = await getEvent(principal(lead), guestOnly.id);
    if (!detail.ok) throw new Error('detail refused');
    expect(detail.event.participants.length).toBe(2);
    for (const person of detail.event.participants) {
      expect(Object.keys(person).sort()).toEqual(['id', 'name']);
    }
    expect(strings(detail.event).join(' ')).not.toContain(outsider.email);
  });
});

describe('visibility', () => {
  it('hides a project event from someone with no path to it', async () => {
    expect(ids(await listEvents(principal(outsider), { projectId: project.id }, clock))).toEqual([
      guestOnly.id,
    ]);
    const detail = await getEvent(principal(outsider), soon.id);
    expect(detail).toEqual({ ok: false, code: 'NOT_FOUND' });
  });

  it('reports a hidden event and a missing one with the same NOT_FOUND', async () => {
    const hidden = await getEvent(principal(outsider), personal.id);
    const missing = await getEvent(principal(outsider), 'eqry-no-such-event');
    expect(hidden).toEqual(missing);
  });

  it('lets a Pemantau read project events but not a personal one', async () => {
    const seen = ids(await listEvents(principal(viewer), { projectId: project.id }, clock));
    expect(seen).toContain(soon.id);
    expect(ids(await listEvents(principal(viewer), {}, clock))).not.toContain(personal.id);
  });

  it("lets a non-member Project Manager read project events but not someone's personal event", async () => {
    const seen = ids(await listEvents(principal(pm), {}, clock));
    expect(seen).toContain(soon.id);
    expect(seen).not.toContain(personal.id);
  });

  it('lets an Admin read every live event, personal ones included', async () => {
    const seen = ids(await listEvents(principal(admin), {}, clock));
    expect(seen).toContain(soon.id);
    expect(seen).toContain(personal.id);
  });

  it('gives a guest the read but not the update capability', async () => {
    const res = good(await listEvents(principal(outsider), {}, clock));
    const row = res.items.find((i) => i.id === guestOnly.id);
    expect(row?.participants.isParticipant).toBe(true);
    expect(row?.can.update).toBeUndefined();
    expect(row?.can.writeNote).toBe(true);
  });
});

describe('agendaFor', () => {
  it('returns my own events between now and the end of tomorrow, soonest first', async () => {
    const items = await agendaFor(principal(member), clock);
    expect(items.map((i) => i.id)).toEqual([personal.id]);
  });

  it('leaves out an event starting the day after tomorrow', async () => {
    const items = await agendaFor(principal(lead), clock);
    expect(items.map((i) => i.id)).not.toContain(later.id);
    expect(items.map((i) => i.id)).toContain(soon.id);
  });

  it('leaves out a cancelled event and one I am not part of', async () => {
    const off = await perTest.event({
      project,
      creator: lead,
      startsInMin: 45,
      canceledAt: ATLAS_NOW,
      cancelReason: 'Jadwal bentrok',
      canceledBy: lead,
    });
    const notMine = await perTest.event({ project, creator: member, startsInMin: 50 });
    await db.delete(eventParticipant).where(eq(eventParticipant.eventId, notMine.id));
    const seen = (await agendaFor(principal(lead), clock)).map((i) => i.id);
    expect(seen).not.toContain(off.id);
    expect(seen).not.toContain(notMine.id);
  });

  it(`shows at most ${AGENDA_LIMIT} rows`, async () => {
    await Promise.all(
      Array.from({ length: AGENDA_LIMIT + 3 }, (_, i) =>
        perTest.event({ creator: guest, project: null, startsInMin: 10 + i }),
      ),
    );
    expect(await agendaFor(principal(guest), clock)).toHaveLength(AGENDA_LIMIT);
  });
});
