import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { PLAN_ERROR_COPY } from '../app/components/projects/plan/plan.copy';
import { ApiError } from '../app/lib/http';
import {
  createPhase,
  deletePhase,
  fetchProjectPlan,
  planKey,
  reorderPhases,
  setMilestoneReached,
  withPlanMessage,
} from '../app/lib/project-plan-api';
import { projectKeys } from '../app/lib/projects-api';
import { MILESTONES_PER_PROJECT, PHASES_PER_PROJECT } from '../server/project/project.limits';

const apiError = (status: number, code: string, message?: string) =>
  new ApiError({ status, code, message, requestId: 'req-1' });

describe('plan error code → Indonesian message', () => {
  it.each([
    [422, 'PHASE_LIMIT', PLAN_ERROR_COPY.phaseLimit(PHASES_PER_PROJECT)],
    [422, 'MILESTONE_LIMIT', PLAN_ERROR_COPY.milestoneLimit(MILESTONES_PER_PROJECT)],
    [404, 'NOT_FOUND', PLAN_ERROR_COPY.notFound],
    [403, 'NOT_MANAGER', PLAN_ERROR_COPY.notAllowed],
    [409, 'PROJECT_IN_TRASH', PLAN_ERROR_COPY.inTrash],
  ])('%i %s gets the plan wording', (status, code, message) => {
    const mapped = withPlanMessage(apiError(status, code, 'Pesan server.')) as ApiError;
    expect(mapped.message).toBe(message);
    expect(mapped.status).toBe(status);
    expect(mapped.code).toBe(code);
    expect(mapped.requestId).toBe('req-1');
  });

  it('names the cap in the limit messages', () => {
    expect(PLAN_ERROR_COPY.phaseLimit(PHASES_PER_PROJECT)).toContain(String(PHASES_PER_PROJECT));
    expect(PLAN_ERROR_COPY.milestoneLimit(MILESTONES_PER_PROJECT)).toContain(
      String(MILESTONES_PER_PROJECT),
    );
  });

  it('keeps the server sentence of a VALIDATION answer (empty name, end before start, phase missing)', () => {
    const sentence = 'Tanggal selesai tidak boleh sebelum tanggal mulai. Ubah salah satunya.';
    const mapped = withPlanMessage(apiError(422, 'VALIDATION', sentence)) as ApiError;
    expect(mapped.message).toBe(sentence);
  });

  it('falls back to a plan sentence when VALIDATION carries no message', () => {
    const mapped = withPlanMessage(apiError(422, 'VALIDATION')) as ApiError;
    expect(mapped.message).toBe(PLAN_ERROR_COPY.invalid);
  });

  it('passes unknown codes and non-API errors through untouched', () => {
    const other = apiError(500, 'INTERNAL', 'x');
    expect(withPlanMessage(other)).toBe(other);
    const net = new TypeError('Failed to fetch');
    expect(withPlanMessage(net)).toBe(net);
  });
});

describe('plan cache key', () => {
  it('sits under the project detail key so a project refresh also refreshes the plan', () => {
    expect(planKey('p-1').slice(0, 3)).toEqual([...projectKeys.detail('p-1')]);
    expect(planKey('p-1').at(-1)).toBe('plan');
  });
});

let restoreFetch: (() => void) | null = null;
function stubFetch(make: () => Response) {
  const spy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
    make()) as unknown as typeof fetch);
  restoreFetch = () => spy.mockRestore();
  return spy;
}
afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
});
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const lastCall = (spy: ReturnType<typeof stubFetch>) => {
  const [input, init] = spy.mock.calls[0] as [Request | string, RequestInit | undefined];
  const req = input instanceof Request ? input : new Request(input, init);
  return req;
};

describe('plan calls', () => {
  it('reads the plan from GET /projects/:id/plan', async () => {
    const plan = { phases: [], milestones: [], nextMilestone: null, currentPhase: null };
    const spy = stubFetch(() => json(200, plan));
    expect(await fetchProjectPlan('p 1')).toEqual(plan);
    const req = lastCall(spy);
    expect(req.method).toBe('GET');
    expect(new URL(req.url).pathname).toBe('/api/app/projects/p%201/plan');
  });

  it('posts a new phase and the reorder ids', async () => {
    const spy = stubFetch(() => json(201, { id: 'ph-1' }));
    await createPhase('p-1', { name: 'Perencanaan' });
    let req = lastCall(spy);
    expect(req.method).toBe('POST');
    expect(new URL(req.url).pathname).toBe('/api/app/projects/p-1/phases');
    expect(await req.json()).toEqual({ name: 'Perencanaan' });

    spy.mockClear();
    await reorderPhases('p-1', ['b', 'a']);
    req = lastCall(spy);
    expect(new URL(req.url).pathname).toBe('/api/app/projects/p-1/phases/reorder');
    expect(await req.json()).toEqual({ ids: ['b', 'a'] });
  });

  it('chooses reach or unreach by the flag', async () => {
    const spy = stubFetch(() => json(200, { id: 'm-1' }));
    await setMilestoneReached('p-1', 'm-1', true);
    expect(new URL(lastCall(spy).url).pathname).toBe('/api/app/projects/p-1/milestones/m-1/reach');
    spy.mockClear();
    await setMilestoneReached('p-1', 'm-1', false);
    expect(new URL(lastCall(spy).url).pathname).toBe(
      '/api/app/projects/p-1/milestones/m-1/unreach',
    );
  });

  it('throws an ApiError with the plan wording when the limit is hit', async () => {
    stubFetch(() => json(422, { error: 'Pesan server.', code: 'PHASE_LIMIT', status: 422 }));
    const err = await createPhase('p-1', { name: 'Tahap 21' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('PHASE_LIMIT');
    expect((err as ApiError).message).toBe(PLAN_ERROR_COPY.phaseLimit(PHASES_PER_PROJECT));
  });

  it('answers how many tasks a deleted phase released', async () => {
    stubFetch(() => json(200, { id: 'ph-1', affectedTasks: 3 }));
    expect(await deletePhase('p-1', 'ph-1')).toEqual({ id: 'ph-1', affectedTasks: 3 });
  });
});
