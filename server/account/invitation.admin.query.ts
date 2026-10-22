/** Admin-side invitation queries (S0A-10): paged listing with a derived status, lookup and atomic revoke. */
import { and, count, desc, eq, isNotNull, isNull, type SQL, sql } from 'drizzle-orm';
import { db } from '../db';
import { user, userInvitation } from '../db/schema';

export const INVITATION_STATUSES = ['active', 'used', 'expired', 'revoked'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Page-size bounds for the invitation list; the cap keeps one request from reading the whole table. */
export const INVITATION_PAGE_DEFAULT = 50;
export const INVITATION_PAGE_MAX = 100;

// Precedence mirrors the lifecycle: used and revoked are final, expiry only matters while still open.
const statusSql = sql<InvitationStatus>`CASE
  WHEN ${userInvitation.acceptedAt} IS NOT NULL THEN 'used'
  WHEN ${userInvitation.revokedAt} IS NOT NULL THEN 'revoked'
  WHEN ${userInvitation.expiresAt} <= now() THEN 'expired'
  ELSE 'active' END`;

const statusFilter: Record<InvitationStatus, SQL | undefined> = {
  used: isNotNull(userInvitation.acceptedAt),
  revoked: and(isNull(userInvitation.acceptedAt), isNotNull(userInvitation.revokedAt)),
  expired: and(
    isNull(userInvitation.acceptedAt),
    isNull(userInvitation.revokedAt),
    sql`${userInvitation.expiresAt} <= now()`,
  ),
  active: and(
    isNull(userInvitation.acceptedAt),
    isNull(userInvitation.revokedAt),
    sql`${userInvitation.expiresAt} > now()`,
  ),
};

export type InvitationListInput = { status?: InvitationStatus; limit?: number; offset?: number };

/** One page of invitations, newest first, with the inviter's name and the derived status. */
export async function listInvitations(input: InvitationListInput = {}) {
  const limit = Math.min(Math.max(input.limit ?? INVITATION_PAGE_DEFAULT, 1), INVITATION_PAGE_MAX);
  const offset = Math.max(input.offset ?? 0, 0);
  const where = input.status ? statusFilter[input.status] : undefined;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: userInvitation.id,
        email: userInvitation.email,
        role: userInvitation.role,
        status: statusSql,
        invitedBy: userInvitation.invitedBy,
        invitedByName: user.name,
        expiresAt: userInvitation.expiresAt,
        acceptedAt: userInvitation.acceptedAt,
        revokedAt: userInvitation.revokedAt,
        createdAt: userInvitation.createdAt,
      })
      .from(userInvitation)
      .leftJoin(user, eq(user.id, userInvitation.invitedBy))
      .where(where)
      .orderBy(desc(userInvitation.createdAt), desc(userInvitation.id))
      .limit(limit)
      .offset(offset),
    db.select({ n: count() }).from(userInvitation).where(where),
  ]);
  return { invitations: rows, total: total?.n ?? 0, limit, offset };
}

/** The slice of an invitation the revoke flow needs, or null when no such row. */
export async function findInvitation(id: string) {
  const [row] = await db
    .select({ id: userInvitation.id, email: userInvitation.email, role: userInvitation.role })
    .from(userInvitation)
    .where(eq(userInvitation.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Marks an open invitation revoked. The WHERE keeps it atomic: a used or already revoked
 * invitation matches nothing, so two simultaneous revokes yield one row and one null.
 */
export async function revokeInvitation(id: string): Promise<{ id: string } | null> {
  const [row] = await db
    .update(userInvitation)
    .set({ revokedAt: sql`now()` })
    .where(
      and(
        eq(userInvitation.id, id),
        isNull(userInvitation.acceptedAt),
        isNull(userInvitation.revokedAt),
      ),
    )
    .returning({ id: userInvitation.id });
  return row ?? null;
}
