/**
 * Shared gate for `/api/app/*`: resolves the caller once, answers 401/403 before body
 * validation runs, and caps writes per user. Nest it in every app router (`.use(appContext)`)
 * so `actor` is typed non-null there; the name dedupes it, so the caller resolves once.
 */
import { Elysia } from 'elysia';
import { accountGateResponse } from '../account/gate';
import { errorResponse, unauthorizedResponse } from '../api-error';
import { type Actor, assertAccountApproved, getHeldAccount, resolveActor } from '../guard';
import { resolveClientIp } from '../middleware/client-ip';
import { logRateLimit } from '../middleware/rate-limiter';
import { WRITE_RATE_MAX, WRITE_RATE_WINDOW_SECONDS } from '../pm/limits';
import { RateLimiter } from '../rate-limit';

const MS_PER_SECOND = 1000;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Per-user write limiter (R04 §3.10), keyed by user id so one office IP does not share a
 * bucket and an API key spends its owner's quota. The limiter class and its numbers are
 * shared with the global one; in-memory per process, like the IP limiter.
 */
export const writeLimiter = new RateLimiter({
  windowMs: WRITE_RATE_WINDOW_SECONDS * MS_PER_SECOND,
  limit: WRITE_RATE_MAX,
  excludePrefixes: [],
});

/** 403 for a held (pending/rejected) account, else 401. resolveActor returns null for both. */
function deniedResponse(request: Request): Response {
  const held = getHeldAccount(request);
  const gate = held && accountGateResponse(held);
  return gate ? errorResponse(request, 403, gate.error, gate.code) : unauthorizedResponse(request);
}

/**
 * Defence in depth: resolveActor never returns a held account, but an Actor built another
 * way must not pass. The guard's Response lacks a request id, so it is rebuilt uniformly.
 */
async function assertApproved(actor: Actor, request: Request): Promise<void> {
  try {
    assertAccountApproved(actor);
  } catch (thrown) {
    if (!(thrown instanceof Response)) throw thrown;
    const body = (await thrown.json()) as { error: string; code: string };
    throw errorResponse(request, thrown.status, body.error, body.code);
  }
}

export const appContext = new Elysia({ name: 'app-context' })
  // derive runs in the transform phase, before validation: a thrown Response (never a
  // thrown status(), which becomes a 500) keeps anonymous callers from seeing a 422.
  .derive({ as: 'scoped' }, async ({ request }) => {
    const actor = await resolveActor(request);
    if (!actor) throw deniedResponse(request);
    return { actor };
  })
  .onBeforeHandle({ as: 'scoped' }, async ({ actor, request, set, status }) => {
    await assertApproved(actor, request);
    if (!WRITE_METHODS.has(request.method)) return;
    const r = writeLimiter.check(`u:${actor.user.id}`);
    if (!r.limited) return;
    const retryAfterSeconds = Math.max(1, Math.ceil(r.retryAfterMs / MS_PER_SECOND));
    set.headers['retry-after'] = String(retryAfterSeconds);
    if (r.episodeStart) {
      void logRateLimit({
        ip: resolveClientIp(request.headers),
        path: new URL(request.url).pathname,
        method: request.method,
        userId: actor.user.id,
        headers: request.headers,
      });
    }
    return status(429, {
      error: `Terlalu banyak perubahan. Coba lagi dalam ${retryAfterSeconds} detik.`,
      code: 'RATE_LIMITED',
      retryAfterSeconds,
    });
  });
