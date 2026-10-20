/** Beranda API: the sign-in gate, the response shape the page reads, and that the caller is the only scope. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { type HomeWorld, seedHomeWorld } from '../home/home.world';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'hapi' });

beforeEach(() => {
  auth.as(null);
  resetApiLimiters();
});
afterAll(() => cleaner.flushAll());

let w: HomeWorld;
beforeAll(async () => {
  w = await seedHomeWorld(f, cleaner);
});

/** The sections the page reads; adding one is fine, renaming or removing one breaks the Beranda. */
const SECTIONS = [
  'activity',
  'agenda',
  'ask',
  'briefing',
  'counters',
  'done',
  'focus',
  'now',
  'projects',
];

describe('GET /app/home', () => {
  it('is 401 without a session', async () => {
    expectApiError(await call('GET', '/app/home'), 401, 'UNAUTHORIZED');
  });

  it('answers every section, each wrapped as { ok, data }', async () => {
    auth.as(w.me);
    const res = await call('GET', '/app/home');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(SECTIONS);
    for (const name of SECTIONS.filter((s) => s !== 'now')) expect(res.body[name].ok).toBe(true);
    expect(Object.keys(res.body.now).sort()).toEqual([
      'dateLabel',
      'greeting',
      'iso',
      'timeLabel',
      'timeZone',
      'today',
    ]);
    expect(['pagi', 'siang', 'sore', 'malam']).toContain(res.body.now.greeting);
  });

  it('serves the focus rows the page needs to draw and complete a task', async () => {
    auth.as(w.me);
    const { focus } = (await call('GET', '/app/home')).body;
    const row = focus.data.items[0];
    expect(Object.keys(row).sort()).toEqual([
      'action',
      'dueDate',
      'group',
      'id',
      'number',
      'overdueDays',
      'priority',
      'project',
      'title',
    ]);
    expect(Object.keys(focus.data).sort()).toEqual([
      'awaitingReview',
      'awaitingReviewTotal',
      'items',
      'overdueTotal',
      'todayTotal',
      'total',
    ]);
  });

  it('shows the caller their own world: a manager sees both projects, an outsider none', async () => {
    auth.as(w.me);
    const mine = await call('GET', '/app/home');
    expect(mine.body.projects.data.map((p: { name: string }) => p.name).sort()).toEqual(
      [w.projects.hajatan.name, w.projects.dapur.name].sort(),
    );
    auth.as(w.outsider);
    const none = await call('GET', '/app/home');
    expect(none.status).toBe(200);
    expect(none.body.projects.data).toEqual([]);
    expect(none.body.focus.data.items).toEqual([]);
  });

  it('ignores a user id in the query string', async () => {
    auth.as(w.outsider);
    const res = await call('GET', `/app/home?userId=${w.me.id}`);
    expect(res.body.focus.data.items).toEqual([]);
  });

  it('never sends internals of a failure or other people ids beyond what rows name', async () => {
    auth.as(w.me);
    const text = JSON.stringify((await call('GET', '/app/home')).body);
    expect(text).not.toContain('stack');
    expect(text).not.toContain(w.outsider.id);
  });
});
