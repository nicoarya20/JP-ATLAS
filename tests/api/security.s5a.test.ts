/**
 * Project schedule IDOR matrix (S5a-04, R03 §2.2): the eight personas against every plan, deadline,
 * override and activity route, through the real router. A refused write must leave the plan exactly as
 * it was; someone who cannot see the project gets the same 404 as an id that does not exist.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { PERSONA_CODES, type PersonaCode } from '../access/fixtures';
import { call, expectApiError, resetApiLimiters } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import {
  buildScheduleWorld,
  planFingerprint,
  resetPlan,
  type ScheduleWorld,
  type SeededPlan,
} from '../support/schedule-world';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 's5asec' });

let w: ScheduleWorld;
let seed: SeededPlan;
beforeAll(async () => {
  w = await buildScheduleWorld(cleaner, f);
});
beforeEach(async () => {
  auth.as(null);
  resetApiLimiters();
  seed = await resetPlan(w);
});
afterEach(() => cleaner.flushTest());
afterAll(async () => {
  resetApiLimiters();
  await cleaner.flushAll();
});

type Verdict = 'ok' | readonly [403 | 404, string];
type Row = Record<PersonaCode, Verdict>;
const NOT_MANAGER = [403, 'NOT_MANAGER'] as const;
const NOT_FOUND = [404, 'NOT_FOUND'] as const;
// Anyone who may see the project reads; a Member outside it cannot tell it exists (M21).
const READ: Row = {
  SA: 'ok',
  AD: 'ok',
  'PM-K': 'ok',
  'PM-X': 'ok',
  'M-K': 'ok',
  AG: 'ok',
  PT: 'ok',
  BA: NOT_FOUND,
};
// Writes: managers and Admin only; a non-member Project Manager reads but does not write.
const WRITE: Row = { ...READ, 'PM-X': NOT_MANAGER, AG: NOT_MANAGER, PT: NOT_MANAGER };

type RouteSpec = {
  name: string;
  verdict: Row;
  ok: number;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: (s: SeededPlan) => string;
  body?: (s: SeededPlan) => unknown;
};

const base = () => `/app/projects/${w.projectId}`;
const LATER = '2030-11-01'; // test-only
const route = (
  name: string,
  method: RouteSpec['method'],
  path: RouteSpec['path'],
  ok: number,
  body?: RouteSpec['body'],
): RouteSpec => ({ name, verdict: method === 'GET' ? READ : WRITE, ok, method, path, body });

const ROUTES: RouteSpec[] = [
  route('plan', 'GET', () => `${base()}/plan`, 200),
  route('extensions', 'GET', () => `${base()}/extensions`, 200),
  route('activity', 'GET', () => `${base()}/activity`, 200),
  route(
    'phase create',
    'POST',
    () => `${base()}/phases`,
    201,
    () => ({ name: 'Tahap baru' }),
  ),
  route(
    'phase reorder',
    'POST',
    () => `${base()}/phases/reorder`,
    200,
    (s) => ({
      ids: [s.phaseB, s.phaseA],
    }),
  ),
  route(
    'phase edit',
    'PATCH',
    (s) => `${base()}/phases/${s.phaseA}`,
    200,
    () => ({
      name: 'Tahap diubah',
    }),
  ),
  route('phase delete', 'DELETE', (s) => `${base()}/phases/${s.phaseA}`, 200),
  route(
    'milestone create',
    'POST',
    () => `${base()}/milestones`,
    201,
    () => ({
      title: 'Milestone baru',
      dueDate: LATER,
    }),
  ),
  route(
    'milestone edit',
    'PATCH',
    (s) => `${base()}/milestones/${s.milestoneId}`,
    200,
    () => ({
      title: 'Milestone diubah',
    }),
  ),
  route('milestone delete', 'DELETE', (s) => `${base()}/milestones/${s.milestoneId}`, 200),
  route('milestone reach', 'POST', (s) => `${base()}/milestones/${s.milestoneId}/reach`, 200),
  route('milestone unreach', 'POST', (s) => `${base()}/milestones/${s.milestoneId}/unreach`, 200),
  route(
    'extend deadline',
    'POST',
    () => `${base()}/extend-deadline`,
    201,
    () => ({
      newDueDate: LATER,
      reasonCategory: 'dependency',
      reason: 'Menunggu pemasok',
    }),
  ),
  route(
    'override set',
    'POST',
    () => `${base()}/condition-override`,
    201,
    () => ({
      condition: 'off_track',
      reason: 'Bahan belum datang',
    }),
  ),
  route('override clear', 'DELETE', () => `${base()}/condition-override`, 200),
];

describe('sign-in gate', () => {
  it.each(ROUTES.map((r) => [r.name, r] as const))('%s without a session is 401', async (_n, r) => {
    const res = await call(r.method, r.path(seed), r.body?.(seed));
    expectApiError(res, 401, 'UNAUTHORIZED');
  });
});

const CASES = ROUTES.flatMap((r) => PERSONA_CODES.map((code) => [r.name, code, r] as const));

describe('IDOR matrix: eight personas × every schedule route', () => {
  it.each(CASES)('%s as %s', async (_name, code, r) => {
    const before = await planFingerprint(w.projectId);
    auth.as(w.people[code]);
    const res = await call(r.method, r.path(seed), r.body?.(seed));
    const verdict = r.verdict[code];
    if (verdict === 'ok') {
      expect(res.status).toBe(r.ok);
      return;
    }
    expectApiError(res, verdict[0], verdict[1]);
    expect(await planFingerprint(w.projectId)).toEqual(before);
  });
});

describe('hidden project answers like a missing one', () => {
  it.each(ROUTES.map((r) => [r.name, r] as const))('%s: outsider vs random id', async (_n, r) => {
    auth.as(w.people.BA);
    const real = await call(r.method, r.path(seed), r.body?.(seed));
    const ghost = await call(
      r.method,
      r.path(seed).replace(w.projectId, 'no-such-project'),
      r.body?.(seed),
    );
    expect(real.status).toBe(404);
    expect(ghost.status).toBe(404);
    // `path` and `requestId` differ by design; everything the caller could learn from must not.
    const same = ({ error, code, status }: typeof real.body) => ({ error, code, status });
    expect(same(real.body)).toEqual(same(ghost.body));
  });
});
