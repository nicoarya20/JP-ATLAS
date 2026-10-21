/**
 * Data exports of Setelan organisasi (P11 AD-10): `GET /api/admin/export/:kind` streams anggota,
 * proyek or tugas as CSV. Nested in `adminApi` and gated by `adminContext` on its own, so the
 * route is Admin + Super-admin whatever mounts it; API keys are refused earlier, by `requiredScope`
 * returning null for this prefix (P11 §5). Each download is capped per user — a whole-table read
 * per press — and audited with the kind and the row count only, never an exported value.
 */
import { Elysia, t } from 'elysia';
import { AUDIT_ACTIONS, audit } from '../audit';
import { logger } from '../logger';
import { resolveClientIp } from '../middleware/client-ip';
import { logRateLimit } from '../middleware/rate-limiter';
import { fail } from '../pm/respond';
import { RateLimiter } from '../rate-limit';
import { adminContext, callerOf } from './admin-context';
import { csvStream } from './admin-export.csv';
import { EXPORT_META, exportFilename, isExportKind } from './admin-export.kinds';
import { exportSource } from './admin-export.query';

const MS_PER_SECOND = 1000;

/** Rows per keyset page: one statement and one stream chunk each. */
export const EXPORT_PAGE_SIZE = 500;

/**
 * Per-user export cap, in memory per process like the write limiter: three buttons plus a couple of
 * retries fit comfortably, a script scraping the directory does not. The limiter class and the
 * 429 shape are the ones the rest of the API already uses — no second mechanism.
 */
export const EXPORT_RATE_MAX = 10;
export const EXPORT_RATE_WINDOW_SECONDS = 300;
export const exportLimiter = new RateLimiter({
  windowMs: EXPORT_RATE_WINDOW_SECONDS * MS_PER_SECOND,
  limit: EXPORT_RATE_MAX,
  excludePrefixes: [],
});

const UNKNOWN_KIND = 'Jenis ekspor tidak dikenal. Pilih members, projects, atau tasks.';

export const adminExportApi = new Elysia().use(adminContext).get(
  '/export/:kind',
  async (ctx) => {
    const { params, request, set, status } = ctx;
    const { actor } = callerOf(ctx);
    // Validated here, not by the params schema, so an unknown kind answers the catalog's 422
    // VALIDATION body instead of Elysia's own validation shape.
    if (!isExportKind(params.kind)) return fail(status, 'VALIDATION', { error: UNKNOWN_KIND });
    const kind = params.kind;

    const limit = exportLimiter.check(`u:${actor.user.id}`);
    if (limit.limited) {
      const retryAfterSeconds = Math.max(1, Math.ceil(limit.retryAfterMs / MS_PER_SECOND));
      set.headers['retry-after'] = String(retryAfterSeconds);
      if (limit.episodeStart) {
        void logRateLimit({
          ip: resolveClientIp(request.headers),
          path: new URL(request.url).pathname,
          method: request.method,
          userId: actor.user.id,
          headers: request.headers,
        });
      }
      return fail(status, 'RATE_LIMITED', {
        error: `Ekspor dibatasi agar server tetap sehat. Coba lagi dalam ${retryAfterSeconds} detik.`,
        retryAfterSeconds,
      });
    }

    const { label } = EXPORT_META[kind];
    const body = csvStream(exportSource(kind), EXPORT_PAGE_SIZE, ({ rows, complete }) => {
      // Counts and ids only, on both the log line and the audit entry: an export's own content
      // must never become readable through the trail that records it.
      logger.info({ kind, rows, complete, userId: actor.user.id }, 'data export served');
      void audit({
        actor: actor.user,
        headers: request.headers,
        action: AUDIT_ACTIONS.DATA_EXPORT,
        // The action belongs to the Pengaturan page; `targetId` says which export it was.
        targetType: 'settings',
        targetId: kind,
        summary: complete
          ? `Ekspor ${label} ke CSV: ${rows} baris`
          : `Ekspor ${label} ke CSV terputus setelah ${rows} baris`,
        meta: { kind, rows, complete },
      });
    });

    return new Response(body, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${exportFilename(kind, new Date())}"`,
        'cache-control': 'no-store',
      },
    });
  },
  { params: t.Object({ kind: t.String() }) },
);
