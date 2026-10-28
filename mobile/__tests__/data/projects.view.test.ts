// What the project screens make of the server's answers where the answer has gaps: no Lead, no deadline, no tasks,
// no phase dates, a manual condition, more extensions than listed, two Managers. Today is the test clock's Oct 7.
import {
  projectExtensionsResource,
  projectMembersResource,
  projectPlanResource,
  projectResource,
} from '../../src/data/projects.api';
import { toCard } from '../../src/data/projects.list';
import { fromToday, getProjectHead, getProjectSteps } from '../../src/data/projects.view';
import {
  getDeadlineHistory,
  getProjectMembers,
  phaseRange,
} from '../../src/data/projects.view.tabs';
import { forgetAllResources } from '../../src/data/resource';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  atlasDetail,
  atlasExtensions,
  atlasMembers,
  atlasPlan,
  atlasRoutes,
  sinarItem,
} from '../helpers/projects-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => forgetAllResources());
afterEach(() => {
  server?.restore();
  server = null;
});

/** The Atlas reads with some answers replaced (same keys, so serveAuth still tries the longer paths first). */
const load = async (routes: AuthRoutes) => {
  server = serveAuth({ ...atlasRoutes(), ...routes });
  await Promise.all([
    projectResource('p-atlas').ensure(),
    projectPlanResource('p-atlas').ensure(),
    projectMembersResource('p-atlas').ensure(),
    projectExtensionsResource('p-atlas').ensure(),
  ]);
};

describe('words for missing data', () => {
  test('a card with no Lead, deadline, tasks or condition says so', () => {
    expect(toCard(sinarItem())).toEqual({
      id: 'p-sinar',
      name: 'Sinar Rebrand',
      status: 'On hold',
      lead: 'No lead',
      condition: null,
      note: 'No tasks yet',
      progress: 0,
      percent: '–',
      due: 'No deadline',
    });
  });

  test('phase ranges with one or no date', () => {
    expect(phaseRange('2026-09-01', null)).toBe('From Sep 1');
    expect(phaseRange(null, '2026-09-24')).toBe('Until Sep 24');
    expect(phaseRange(null, null)).toBe('No dates');
  });

  test('days from today, both ways', () => {
    expect(fromToday('2026-10-07')).toBe('today');
    expect(fromToday('2026-10-08')).toBe('in 1 day');
    expect(fromToday('2026-10-04')).toBe('3 days ago');
  });
});

describe('header', () => {
  test('null before the detail arrives', () => {
    expect(getProjectHead('p-atlas')).toBeNull();
  });

  test('a manual condition names who set it; no extension, no pill; the Trash count is `live`', async () => {
    await load({
      '/api/app/projects/p-atlas': {
        body: atlasDetail({
          lead: null,
          dueDate: null,
          extensionCount: 0,
          conditionOverride: {
            condition: 'on_track',
            reason: 'Sudah aman',
            setByName: null,
            expiresAt: null,
          },
        }),
      },
    });
    expect(getProjectHead('p-atlas')).toMatchObject({
      lead: 'No lead',
      due: 'No deadline',
      extended: null,
      manual: 'Set by hand',
      live: 10,
    });
  });
});

describe('plan, history and members', () => {
  test('no current phase and no next milestone: steps alone', async () => {
    await load({
      '/api/app/projects/p-atlas/plan': {
        body: { ...atlasPlan(), currentPhase: null, nextMilestone: null },
      },
    });
    expect(getProjectSteps('p-atlas')).toMatchObject({ now: null, milestone: null });
    expect(getProjectSteps('p-atlas')?.steps.map((s) => s.state)).toEqual([
      'done',
      'in_progress',
      'not_started',
    ]);
  });

  test('more extensions than listed say how many; none at all is no history', async () => {
    await load({
      '/api/app/projects/p-atlas/extensions': { body: { ...atlasExtensions(), count: 7 } },
    });
    expect(getDeadlineHistory('p-atlas')?.more).toBe('Showing the last 1 of 7.');
    forgetAllResources();
    await load({
      '/api/app/projects/p-atlas/extensions': {
        body: { items: [], count: 0, total: 0, limit: 5 },
      },
    });
    expect(getDeadlineHistory('p-atlas')).toBeNull();
  });

  test('two Managers: no only-Manager note; the signed-in account is (You)', async () => {
    const two = { items: atlasMembers().items.map((x) => ({ ...x, role: 'manager' as const })) };
    await load({ '/api/app/projects/p-atlas/members': { body: two } });
    const m = getProjectMembers('p-atlas');
    expect(m?.onlyManager).toBeNull();
    expect(m?.cards.map((c) => [c.userId, c.you, c.roleLabel])).toEqual([
      ['u-nico', true, 'Manager'],
      ['u-rina', false, 'Manager'],
    ]);
  });
});
