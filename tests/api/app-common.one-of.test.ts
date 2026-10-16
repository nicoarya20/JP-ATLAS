/** `oneOf` (G15 finding): runtime still accepts exactly the listed values, and Eden now sees the literal union. */
import { describe, expect, test } from 'bun:test';
import { Elysia, t } from 'elysia';
import type { client } from '../../app/lib/eden';
import { oneOf } from '../../server/api/app-common';
import { apiErrorPlugin } from '../../server/api-error';

const app = new Elysia({ prefix: '/api' })
  .use(apiErrorPlugin())
  .get('/pick', ({ query }) => query, { query: t.Object({ v: t.Optional(oneOf(['a', 'b'])) }) });

async function get(path: string) {
  const res = await app.handle(new Request(`http://localhost/api${path}`));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe('oneOf at runtime', () => {
  test('accepts a listed value', async () => {
    expect(await get('/pick?v=b')).toEqual({ status: 200, body: { v: 'b' } });
  });

  test('rejects an unlisted value with 422', async () => {
    expect((await get('/pick?v=c')).status).toBe(422);
  });

  test('adds no default: a missing value stays missing', async () => {
    expect(await get('/pick')).toEqual({ status: 200, body: {} });
  });
});

type ProjectListQuery = NonNullable<
  NonNullable<Parameters<typeof client.api.app.projects.get>[0]>['query']
>;

describe('oneOf in the Eden client types', () => {
  test('the project list filters are literal unions, not `string`', () => {
    const ok: ProjectListQuery = { status: 'active', scope: 'all', sort: 'due', q: 'x', limit: 5 };
    // @ts-expect-error an unknown status is a compile error once the filter keeps its literal type
    const badStatus: ProjectListQuery = { status: 'nope' };
    // @ts-expect-error same for scope
    const badScope: ProjectListQuery = { scope: 'everyone' };
    // @ts-expect-error same for sort
    const badSort: ProjectListQuery = { sort: 'random' };
    const status: NonNullable<ProjectListQuery['status']>[] = ['draft', 'active', 'completed'];
    expect([ok, badStatus, badScope, badSort, status].length).toBe(5);
  });
});
