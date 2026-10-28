/**
 * `/api/app/team` behind the Team screens: the privacy contract by absent keys, the summary that
 * only counts tasks when one page is the whole team, offset paging inside one resource, a query
 * that changes while a request is out, and sign out. The screens are __tests__/team/team.screen.test.tsx.
 */
import { forgetAllResources, knownResources } from '@/data/resource';
import { getTeam, roleLine, TEAM_NOTE } from '@/data/team';
import {
  getTeamQuery,
  loadMoreTeam,
  resetTeamQuery,
  setTeamQuery,
  teamPersonResource,
  teamResource,
} from '@/data/team.api';
import { getTeamPerson } from '@/data/team.person';
import { clearSession } from '@/session/session.state';

import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { list, me, query, rina, rinaDetail } from '../helpers/team-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
const lists = () => (server?.calls ?? []).filter((u) => u.includes('/api/app/team?'));

beforeEach(() => {
  forgetAllResources();
  resetTeamQuery();
});
afterEach(() => {
  server?.restore();
  server = null;
});

describe('the list in the screen shape', () => {
  test('a Manager sees counts and the load sorts; the summary counts tasks for the whole team', async () => {
    serve({ '/api/app/team?': { body: list([me(), rina()]) } });
    await teamResource.ensure();
    const d = getTeam();
    expect(d?.summary).toBe('2 people · 1 project · 5 active tasks · 1 overdue');
    expect(d?.sorts).toEqual(['name', 'active', 'overdue']);
    expect(d?.note).toBeUndefined();
    expect(d?.people[1]).toEqual({
      id: 'u-rina',
      full: 'Rina Wulandari',
      you: false,
      jobTitle: 'Designer',
      role: 'Member · Atlas Project',
      extra: undefined,
      load: { active: 3, overdue: 1 },
      leave: undefined,
    });
    expect(query(lists()[0] ?? '')).toEqual({ limit: '24', offset: '0' });
  });

  test('a key the server left out is a line that is not there, not a zero', async () => {
    const hidden = rina({
      load: undefined,
      availability: { kind: 'on_leave', until: '2026-10-14' },
    });
    serve({ '/api/app/team?': { body: list([me(), hidden], { counts: false }) } });
    await teamResource.ensure();
    const d = getTeam();
    expect(d?.people[1]?.load).toBeUndefined();
    expect(d?.people[1]?.leave).toBe('On leave until Oct 14');
    expect(d?.summary).toBe('2 people · 1 project');
    expect(d?.sorts).toEqual(['name']);
    expect(d?.note).toBe(TEAM_NOTE);
  });

  test('"Available" is never made up from an empty availability', async () => {
    serve({ '/api/app/team?': { body: list([rina()]) } });
    await teamResource.ensure();
    expect(JSON.stringify(getTeam())).not.toMatch(/Available/);
  });

  test('roles: one role reads once, mixed roles per project, none says so; open work elsewhere is not named', async () => {
    expect(
      roleLine([
        { id: 'a', name: 'Atlas', role: 'manager' },
        { id: 'b', name: 'Tools', role: 'viewer' },
      ]),
    ).toBe('Atlas (Manager), Tools (Viewer)');
    expect(roleLine([])).toBe('No shared project');
    serve({
      '/api/app/team?': {
        body: list([rina({ load: { active: 1, overdue: 0, alsoElsewhere: true } })]),
      },
    });
    await teamResource.ensure();
    expect(getTeam()?.people[0]?.extra).toBe('Also on other projects');
  });
});

describe('paging and the query', () => {
  const page = (offset: number, n: number) =>
    Array.from({ length: n }, (_, i) =>
      rina({ id: `u-${offset + i}`, name: `Person ${offset + i}` }),
    );

  test('"Load more" appends by offset; the task numbers go, since they summed page one only', async () => {
    serve({
      '/api/app/team?': (url) => {
        const offset = Number(query(url).offset);
        return { body: list(page(offset, offset ? 6 : 24), { total: 30 }) };
      },
    });
    await teamResource.ensure();
    expect(getTeam()?.summary).toBe('30 people · 1 project');
    expect(getTeam()?.more).toBe(true);
    await loadMoreTeam();
    expect(query(lists()[1] ?? '')).toEqual({ limit: '24', offset: '24' });
    expect(getTeam()?.people).toHaveLength(30);
    expect(getTeam()?.more).toBe(false);
    // A refresh (the invalidate after a write elsewhere) keeps all thirty in one request.
    await teamResource.reload();
    expect(query(lists()[2] ?? '')).toEqual({ limit: '30', offset: '0' });
  });

  test('search and sort go to the server, and a new query starts at page one', async () => {
    serve({ '/api/app/team?': { body: list([rina()]) } });
    await teamResource.ensure();
    await setTeamQuery({ q: '  rina ', sort: 'overdue' });
    expect(query(lists()[1] ?? '')).toEqual({
      limit: '24',
      offset: '0',
      q: 'rina',
      sort: 'overdue',
    });
    expect(getTeamQuery()).toEqual({ q: '  rina ', sort: 'overdue' });
  });

  test('a query changed while a request is out is asked again, so the list matches the box', async () => {
    let release = () => {};
    const held = new Promise<void>((r) => {
      release = r;
    });
    serve({
      '/api/app/team?': (url) =>
        query(url).q === 'ri'
          ? { body: list([rina({ name: 'Old answer' })]), wait: held }
          : { body: list([rina()]) },
    });
    const first = setTeamQuery({ q: 'ri' });
    const second = setTeamQuery({ q: 'rina' });
    release();
    await Promise.all([first, second]);
    expect(getTeam()?.people.map((p) => p.full)).toEqual(['Rina Wulandari']);
    expect(teamResource.current()?.query.q).toBe('rina');
  });

  test('a sort the server refuses fails with its own code and sentence', async () => {
    serve({
      '/api/app/team?': (url) =>
        query(url).sort
          ? {
              status: 422,
              body: { error: 'Urutan ini tidak tersedia untuk Anda.', code: 'SORT_NOT_ALLOWED' },
            }
          : { body: list([rina()]) },
    });
    await teamResource.ensure();
    const state = await setTeamQuery({ sort: 'active' });
    expect(state.error).toMatchObject({
      code: 'SORT_NOT_ALLOWED',
      message: 'Urutan ini tidak tersedia untuk Anda.',
    });
    // What was on screen stays.
    expect(getTeam()?.people).toHaveLength(1);
  });
});

describe('one person', () => {
  test('tasks visible: rows with the project name and a server-clock overdue pill', async () => {
    serve({ '/api/app/team/u-rina': { body: rinaDetail() } });
    await teamPersonResource('u-rina').ensure();
    const d = getTeamPerson('u-rina');
    expect(d?.facts).toEqual([
      ['Job title', 'Designer'],
      ['Department', 'Product'],
      ['Email', 'rina@example.test'],
    ]);
    expect(d?.projectsTitle).toBe('Shared projects');
    expect(d?.tasks?.rows).toEqual([
      { no: 14, title: '#14 Polish onboarding', sub: 'Atlas Project · Due Oct 5', pill: 'Overdue' },
      { no: 15, title: '#15 Icon set', sub: 'Atlas Project', pill: 'To do' },
    ]);
    expect(d?.tasks?.capped).toBe(false);
  });

  test('"may not see the work" is not "has no work"; Admin keys show only when sent', async () => {
    serve({
      '/api/app/team/u-rina': {
        body: rinaDetail({
          tasks: undefined,
          load: undefined,
          tasksVisible: false,
          alsoElsewhere: true,
        }),
      },
      '/api/app/team/u-sri': {
        body: rinaDetail({
          person: {
            id: 'u-sri',
            name: 'Sri',
            jobTitle: null,
            department: null,
            email: 'sri@example.test',
            phone: '0812',
          },
          accountRole: 'project_manager',
          tasks: [],
        }),
      },
    });
    await teamPersonResource('u-rina').ensure();
    await teamPersonResource('u-sri').ensure();
    expect(getTeamPerson('u-rina')).toMatchObject({ tasks: null, elsewhere: true });
    expect(getTeamPerson('u-sri')).toMatchObject({
      projectsTitle: 'Projects',
      facts: [
        ['Email', 'sri@example.test'],
        ['Phone', '0812'],
        ['Account role', 'Project Manager'],
      ],
      tasks: { rows: [] },
    });
  });

  test('twenty tasks with a larger load says the list is cut', async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      number: i + 1,
      title: `T${i}`,
      status: 'todo' as const,
      dueDate: null,
      projectId: 'p-atlas',
    }));
    serve({
      '/api/app/team/u-rina': { body: rinaDetail({ tasks, load: { active: 26, overdue: 0 } }) },
    });
    await teamPersonResource('u-rina').ensure();
    expect(getTeamPerson('u-rina')?.tasks?.capped).toBe(true);
  });
});

test('sign out forgets the list, every person opened, and the search', async () => {
  serve({
    '/api/app/team?': { body: list([rina()]) },
    '/api/app/team/u-rina': { body: rinaDetail() },
  });
  await setTeamQuery({ q: 'rina' });
  await teamPersonResource('u-rina').ensure();
  expect(knownResources()).toEqual(
    expect.arrayContaining([teamResource, teamPersonResource('u-rina')]),
  );
  clearSession();
  expect(getTeam()).toBeNull();
  expect(getTeamPerson('u-rina')).toBeNull();
  expect(getTeamQuery()).toEqual({ q: '', sort: 'name' });
});
