/**
 * `GET /api/app/events?from=&to=`, the calendar window of A9. Three things matter here and are
 * asserted: a request without the window answers byte for byte what it answered before (the web
 * list must not move), a window takes the events that touch it including ones already over, and a
 * window that is malformed or too wide is refused with the uniform 422 rather than quietly clamped.
 *
 * Split from `app-events.test.ts`, which is already at the 400-line test cap.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { EVENT_RANGE_DAYS_MAX } from '../../server/event/events.range';
import { createEventFactory } from '../event/factory.event';
import { call, expectApiError, type Json, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import type { TestProject } from '../support/factory.project';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'evrgapi' });
const shared = createEventFactory({ tag: 'evrgapi-s', now: () => new Date() });

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterAll(async () => {
  await shared.flush();
  await cleaner.flushAll();
});

const BASE = '/app/events';
const MS_PER_DAY = 86_400_000;

const ids = (res: Json) => res.body.items.map((i: Json) => i.id);
/** `days` whole days from today, as the `YYYY-MM-DD` the query takes. */
const day = (days: number) => new Date(Date.now() + days * MS_PER_DAY).toISOString().slice(0, 10);

let lead: TestUser;
let outsider: TestUser;
let project: TestProject;
let soon: { id: string };
let longPast: { id: string };

beforeAll(async () => {
  await cleaner.shared(async () => {
    lead = await f.user({ role: 'project_manager' });
    outsider = await f.user();
    project = await f.project({ lead });
  });
  // Both at midday local, so neither sits on a day boundary whatever the machine's zone.
  soon = await shared.event({ project, creator: lead, startsInMin: 60 * 26 });
  longPast = await shared.event({ project, creator: lead, startsInMin: -60 * 24 * 40 });
});

describe('GET /app/events without the window', () => {
  it('answers exactly as before: the Upcoming tab, past events left out', async () => {
    auth.as(lead);
    const res = await call('GET', `${BASE}?projectId=${project.id}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['caps', 'items', 'nextCursor']);
    expect(ids(res)).toContain(soon.id);
    expect(ids(res)).not.toContain(longPast.id);
  });

  it('treats an empty from= and to= as no window at all, not as a broken one', async () => {
    auth.as(lead);
    const plain = await call('GET', `${BASE}?projectId=${project.id}`);
    const empty = await call('GET', `${BASE}?projectId=${project.id}&from=&to=`);
    expect(empty.status).toBe(200);
    expect(empty.body.items).toEqual(plain.body.items);
    expect(empty.body.nextCursor).toEqual(plain.body.nextCursor);
  });
});

describe('GET /app/events with the window', () => {
  it('takes the events that touch it, including ones already over', async () => {
    auth.as(lead);
    const res = await call(
      'GET',
      `${BASE}?projectId=${project.id}&from=${day(-45)}&to=${day(-35)}`,
    );
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([longPast.id]);
    expect(res.body.caps).toEqual({ createEvent: true });
  });

  it('covers both sides of today in one request, which no tab can', async () => {
    auth.as(lead);
    const res = await call('GET', `${BASE}?projectId=${project.id}&from=${day(-45)}&to=${day(10)}`);
    expect(ids(res)).toContain(longPast.id);
    expect(ids(res)).toContain(soon.id);
  });

  it('shows nothing of a project the caller is not in', async () => {
    auth.as(outsider);
    const res = await call('GET', `${BASE}?from=${day(-45)}&to=${day(10)}`);
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([]);
  });

  it('still refuses a broken cursor with 400 BAD_CURSOR', async () => {
    auth.as(lead);
    expectApiError(
      await call('GET', `${BASE}?from=${day(-1)}&to=${day(1)}&cursor=bukan-kursor`),
      400,
      'BAD_CURSOR',
    );
  });
});

describe('GET /app/events refuses a window it cannot serve', () => {
  it.each([
    ['half a window (only from)', `from=${day(0)}`],
    ['half a window (only to)', `to=${day(5)}`],
    ['a day that is not a date', 'from=besok&to=2026-10-31'],
    ['31 February', 'from=2026-02-01&to=2026-02-31'],
    ['a window that runs backwards', 'from=2026-10-31&to=2026-10-01'],
    ['a year outside the calendar', 'from=1899-01-01&to=1899-01-05'],
  ])('refuses %s with 422 VALIDATION', async (_name, query) => {
    auth.as(lead);
    expectApiError(await call('GET', `${BASE}?${query}`), 422, 'VALIDATION');
  });

  it(`refuses more than ${EVENT_RANGE_DAYS_MAX} days with 422 and accepts exactly that many`, async () => {
    auth.as(lead);
    const widest = await call('GET', `${BASE}?from=${day(0)}&to=${day(EVENT_RANGE_DAYS_MAX - 1)}`);
    expect(widest.status).toBe(200);
    const over = await call('GET', `${BASE}?from=${day(0)}&to=${day(EVENT_RANGE_DAYS_MAX)}`);
    expectApiError(over, 422, 'VALIDATION');
    expect(over.body.error).toContain(String(EVENT_RANGE_DAYS_MAX));
  });

  it('answers 401 before it looks at the window, so an anonymous caller learns nothing', async () => {
    expectApiError(await call('GET', `${BASE}?from=besok&to=besok`), 401, 'UNAUTHORIZED');
  });
});
