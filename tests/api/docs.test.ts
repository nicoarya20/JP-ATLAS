import { describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { devApiDocs } from '../../server/api/docs';

/**
 * Dev-only Scalar docs at /api/docs. The production path (404) is the security
 * guarantee of this feature, so it is asserted here directly and again by the
 * production smoke test. Routes mirror the real API's /api prefix.
 */
type Handler = { handle: (req: Request) => Promise<Response> };

function buildApp(prod: boolean): Handler {
  return new Elysia({ prefix: '/api' })
    .get('/sample', () => ({ ok: true }))
    .get('/mcp', () => ({ ok: true })) // excluded from the spec
    .use(devApiDocs(prod)) as unknown as Handler;
}

async function get(app: Handler, path: string) {
  return app.handle(new Request(`http://localhost${path}`));
}

describe('dev-only Scalar docs (/api/docs)', () => {
  it('serves the Scalar UI as HTML in development', async () => {
    const res = await get(buildApp(false), '/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const body = await res.text();
    expect(body).toContain('<!doctype html>');
  });

  it('serves an OpenAPI 3 spec of the whole API in development', async () => {
    const res = await get(buildApp(false), '/api/docs/json');
    expect(res.status).toBe(200);
    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string; description?: string };
      paths: Record<string, unknown>;
    };
    expect(spec.openapi.startsWith('3')).toBe(true);
    const paths = Object.keys(spec.paths ?? {});
    expect(paths.length).toBeGreaterThan(0);
    expect(paths).toContain('/api/sample');
    // JSON-RPC (MCP) routes are excluded from the REST spec.
    expect(paths).not.toContain('/api/mcp');
    // Honest note that response shapes are not declared yet.
    expect(spec.info.description).toContain('respons');
  });

  it('is reachable without an API key (no 401/403) in development', async () => {
    // No key header is sent, so a 200 proves the docs need no credentials.
    const res = await get(buildApp(false), '/api/docs');
    expect(res.status).toBe(200);
  });

  it('does not exist in production: /api/docs → 404', async () => {
    const app = buildApp(true);
    expect((await get(app, '/api/docs')).status).toBe(404);
    expect((await get(app, '/api/docs/json')).status).toBe(404);
  });
});
