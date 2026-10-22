/**
 * The Admin queue card (S3 I14, P5 §5.5 row 10). Two halves, both driven through the real thing:
 * the sign-up hook that writes the card (`afterCreateUser`), and the three decisions that take it
 * away again over HTTP, so the card is proved to leave the Inbox of every Admin — not only the one
 * who pressed the button. Better Auth's own `banUser` is the single stub; everything behind the
 * route is the production guard, policy, service and hook.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import Elysia from 'elysia';
import { afterCreateUser } from '../../server/account/signup-hooks';
import { adminApi } from '../../server/api/admin';
import { apiErrorPlugin } from '../../server/api-error';
import { apiKeyPlugin } from '../../server/api-keys/plugin';
import { auth } from '../../server/auth';
import { db } from '../../server/db';
import { notification } from '../../server/db/schema';
import { emitUserPending } from '../../server/notification/emit.account';
import { inboxActionCount } from '../../server/notification/notification.query';
import * as rolesMod from '../../server/roles';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'emitacct' });
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

const app = new Elysia()
  .use(apiErrorPlugin())
  .use(apiKeyPlugin())
  .use(new Elysia({ prefix: '/api' }).use(adminApi));

/** Who the guard sees on the next request; `as()` swaps them between scenarios. */
const caller: { current: TestUser | null } = { current: null };
const as = (u: TestUser) => {
  caller.current = u;
};
let spies: Array<{ mockRestore: () => void }> = [];

beforeAll(() => {
  spies = [
    spyOn(auth.api, 'getSession').mockImplementation((async () =>
      caller.current
        ? {
            user: {
              id: caller.current.id,
              email: caller.current.email,
              approvalStatus: 'approved',
            },
            session: { impersonatedBy: null },
          }
        : null) as unknown as typeof auth.api.getSession),
    spyOn(rolesMod, 'resolveUserRole').mockImplementation(
      async () => (caller.current?.role ?? 'member') as 'admin',
    ),
    // The only stub: this layer is what is under test, not Better Auth's own ban mutation.
    spyOn(auth.api, 'banUser').mockImplementation((async () => ({})) as typeof auth.api.banUser),
  ];
});
afterAll(() => {
  for (const s of spies) s.mockRestore();
  spies = [];
  caller.current = null;
});
beforeEach(() => {
  caller.current = null;
});

async function post(id: string, verb: 'approve' | 'reject' | 'ban', body: unknown = {}) {
  const res = await app.handle(
    new Request(`http://localhost/api/admin/users/${id}/${verb}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** The queue cards these people hold for one account, in a stable order. */
const cardsFor = (holders: TestUser[], subjectId: string) =>
  db
    .select()
    .from(notification)
    .where(
      and(
        inArray(
          notification.recipientId,
          holders.map((h) => h.id),
        ),
        eq(notification.refId, subjectId),
      ),
    )
    .orderBy(notification.recipientId);

/** The same cards keyed by who holds them; the ids are random, so order says nothing. */
async function heldBy(holders: TestUser[], subjectId: string) {
  const rows = await cardsFor(holders, subjectId);
  return new Map(rows.map((row) => [row.recipientId, row]));
}

/** Two Admins who both watch the queue, a Super-admin, a plain member and one account waiting. */
async function queue() {
  const adminA = await f.user({ role: 'admin', name: 'Admin Satu' });
  const adminB = await f.user({ role: 'admin', name: 'Admin Dua' });
  const superAdmin = await f.user({ role: 'super-admin', name: 'Super Satu' });
  const member = await f.user();
  const waiting = await f.user({ status: 'pending', name: 'Rina' });
  return { adminA, adminB, superAdmin, member, waiting };
}

describe('a new sign-up that has to wait', () => {
  it('puts one open card in every Admin and Super-admin Inbox, and nobody else', async () => {
    const q = await queue();
    await afterCreateUser({ id: q.waiting.id, email: q.waiting.email, role: 'member' }, null);

    const cards = await cardsFor([q.adminA, q.adminB, q.superAdmin], q.waiting.id);
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card).toMatchObject({
        kind: 'user_pending',
        lane: 'action',
        refType: 'user',
        refId: q.waiting.id,
        // No project gates the card: an Admin need not be on any (P5 §6 I14).
        projectId: null,
        actorId: q.waiting.id,
        resolvedAt: null,
        payload: { name: 'Rina' },
      });
    }
    expect(
      await inboxActionCount({ id: q.adminA.id, appRole: 'admin', impersonating: false }),
    ).toBe(1);
    // The queue is Admin work: neither the person waiting nor an ordinary member hears about it.
    expect(await cardsFor([q.member, q.waiting], q.waiting.id)).toEqual([]);
  });

  it('writes no card for an account that was let in straight away', async () => {
    const q = await queue();
    const invited = await f.user({ name: 'Dodi' });
    await afterCreateUser({ id: invited.id, email: invited.email, role: 'member' }, null);

    expect(await cardsFor([q.adminA, q.adminB, q.superAdmin], invited.id)).toEqual([]);
  });

  it('does not stack a second card when the same account is reported again', async () => {
    const q = await queue();
    await emitUserPending(db, q.waiting.id);
    await emitUserPending(db, q.waiting.id);

    const cards = await cardsFor([q.adminA], q.waiting.id);
    expect(cards).toHaveLength(1);
    expect(cards[0]?.bundleCount).toBe(1);
  });
});

describe('a decision on the account', () => {
  /** Puts the card in both Admins' Inbox, then has `by` decide; returns what is left of it. */
  async function decide(
    q: Awaited<ReturnType<typeof queue>>,
    by: TestUser,
    verb: 'approve' | 'reject' | 'ban',
    body: unknown = {},
  ) {
    await emitUserPending(db, q.waiting.id);
    expect(await cardsFor([q.adminA, q.adminB], q.waiting.id)).toHaveLength(2);

    as(by);
    const res = await post(q.waiting.id, verb, body);
    expect(res.status).toBe(200);
    return heldBy([q.adminA, q.adminB], q.waiting.id);
  }

  it('closes the card for the other Admin too when one of them approves', async () => {
    const q = await queue();
    const held = await decide(q, q.adminA, 'approve');

    expect(held.get(q.adminA.id)).toMatchObject({ resolvedReason: 'acted' });
    // Still open for Admin Dua would mean two people queueing for work that is already done.
    expect(held.get(q.adminB.id)).toMatchObject({ resolvedReason: 'elsewhere' });
    expect(held.get(q.adminA.id)?.resolvedAt).not.toBeNull();
    expect(held.get(q.adminB.id)?.resolvedAt).not.toBeNull();
    expect(
      await inboxActionCount({ id: q.adminB.id, appRole: 'admin', impersonating: false }),
    ).toBe(0);
  });

  it('closes the card for every Admin when one of them rejects', async () => {
    const q = await queue();
    const held = await decide(q, q.adminB, 'reject', { reason: 'Bukan rekan kerja kami' });

    expect(held.get(q.adminA.id)).toMatchObject({ resolvedReason: 'elsewhere' });
    expect(held.get(q.adminB.id)).toMatchObject({ resolvedReason: 'acted' });
  });

  it('closes the card for every Admin when one of them blocks the account', async () => {
    const q = await queue();
    const held = await decide(q, q.adminA, 'ban', { reason: 'Akun palsu' });

    expect(held.get(q.adminA.id)).toMatchObject({ resolvedReason: 'acted' });
    expect(held.get(q.adminB.id)).toMatchObject({ resolvedReason: 'elsewhere' });
  });

  it('counts nothing twice when a second decision follows', async () => {
    const q = await queue();
    await decide(q, q.adminA, 'approve');
    as(q.adminB);
    expect((await post(q.waiting.id, 'ban', { reason: 'Akun palsu' })).status).toBe(200);

    // The second decision closes nothing: `resolveNotifications` only ever touches open cards.
    const held = await heldBy([q.adminA, q.adminB], q.waiting.id);
    expect(held.size).toBe(2);
    expect(held.get(q.adminA.id)?.resolvedReason).toBe('acted');
    expect(held.get(q.adminB.id)?.resolvedReason).toBe('elsewhere');
  });
});
