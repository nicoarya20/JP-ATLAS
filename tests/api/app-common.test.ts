/** Shared /api/app request schemas: ids, offset paging and keyset paging validate the same everywhere. */
import { describe, expect, test } from 'bun:test';
import { Elysia } from 'elysia';
import { CursorQuery, IdParam, PageQuery } from '../../server/api/app-common';
import { apiErrorPlugin } from '../../server/api-error';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../../server/pm/limits';

const app = new Elysia({ prefix: '/api' })
  .use(apiErrorPlugin())
  .get('/item/:id', ({ params }) => params, { params: IdParam })
  .get('/page', ({ query }) => query, { query: PageQuery })
  .get('/cursor', ({ query }) => query, { query: CursorQuery });

async function get(path: string) {
  const res = await app.handle(new Request(`http://localhost/api${path}`));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe('IdParam', () => {
  test('accepts a uuid-like text id', async () => {
    const r = await get('/item/6f1c0c0e-aaaa');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ id: '6f1c0c0e-aaaa' });
  });
});

describe.each([
  ['PageQuery', '/page', 'page', '3'],
  ['CursorQuery', '/cursor', 'cursor', 'abc_-123'],
])('%s', (_name, route, extraKey, extraValue) => {
  test('coerces limit to a number and keeps the second key', async () => {
    const r = await get(`${route}?limit=7&${extraKey}=${extraValue}`);
    expect(r.status).toBe(200);
    expect(r.body.limit).toBe(7);
    expect(String(r.body[extraKey])).toBe(extraValue);
  });

  test('no query → the default limit applies', async () => {
    const r = await get(route);
    expect(r.status).toBe(200);
    expect(r.body.limit).toBe(PAGE_LIMIT_DEFAULT);
  });

  test.each([
    ['above the maximum', PAGE_LIMIT_MAX + 1],
    ['zero', 0],
    ['not a number', 'abc'],
  ])('limit %s → uniform 422', async (_label, value) => {
    const r = await get(`${route}?limit=${value}`);
    expect(r.status).toBe(422);
    expect(r.body).toMatchObject({ code: 'VALIDATION', status: 422 });
  });
});

describe('PageQuery', () => {
  test('page must be a positive number', async () => {
    expect((await get('/page?page=0')).status).toBe(422);
  });
});

describe('CursorQuery', () => {
  test('an empty cursor is refused', async () => {
    expect((await get('/cursor?cursor=')).status).toBe(422);
  });
});
