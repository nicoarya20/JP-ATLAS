/**
 * The calendar window of `listEvents` (A9): overlap rather than "starts inside", past events
 * included, and day boundaries read in the team zone. The WIB cases are the point of the suite —
 * with a UTC boundary a 06.00 WIB event belongs to the previous day and falls off the first day of
 * the window, which is exactly how a month grid loses its rows.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import type { Principal } from '../../server/access/types';
import type { EventClock, ListEventsResult } from '../../server/event/events.dto';
import { listEvents } from '../../server/event/events.query';
import { EVENT_RANGE_DAYS_MAX, parseEventRange } from '../../server/event/events.range';
import { toPrincipal } from '../../server/project/membership.query';
import { createCleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';
import { createEventFactory } from './factory.event';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'evrg' });
const shared = createEventFactory({ tag: 'evrg-s', now: () => ATLAS_NOW });

afterAll(async () => {
  await shared.flush();
  await cleaner.flushAll();
});

const TZ = 'Asia/Jakarta';
const clock: EventClock = { now: ATLAS_NOW, today: '2026-10-07', timeZone: TZ };
const principal = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

function good(res: ListEventsResult) {
  if (!res.ok) throw new Error(`list refused with ${res.code}`);
  return res;
}
const ids = (res: ListEventsResult) => good(res).items.map((i) => i.id);

describe('parseEventRange', () => {
  it('accepts no window at all, so the list keeps its old behaviour', () => {
    expect(parseEventRange(undefined, undefined)).toEqual({ ok: true, range: undefined });
    // A client that builds its query from optional state sends the keys empty; that is still none.
    expect(parseEventRange('', '')).toEqual({ ok: true, range: undefined });
    expect(parseEventRange('  ', undefined)).toEqual({ ok: true, range: undefined });
  });

  it('accepts a window and hands it back as dates', () => {
    expect(parseEventRange('2026-10-01', '2026-10-31')).toEqual({
      ok: true,
      range: { from: '2026-10-01', to: '2026-10-31' },
    });
  });

  it('refuses half a window', () => {
    expect(parseEventRange('2026-10-01', undefined).ok).toBe(false);
    expect(parseEventRange(undefined, '2026-10-31').ok).toBe(false);
  });

  it('refuses a day that is not a real date, so 31 February cannot widen the window', () => {
    for (const bad of ['2026-02-31', '2026-13-01', '07-10-2026', 'besok', '2026-10-1']) {
      expect(parseEventRange(bad, '2026-10-31').ok).toBe(false);
    }
  });

  it('refuses a window that runs backwards and one outside the calendar years', () => {
    expect(parseEventRange('2026-10-31', '2026-10-01').ok).toBe(false);
    expect(parseEventRange('1899-01-01', '1899-01-02').ok).toBe(false);
    expect(parseEventRange('2199-01-01', '2199-01-02').ok).toBe(false);
  });

  it(`accepts exactly ${EVENT_RANGE_DAYS_MAX} days and refuses one more`, () => {
    // 2026-01-01 plus (max - 1) days is the last day still inside the window.
    const start = new Date('2026-01-01T00:00:00Z');
    const end = (days: number) =>
      new Date(start.getTime() + (days - 1) * 86_400_000).toISOString().slice(0, 10);
    expect(parseEventRange('2026-01-01', end(EVENT_RANGE_DAYS_MAX)).ok).toBe(true);
    const over = parseEventRange('2026-01-01', end(EVENT_RANGE_DAYS_MAX + 1));
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.error).toContain(String(EVENT_RANGE_DAYS_MAX));
  });
});

let lead: TestUser;
let project: TestProject;
/** Ends 2 Oct 00.30 WIB: inside the window only if the boundary is read in WIB. */
let overlapsStart: { id: string };
/** 1 Oct 06.00 WIB = 30 Sep 23.00 UTC: the day the window starts on, in WIB. */
let firstDayMorning: { id: string };
/** 31 Oct 23.30 → 1 Nov 00.30 WIB: a meeting that runs across the end of the window. */
let lastDayNight: { id: string };
/** 1 Nov 06.00 WIB = 31 Oct 23.00 UTC: the day *after* the window, in WIB. */
let dayAfterMorning: { id: string };
/** Long past, to prove the window ignores `now` entirely. */
let longPast: { id: string };
/** Far future, outside October. */
let december: { id: string };

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    project = await f.project({ lead });
  });
  const at = (iso: string, durationMin = 60) =>
    shared.event({ project, creator: lead, startsAt: new Date(iso), durationMin });
  [overlapsStart, firstDayMorning, lastDayNight, dayAfterMorning, longPast, december] =
    await Promise.all([
      at('2026-09-30T16:00:00Z', 510), // 30 Sep 23.00 → 2 Oct 00.30 WIB
      at('2026-09-30T23:00:00Z'), // 1 Oct 06.00 WIB
      at('2026-10-31T16:30:00Z'), // 31 Oct 23.30 WIB
      at('2026-10-31T23:00:00Z'), // 1 Nov 06.00 WIB
      at('2025-03-04T02:00:00Z'), // long before `clock.now`
      at('2026-12-10T02:00:00Z'),
    ]);
});

const october = (over: Partial<Parameters<typeof listEvents>[1]> = {}) =>
  listEvents(
    principal(lead),
    { projectId: project.id, range: { from: '2026-10-01', to: '2026-10-31' }, ...over },
    clock,
  );

describe('listEvents with a calendar window', () => {
  it('takes the events that overlap it, not only those that start inside it', async () => {
    const got = ids(await october());
    expect(got).toContain(overlapsStart.id);
    expect(got).toContain(firstDayMorning.id);
    expect(got).toContain(lastDayNight.id);
  });

  it('takes events that are already over, which the Akan datang tab cannot', async () => {
    const got = ids(await october({ range: { from: '2025-03-01', to: '2025-03-31' } }));
    expect(got).toEqual([longPast.id]);
    // Same event, no window: the Upcoming tab cuts it off, and the Past tab finds it.
    expect(ids(await listEvents(principal(lead), { projectId: project.id }, clock))).not.toContain(
      longPast.id,
    );
    expect(
      ids(await listEvents(principal(lead), { projectId: project.id, tab: 'past' }, clock)),
    ).toContain(longPast.id);
  });

  it('reads the day boundaries in the team zone, not in UTC (WIB midnight)', async () => {
    const got = ids(await october());
    // 1 Nov 06.00 WIB is 31 Oct 23.00 UTC: a UTC boundary would pull it into October.
    expect(got).not.toContain(dayAfterMorning.id);
    expect(got).not.toContain(december.id);
    // The mirror case: a one-day window on 1 November holds the 06.00 WIB event and the meeting
    // that runs past midnight into it, and nothing that stayed inside October.
    const nov1 = ids(await october({ range: { from: '2026-11-01', to: '2026-11-01' } }));
    expect(nov1).toEqual([lastDayNight.id, dayAfterMorning.id]);
    expect(nov1).not.toContain(firstDayMorning.id);
    expect(nov1).not.toContain(overlapsStart.id);
  });

  it('holds a single WIB day from 00.00 to 24.00 local', async () => {
    const oct1 = ids(await october({ range: { from: '2026-10-01', to: '2026-10-01' } }));
    expect(oct1).toContain(firstDayMorning.id);
    // Started 30 Sep 23.00 WIB and still running on 1 Oct: it touches the day, so it is in.
    expect(oct1).toContain(overlapsStart.id);
    // 30 September in WIB holds that same event and not the 1 Oct morning one.
    const sep30 = ids(await october({ range: { from: '2026-09-30', to: '2026-09-30' } }));
    expect(sep30).toEqual([overlapsStart.id]);
  });

  it('still applies the other filters and keeps the ascending order of the window', async () => {
    expect(ids(await october({ kind: ['review'] }))).toEqual([]);
    // Ascending `startsAt`, the order a calendar fills its days in; ISO instants sort as text.
    const starts = good(await october()).items.map((i) => i.startsAt);
    expect(starts).toEqual([...starts].sort());
    expect(starts.length).toBeGreaterThan(1);
  });
});
