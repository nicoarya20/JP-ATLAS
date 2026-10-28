// The project reads against a stubbed `/api/app/projects*`: paging (next page at the offset shown, a refresh at the
// size on screen, rows de-duplicated), the query forgotten on sign out, one resource per project, and the Overview's
// attention reads merged in order. The screens are in __tests__/projects/.
import {
  getProjectsQuery,
  loadMoreProjects,
  projectMembersResource,
  projectResource,
  projectsResource,
  resetProjectsQuery,
  setProjectsQuery,
} from '../../src/data/projects.api';
import { projectAttentionResource } from '../../src/data/projects.overview.api';
import { forgetAllResources } from '../../src/data/resource';
import { setSessionUser } from '../../src/session/session.state';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { atlasDetail, atlasRoutes, many, page, query } from '../helpers/projects-fixtures';
import { APPROVED_USER } from '../helpers/session-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
const asked = () =>
  (server?.calls ?? []).filter((u) => u.includes('/api/app/projects?')).map(query);

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
});
afterEach(() => {
  server?.restore();
  server = null;
});

describe('the list pages', () => {
  test('page 2 of 25 after 25 rows; a row seen already is not added twice', async () => {
    serve({
      '/api/app/projects?': (url) =>
        query(url).page === '2'
          ? { body: page([...many(1, 25), ...many(3, 26)], { total: 28, n: 2 }) }
          : { body: page(many(25), { total: 28 }) },
    });
    await projectsResource.ensure();
    await loadMoreProjects();
    expect(projectsResource.current()?.items.map((p) => p.id)).toEqual(many(28).map((p) => p.id));
    expect(asked().map((q) => [q.page, q.limit])).toEqual([
      ['1', '25'],
      ['2', '25'],
    ]);
    // Everything is shown: Load more asks nothing.
    await loadMoreProjects();
    expect(asked()).toHaveLength(2);
  });

  test('a refresh asks page one at the size on screen; the next page then starts after it', async () => {
    serve({
      '/api/app/projects?': (url) => {
        const q = query(url);
        if (q.page === '1' && q.limit === '25') return { body: page(many(25), { total: 60 }) };
        if (q.page === '2' && q.limit === '25')
          return { body: page(many(5, 26), { total: 60, n: 2 }) };
        if (q.page === '1') return { body: page(many(30), { total: 60, limit: 30 }) };
        return { body: page(many(30, 31), { total: 60, n: 2, limit: 30 }) };
      },
    });
    await projectsResource.ensure();
    await loadMoreProjects();
    await projectsResource.reload();
    await loadMoreProjects();
    expect(asked().map((q) => [q.page, q.limit])).toEqual([
      ['1', '25'],
      ['2', '25'],
      ['1', '30'],
      ['2', '30'],
    ]);
    expect(projectsResource.current()?.items).toHaveLength(60);
  });

  test('a new query starts again from page one at 25, and is what the list keeps', async () => {
    serve({ '/api/app/projects?': { body: page(many(25), { total: 40 }) } });
    await projectsResource.ensure();
    await setProjectsQuery({ status: 'active' });
    expect(asked()[1]).toMatchObject({ page: '1', limit: '25', status: 'active' });
    expect(projectsResource.current()?.query.status).toBe('active');
  });

  test('signing out forgets the query, so the next account starts with the default list', async () => {
    serve({ '/api/app/projects?': { body: page([]) } });
    await setProjectsQuery({ attention: true, q: 'atlas' });
    expect(setSessionUser(null)).toBe('signed-out');
    expect(getProjectsQuery()).toEqual({ status: null, attention: false, sort: 'due', q: '' });
    setSessionUser(APPROVED_USER);
  });
});

describe('per project', () => {
  test('one resource per project and read, each asking its own path', async () => {
    serve(atlasRoutes());
    expect(projectResource('p-atlas')).toBe(projectResource('p-atlas'));
    expect(projectResource('p-atlas')).not.toBe(projectMembersResource('p-atlas'));
    await projectResource('p-atlas').ensure();
    expect(projectResource('p-atlas').current()).toEqual(atlasDetail());
    expect(server?.calls.at(-1)).toMatch(/\/api\/app\/projects\/p-atlas$/);
  });

  test('attention: overdue, then awaiting review, then due today; a task in two reads once', async () => {
    serve(atlasRoutes());
    await projectAttentionResource('p-atlas').ensure();
    const rows = projectAttentionResource('p-atlas').current() ?? [];
    expect(rows.map((r) => [r.task.number, r.reason])).toEqual([
      [12, 'Overdue'],
      [17, 'Awaiting review'],
    ]);
    const tasks = (server?.calls ?? []).filter((u) => u.includes('/api/app/tasks?')).map(query);
    expect(tasks.map((q) => [q.scope, q.projectId, q.due ?? q.status])).toEqual([
      ['project', 'p-atlas', 'overdue'],
      ['project', 'p-atlas', 'in_review'],
      ['project', 'p-atlas', 'today'],
    ]);
  });
});
