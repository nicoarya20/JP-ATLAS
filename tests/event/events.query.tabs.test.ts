/**
 * The Upcoming/Past tabs of `listEvents` (S7 E-03): the cut is on `ends_at` against `now`, so an
 * event in progress stays on Upcoming, and the keyset still runs on `starts_at`, so rows keep the
 * order the list shows. Split from `events.query.test.ts` to keep both files under the test cap.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import type { Principal } from '../../server/access/types';
import type { EventClock, ListEventsResult } from '../../server/event/events.dto';
import { listEvents } from '../../server/event/events.query';
import { toPrincipal } from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { createEventFactory } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'eqtb' });
const shared = createEventFactory({ tag: 'eqtb-s', now: () => ATLAS_NOW });
const perTest = createEventFactory({ tag: 'eqtb-t', now: () => ATLAS_NOW });

afterEach(() => perTest.flush());
afterAll(async () => {
  await perTest.flush();
  await shared.flush();
  await cleaner.flushAll();
});

const clock: EventClock = { now: ATLAS_NOW, today: '2026-10-07', timeZone: 'Asia/Jakarta' };
const principal = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });
const MIN_PER_DAY = 1440;

function good(res: ListEventsResult) {
  if (!res.ok) throw new Error(`list refused with ${res.code}`);
  return res;
}

const ids = (res: ListEventsResult) => good(res).items.map((i) => i.id);

let lead: TestUser;
let project: TestProject;
let soon: { id: string };
let later: { id: string };
let past: { id: string };

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    project = await f.project({ lead });
  });
  soon = await shared.event({ project, creator: lead, startsInMin: 30 });
  later = await shared.event({ project, creator: lead, startsInMin: MIN_PER_DAY * 3 });
  past = await shared.event({ project, creator: lead, startsInMin: -MIN_PER_DAY });
});

describe('tabs', () => {
  it('shows only what has not ended on the Upcoming tab', async () => {
    const res = ids(await listEvents(principal(lead), { projectId: project.id }, clock));
    expect(res).toContain(soon.id);
    expect(res).not.toContain(past.id);
  });

  it('shows only what has ended on the Past tab', async () => {
    const res = ids(
      await listEvents(principal(lead), { tab: 'past', projectId: project.id }, clock),
    );
    expect(res).toContain(past.id);
    expect(res).not.toContain(soon.id);
  });

  it('keeps an event in progress on Upcoming and off Past', async () => {
    const running = await perTest.event({
      project,
      creator: lead,
      startsInMin: -15,
      durationMin: 60,
    });
    expect(ids(await listEvents(principal(lead), { projectId: project.id }, clock))).toContain(
      running.id,
    );
    expect(
      ids(await listEvents(principal(lead), { tab: 'past', projectId: project.id }, clock)),
    ).not.toContain(running.id);
  });

  it('moves an event to Past the instant it ends', async () => {
    const ending = await perTest.event({
      project,
      creator: lead,
      startsInMin: -60,
      durationMin: 60,
    });
    expect(ids(await listEvents(principal(lead), { projectId: project.id }, clock))).not.toContain(
      ending.id,
    );
    expect(
      ids(await listEvents(principal(lead), { tab: 'past', projectId: project.id }, clock)),
    ).toContain(ending.id);
  });

  it('puts an event starting exactly at now on Upcoming', async () => {
    const edge = await perTest.event({ project, creator: lead, startsAt: ATLAS_NOW });
    expect(ids(await listEvents(principal(lead), { projectId: project.id }, clock))).toContain(
      edge.id,
    );
    expect(
      ids(await listEvents(principal(lead), { tab: 'past', projectId: project.id }, clock)),
    ).not.toContain(edge.id);
  });

  it('pages Upcoming across an event in progress without skipping or repeating a row', async () => {
    const running = await perTest.event({ project, creator: lead, startsInMin: -15 });
    const first = good(
      await listEvents(principal(lead), { projectId: project.id, limit: 1 }, clock),
    );
    expect(first.items.map((i) => i.id)).toEqual([running.id]);
    expect(first.nextCursor).not.toBeNull();
    const rest = good(
      await listEvents(
        principal(lead),
        { projectId: project.id, cursor: first.nextCursor ?? undefined },
        clock,
      ),
    );
    const all = [...first.items, ...rest.items].map((i) => i.id);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain(soon.id);
  });

  it('orders Upcoming forwards in time and Past backwards', async () => {
    const up = ids(await listEvents(principal(lead), { projectId: project.id }, clock));
    expect(up.indexOf(soon.id)).toBeLessThan(up.indexOf(later.id));
    const olderPast = await perTest.event({
      project,
      creator: lead,
      startsInMin: -MIN_PER_DAY * 30,
    });
    const back = ids(
      await listEvents(principal(lead), { tab: 'past', projectId: project.id }, clock),
    );
    expect(back.indexOf(past.id)).toBeLessThan(back.indexOf(olderPast.id));
  });
});
