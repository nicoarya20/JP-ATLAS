/** Task workflow API (S2-05): sign-in gate, response shape, personas × verbs, illegal pairs, races, unrouted review steps. */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { TASK_STATUSES, type TaskStatus } from '../../server/pm/enums';
import { PM_ERRORS } from '../../server/pm/errors';
import { rateLimiter } from '../../server/rate-limit';
import { ENABLED_TASK_ACTIONS, type EnabledTaskAction } from '../../server/task/task.limits';
import { call, expectApiError } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'twfapi' });
// Every call shares one client IP; resetting keeps this file's volume from tripping the global limiter here or later.
beforeEach(() => {
  auth.as(null);
  rateLimiter.reset();
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  rateLimiter.reset();
  await cleaner.flushAll();
});

const url = (ref: string | number, action: string) => `/app/tasks/${ref}/${action}`;

/** The status each verb starts from, and the body it needs. */
const VERBS: ReadonlyArray<[EnabledTaskAction, TaskStatus, Record<string, unknown> | undefined]> = [
  ['start', 'todo', undefined],
  ['unstart', 'in_progress', undefined],
  ['complete', 'in_progress', undefined],
  ['reopen', 'done', { reason: 'Masih ada yang kurang' }],
  ['cancel', 'todo', { category: 'duplicate' }],
  ['uncancel', 'canceled', undefined],
];
const LEGAL = new Set([
  'todo>start',
  'in_progress>unstart',
  'todo>complete',
  'in_progress>complete',
  'done>reopen',
  'todo>cancel',
  'in_progress>cancel',
  'in_review>cancel',
  'canceled>uncancel',
]);
const BODY = Object.fromEntries(VERBS.map(([v, , b]) => [v, b]));
const ILLEGAL = TASK_STATUSES.flatMap((from) =>
  ENABLED_TASK_ACTIONS.filter((a) => !LEGAL.has(`${from}>${a}`)).map((a) => [from, a] as const),
);

/** A project where `owner` created and works every task, plus the other personas. */
async function graph() {
  const lead = await f.user({ role: 'project_manager' });
  const owner = await f.user();
  const otherMember = await f.user();
  const viewer = await f.user();
  const outsider = await f.user();
  const proj = await f.project({
    lead,
    members: [
      [owner, 'member'],
      [otherMember, 'member'],
      [viewer, 'viewer'],
    ],
  });
  const make = (status: TaskStatus, extra: { needsReview?: boolean } = {}) =>
    f.task({ project: proj, creator: owner, assignee: owner, status, ...extra });
  return { lead, owner, otherMember, viewer, outsider, proj, make };
}

describe('sign-in gate', () => {
  it.each([...ENABLED_TASK_ACTIONS])('POST …/%s without a session is 401', async (action) => {
    expectApiError(await call('POST', url(1, action), BODY[action]), 401, 'UNAUTHORIZED');
  });
});

describe('each verb', () => {
  it.each(VERBS)('the owner may %s from %s and gets { task, can }', async (action, from, body) => {
    const g = await graph();
    const t = await g.make(from);
    auth.as(g.owner);
    const res = await call('POST', url(t.number, action), body);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['can', 'task']);
    expect(res.body.task.id).toBe(t.id);
    expect(res.body.task.status).not.toBe(from);
    expect('primary' in res.body.can).toBe(true);
  });

  it.each(VERBS)(
    '%s: another member 403, a viewer 403, a non-member 404',
    async (action, from, body) => {
      const g = await graph();
      const t = await g.make(from);
      auth.as(g.otherMember);
      expectApiError(await call('POST', url(t.id, action), body), 403, 'NOT_OWNER');
      auth.as(g.viewer);
      expectApiError(await call('POST', url(t.id, action), body), 403, 'NOT_MEMBER');
      auth.as(g.outsider);
      const hidden = await call('POST', url(t.id, action), body);
      expectApiError(hidden, 404, 'NOT_FOUND');
      const missing = await call('POST', url('no-such-task', action), body);
      expect(missing.body.error).toBe(hidden.body.error);
    },
  );
});

describe('illegal pairs', () => {
  it('lists at least 20 of them', () => {
    expect(ILLEGAL.length).toBeGreaterThanOrEqual(20);
  });

  it.each(ILLEGAL)('%s --%s--> answers 409 and changes nothing', async (from, action) => {
    const g = await graph();
    const t = await g.make(from);
    auth.as(g.lead);
    const res = await call('POST', url(t.id, action), BODY[action] ?? { reason: 'Alasan cukup' });
    expect(res.status).toBe(409);
    auth.as(g.owner);
    expect((await call('GET', `/app/tasks/${t.id}`)).body.status).toBe(from);
  });
});

describe('races and locks', () => {
  it('lets one of two simultaneous starts win; the other gets 409', async () => {
    const g = await graph();
    const t = await g.make('todo');
    auth.as(g.owner);
    const results = await Promise.all([
      call('POST', url(t.id, 'start')),
      call('POST', url(t.id, 'start')),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('refuses complete on a task that needs review with REVIEW_REQUIRED', async () => {
    const g = await graph();
    const t = await g.make('in_progress', { needsReview: true });
    auth.as(g.owner);
    expectApiError(await call('POST', url(t.id, 'complete')), 409, 'REVIEW_REQUIRED');
  });
});

describe('inputs', () => {
  it('asks for a reason to reopen, in words that fit reopening (N10)', async () => {
    const g = await graph();
    const t = await g.make('done');
    auth.as(g.owner);
    const res = await call('POST', url(t.id, 'reopen'), {});
    expectApiError(res, 422, 'REASON_REQUIRED');
    expect(res.body.error).toBe(PM_ERRORS.REASON_REQUIRED.message);
    expect(res.body.error).not.toContain('penolakan');
  });

  it('needs a note when the cancel category is "other", and a category at all', async () => {
    const g = await graph();
    const t = await g.make('todo');
    auth.as(g.owner);
    const other = await call('POST', url(t.id, 'cancel'), { category: 'other' });
    expectApiError(other, 422, 'CANCEL_NOTE_REQUIRED');
    expectApiError(await call('POST', url(t.id, 'cancel'), {}), 422, 'VALIDATION');
    expectApiError(
      await call('POST', url(t.id, 'cancel'), { category: 'bosan' }),
      422,
      'VALIDATION',
    );
  });
});

describe('review steps wait for S4', () => {
  it.each(['approve', 'request-review', 'return'])(
    'POST …/%s is not routed (404)',
    async (step) => {
      const g = await graph();
      const t = await g.make('in_review');
      auth.as(g.lead);
      const res = await call('POST', url(t.id, step), { note: 'Sudah dicek' });
      expect(res.status).toBe(404);
    },
  );
});
