/**
 * GET /api/docs — Scalar UI for the WHOLE API, no API key, DEV ONLY.
 *
 * Unlike /api/openapi.json (per-key filtered, see openapi.ts), this exposes the
 * entire API surface so teammates can browse every route while developing. It is
 * never registered in production — the security tradeoff is that, with a tunnel
 * (ngrok) open, /api/docs is reachable from the internet, so it stays off in prod.
 *
 * Response schemas are intentionally empty: routes do not declare `response:` yet,
 * so Scalar shows request shapes only (said plainly in info.description below).
 */
import { openapi } from '@elysia/openapi';
import { Elysia } from 'elysia';
import { APP_NAME, APP_VERSION } from '../app-info';
import { isProd } from '../env';

export const DOCS_PATH = '/api/docs';
export const DOCS_JSON_PATH = '/api/docs/json';

// JSON-RPC (MCP) and Better Auth routes are not REST operations; keep them out of
// the spec, mirroring excluded() in openapi.ts.
const EXCLUDE_PATHS = [/^\/api\/mcp/, /^\/api\/auth\//];

/**
 * Dev-only Scalar docs plugin. In production it returns an empty plugin so that
 * `/api/docs` and `/api/docs/json` do not exist at all (the API catch-all then
 * answers 404) — cleaner and safer than registering then gating. `prod` is a
 * parameter so the production path is directly testable.
 */
export function devApiDocs(prod: boolean = isProd) {
  if (prod) return new Elysia({ name: 'api-docs-disabled' });
  return openapi({
    path: '/docs',
    specPath: '/docs/json',
    provider: 'scalar',
    exclude: { paths: EXCLUDE_PATHS },
    documentation: {
      info: {
        title: `${APP_NAME} API`,
        version: APP_VERSION,
        description:
          'Dokumentasi developer untuk seluruh API (dev-only). Bentuk respons belum tersedia — route belum mendeklarasikan skema `response:`, jadi halaman ini hanya menampilkan bentuk request.',
      },
    },
  });
}
