/**
 * Contract for /dev/openapi, the OpenAPI spec viewer.
 *
 * The page is a reader for an endpoint that is already gated, so most of what
 * matters here is what the page does NOT do: it must not weaken the API-key
 * gate, must not show an unfiltered spec, and must not keep the key anywhere.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toOpenAPISchema } from '@elysia/openapi';
import Elysia, { t } from 'elysia';
import { CONSOLE_PAGES } from '../app/components/landing/landing.content';
import { OPENAPI_ENDPOINT } from '../app/lib/openapi-client';
import { curlExample, KEY_PLACEHOLDER, sampleBody } from '../app/lib/openapi-curl';
import { flattenSchema, jsonSchemaOf, typeLabel } from '../app/lib/openapi-schema';
import type { OpenApiSpec } from '../app/lib/openapi-types';
import {
  filterOperations,
  groupOperations,
  listOperations,
  methodColor,
  operationCount,
  serverUrl,
  usedScopes,
} from '../app/lib/openapi-view';
import routes from '../app/routes';
import { NAV } from '../app/routes/super/layout';
import { OPENAPI_PATH, specForKey } from '../server/api/openapi';
import type { ApiKeyIdentity } from '../server/api-keys/identity';
import { CONSOLE_PAGE_COUNT } from '../server/landing-stats';
import { devSidebarBadges } from '../server/sidebar-badges';

const ROOT = path.join(import.meta.dir, '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Source with comments removed. These checks are about what the code does, and
 * several of these files explain in prose exactly which APIs they refuse to
 * touch — scanning the raw text would flag that documentation as a violation.
 */
const code = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const PAGE = 'app/routes/super/openapi.tsx';
const VIEWER_FILES = [
  PAGE,
  'app/lib/openapi-client.ts',
  'app/lib/openapi-curl.ts',
  'app/lib/openapi-schema.ts',
  'app/lib/openapi-view.ts',
  'app/components/openapi/SpecKeyForm.tsx',
  'app/components/openapi/SpecSummary.tsx',
  'app/components/openapi/OperationList.tsx',
  'app/components/openapi/OperationDetail.tsx',
  'app/components/openapi/SchemaFields.tsx',
  'app/components/openapi/CurlSnippet.tsx',
];

// test-only: a router shaped like the real /api tree, enough to exercise the viewer.
const router = new Elysia({ prefix: '/api' })
  .get('/posts/', () => [], { query: t.Object({ limit: t.Optional(t.Numeric()) }) })
  .post('/posts/', () => ({ id: 'p1' }), {
    body: t.Object({ title: t.String({ minLength: 1 }), tags: t.Array(t.String()) }),
    response: { 200: t.Object({ id: t.String() }) },
  })
  .get('/app/whoami', () => ({}))
  .get('/admin/users', () => []);

const base = toOpenAPISchema(router);
const key = (scopes: string[], role: ApiKeyIdentity['role'] = 'member'): ApiKeyIdentity => ({
  keyId: 'k1',
  keyName: 'test',
  scopes,
  user: { id: 'u1', email: 'agent@example.test', name: 'Agent' },
  role,
  startedAt: Date.now(),
});
const specFor = (scopes: string[], role: ApiKeyIdentity['role'] = 'member') =>
  specForKey(base, key(scopes, role)) as unknown as OpenApiSpec;

describe('the page is registered in every place a /dev page must be', () => {
  const superLayout = (routes as Array<{ file: string; children?: Array<{ path?: string }> }>).find(
    (r) => r.file === 'routes/super/layout.tsx',
  );

  test('as a child of the super layout, so it inherits the area frame', () => {
    expect(superLayout?.children?.map((c) => c.path)).toContain('dev/openapi');
  });

  test('in the /dev sidebar', () => {
    const entry = NAV.flatMap((g) => g.items).find((i) => i.to === '/dev/openapi');
    expect(entry?.label).toBe('Spec OpenAPI');
  });

  test('in the overview quick links', () => {
    expect(read('app/components/overview/QuickLinks.tsx')).toContain("to: '/dev/openapi'");
  });

  test('in the marketing console list, and the counted total agrees', () => {
    expect(CONSOLE_PAGES.map((p) => p.label)).toContain('Spec OpenAPI');
    expect(CONSOLE_PAGES.length).toBe(CONSOLE_PAGE_COUNT);
  });

  test('with a sidebar badge that reports scale, not a to-do', async () => {
    const badge = (await devSidebarBadges({ fresh: true }))['/dev/openapi'];
    expect(badge).toBeDefined();
    expect(badge.tone).toBe('info');
    expect(badge.value).toBeGreaterThan(0);
    expect(badge.tooltip).toContain('scope');
  });
});

describe('the page guards itself and declares a title', () => {
  const source = read(PAGE);

  test('its own loader requires super-admin (a layout guard runs in parallel, so it is not enough)', () => {
    expect(source).toMatch(/requireRole\(request, ROLES\.SUPER_ADMIN\)/);
  });

  test('it exports meta() with the project title format', () => {
    expect(source).toMatch(/export function meta\(\)/);
    expect(source).toContain("title: 'Spec OpenAPI — Simple PM Dev'");
  });
});

describe('the API-key gate is not weakened', () => {
  test('the page talks to the same gated endpoint the server exposes', () => {
    expect(OPENAPI_ENDPOINT).toBe(OPENAPI_PATH);
  });

  test('the loader sends no spec — it can only arrive through a key in the browser', () => {
    const source = code(PAGE);
    const loader = source.slice(source.indexOf('export async function loader'));
    const body = loader.slice(0, loader.indexOf('\n}'));
    expect(body).toContain('requireRole');
    expect(body).toContain('return null');
    // The page builds no spec of its own and imports nothing that could.
    expect(source).not.toContain('specForKey(');
    expect(source).not.toContain('toOpenAPISchema');
    expect(source).not.toContain('@server/api/openapi');
  });

  test('no viewer file reaches for the spec without a key', () => {
    for (const file of VIEWER_FILES) {
      // The only fetch in the viewer is the one in openapi-client.ts, which sends X-API-Key.
      if (code(file).includes('fetch(')) expect(file).toBe('app/lib/openapi-client.ts');
    }
    expect(read('app/lib/openapi-client.ts')).toContain("'X-API-Key': key");
  });
});

describe('the typed API key is not persisted and not logged', () => {
  const FORBIDDEN = [
    'localStorage',
    'sessionStorage',
    'document.cookie',
    'indexedDB',
    'console.log',
    'console.error',
    'console.warn',
  ];

  test('no viewer file touches browser storage or the console', () => {
    for (const file of VIEWER_FILES) {
      const src = code(file);
      for (const needle of FORBIDDEN) {
        expect(`${file}: ${src.includes(needle)}`).toBe(`${file}: false`);
      }
    }
  });

  test('the key never reaches the URL, a query string or the request body', async () => {
    const { fetchSpec } = await import('../app/lib/openapi-client');
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ paths: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as unknown as typeof fetch;
    try {
      await fetchSpec('sp_live_secret123');
    } finally {
      globalThis.fetch = original;
    }
    expect(calls).toHaveLength(1);
    const [{ url, init }] = calls;
    expect(url).toBe(OPENAPI_ENDPOINT);
    expect(url).not.toContain('sp_live_secret123');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['X-API-Key']).toBe('sp_live_secret123');
    // The session cookie stays off the request: the key alone decides what comes back.
    expect(init.credentials).toBe('omit');
  });

  test('a blank key is refused locally, so nothing is shown and nothing is sent', async () => {
    const { fetchSpec, SpecFetchError } = await import('../app/lib/openapi-client');
    const original = globalThis.fetch;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}');
    }) as unknown as typeof fetch;
    try {
      await expect(fetchSpec('   ')).rejects.toBeInstanceOf(SpecFetchError);
    } finally {
      globalThis.fetch = original;
    }
    expect(called).toBe(false);
  });

  test('the curl snippet carries a placeholder, never the real key', () => {
    const op = listOperations(specFor(['posts:write'])).find((o) => o.method === 'POST');
    if (!op) throw new Error('fixture should expose POST /api/posts/');
    const command = curlExample(op, 'https://app.example.test');
    expect(command).toContain(KEY_PLACEHOLDER);
    expect(command).not.toContain('sp_live_');
    expect(command).toContain('-X POST');
    expect(sampleBody(op)).toBe('{"title":"<string>","tags":[]}');
  });
});

describe('the viewer shows exactly the spec the key was given', () => {
  test('a narrow key sees only its own operations', () => {
    const ops = listOperations(specFor(['posts:write']));
    expect(ops.map((o) => o.id).sort()).toEqual(['get /api/posts/', 'post /api/posts/']);
    expect(ops.find((o) => o.id === 'post /api/posts/')?.scope).toBe('posts:write');
    // The public read keeps no scope, and the viewer labels it as such rather than inventing one.
    expect(ops.find((o) => o.id === 'get /api/posts/')?.isPublic).toBe(true);
  });

  test('an admin key sees more, and the viewer adds nothing of its own', () => {
    const admin = listOperations(specFor(['users:read', 'app:read'], 'admin')).map((o) => o.id);
    expect(admin).toContain('get /api/admin/users');
    expect(admin).toContain('get /api/app/whoami');
    expect(admin).not.toContain('post /api/posts/');
    expect(operationCount(specFor(['users:read', 'app:read'], 'admin'))).toBe(admin.length);
  });

  test('an empty or missing spec renders as nothing at all', () => {
    expect(listOperations(null)).toEqual([]);
    expect(listOperations(undefined)).toEqual([]);
    expect(listOperations({} as OpenApiSpec)).toEqual([]);
    expect(groupOperations([])).toEqual([]);
  });
});

describe('grouping, filtering and labels', () => {
  const ops = listOperations(specFor(['posts:write', 'app:read']));

  test('groups by the tag specForKey derived from the path, sorted', () => {
    const groups = groupOperations(ops);
    expect(groups.map((g) => g.tag)).toEqual(['app', 'posts']);
    expect(groups[1].operations.map((o) => o.method)).toEqual(['GET', 'POST']);
  });

  test('search matches path, method and scope', () => {
    expect(filterOperations(ops, 'whoami').map((o) => o.path)).toEqual(['/api/app/whoami']);
    // Free text, so "post" legitimately matches the method and the /api/posts/ path alike.
    expect(
      filterOperations(ops, 'post')
        .map((o) => o.id)
        .sort(),
    ).toEqual(['get /api/posts/', 'post /api/posts/']);
    expect(filterOperations(ops, 'DELETE')).toEqual([]);
    expect(filterOperations(ops, 'posts:write').map((o) => o.id)).toEqual(['post /api/posts/']);
    expect(filterOperations(ops, '')).toHaveLength(ops.length);
    expect(filterOperations(ops, 'nothing-here')).toEqual([]);
  });

  test('lists the scopes in play and the server URL from the spec', () => {
    expect(usedScopes(ops)).toEqual(['app:read', 'posts:write']);
    expect(serverUrl(specFor(['app:read']))).not.toContain('undefined');
    expect(serverUrl(null)).toBe('');
  });

  test('every method gets a colour, unknown ones fall back to gray', () => {
    expect(methodColor('GET')).toBe('teal');
    expect(methodColor('delete')).toBe('red');
    expect(methodColor('TRACE')).toBe('gray');
  });
});

describe('schema rendering', () => {
  const postOp = listOperations(specFor(['posts:write'])).find((o) => o.method === 'POST');

  test('flattens a request body into named, typed, required-marked fields', () => {
    const schema = jsonSchemaOf(postOp?.operation.requestBody?.content);
    const fields = flattenSchema(schema ?? undefined, undefined);
    expect(fields.map((f) => f.name)).toEqual(['title', 'tags']);
    expect(fields[0]).toMatchObject({ type: 'string', required: true });
    expect(fields[0].constraints).toContain('min 1 karakter');
    expect(fields[1].type).toBe('string[]');
  });

  test('prefers the JSON body when Elysia emits the same schema three times', () => {
    const content = postOp?.operation.requestBody?.content;
    expect(Object.keys(content ?? {}).length).toBeGreaterThan(1);
    expect(jsonSchemaOf(content)).toBe(content?.['application/json']?.schema ?? null);
  });

  test('a dangling $ref degrades to its name instead of throwing', () => {
    expect(typeLabel({ $ref: '#/components/schemas/Missing' }, {})).toBe('Missing');
    expect(flattenSchema({ $ref: '#/components/schemas/Missing' }, {})).toEqual([]);
  });

  test('a self-referential schema terminates', () => {
    const components = {
      Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } },
    };
    const fields = flattenSchema({ $ref: '#/components/schemas/Node' }, components);
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.length).toBeLessThan(10);
  });

  test('a scalar schema produces no field rows', () => {
    expect(flattenSchema({ type: 'string' }, undefined)).toEqual([]);
    expect(flattenSchema(undefined, undefined)).toEqual([]);
  });
});
