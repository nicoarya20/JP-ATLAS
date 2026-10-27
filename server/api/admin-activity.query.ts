/**
 * List query for the Admin reading of the audit trail (P11 AD-18).
 *
 * The super-admin console (`/api/audit`) returns every row as written; this one answers a narrower
 * question for a non-technical admin, so it differs in three ways from `audit.query`:
 *   1. the whitelist (`ADMIN_ACTIVITY_ACTIONS`) is ANDed into *every* query, so no parameter can
 *      widen the reading beyond the actions an admin is meant to see;
 *   2. the selected columns are the ones an admin reads — no `meta`, `ip`, `userAgent`, `targetId`
 *      or raw actor id, which are "nomor id yang tidak berarti" to them;
 *   3. the actor email is masked on the way out, so a full address never leaves the process
 *      (CLAUDE.md §12).
 */
import { and, desc, eq, gte, ilike, inArray, or, type SQL, sql } from 'drizzle-orm';
import { t } from 'elysia';
import {
  actionsOfCategory,
  ADMIN_ACTIVITY_ACTIONS,
  isAdminActivityAction,
  maskEmail,
} from '../audit.admin';
import { db } from '../db';
import { auditLog, user } from '../db/schema';
import { parsePaging } from './analytics-paging';

export const AdminActivityQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  search: t.Optional(t.String()),
  category: t.Optional(t.String()),
  action: t.Optional(t.String()),
  days: t.Optional(t.String()),
});
export type AdminActivityQueryType = typeof AdminActivityQuery.static;

const MAX_DAYS = 365;
const MS_PER_DAY = 86_400_000;
const count = sql<number>`count(*)::int`;

/**
 * The whitelist is the privacy boundary, so it is always applied; `category` and `action` only ever
 * narrow *inside* it. A single `action` is honoured only when it is itself whitelisted, so
 * `?action=user.impersonate` is ignored rather than turned into a hole in the whitelist.
 */
export function buildAdminActivityWhere(q: AdminActivityQueryType): SQL | undefined {
  const search = q.search?.trim();
  const days = q.days ? Math.min(Math.max(0, Number(q.days) || 0), MAX_DAYS) : 0;
  const action = q.action && isAdminActivityAction(q.action) ? q.action : null;
  const categoryActions = q.category ? actionsOfCategory(q.category) : null;
  return and(
    inArray(auditLog.action, [...ADMIN_ACTIVITY_ACTIONS]),
    action ? eq(auditLog.action, action) : undefined,
    categoryActions ? inArray(auditLog.action, [...categoryActions]) : undefined,
    days > 0 ? gte(auditLog.createdAt, new Date(Date.now() - days * MS_PER_DAY)) : undefined,
    // Search reads the stored email so an admin can still find a colleague by it, even though the
    // response only ever carries the masked form.
    search
      ? or(
          ilike(auditLog.summary, `%${search}%`),
          ilike(auditLog.actorEmail, `%${search}%`),
          ilike(user.name, `%${search}%`),
        )
      : undefined,
  );
}

/** Admin-readable columns only: who, what, when, and the human summary. */
export const adminActivitySelect = {
  id: auditLog.id,
  actorEmail: auditLog.actorEmail,
  actorName: user.name,
  actorImage: user.image,
  action: auditLog.action,
  targetType: auditLog.targetType,
  summary: auditLog.summary,
  createdAt: auditLog.createdAt,
};

export async function listAdminActivity(q: AdminActivityQueryType) {
  const { page, limit } = parsePaging(q);
  const where = buildAdminActivityWhere(q);
  const [rows, [totals]] = await Promise.all([
    db
      .select(adminActivitySelect)
      .from(auditLog)
      .leftJoin(user, eq(auditLog.actorId, user.id))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count }).from(auditLog).leftJoin(user, eq(auditLog.actorId, user.id)).where(where),
  ]);
  return {
    // Masked here, not in the browser: the full address must never reach the client (CLAUDE.md §12).
    rows: rows.map((r) => ({ ...r, actorEmail: maskEmail(r.actorEmail) })),
    total: totals?.count ?? 0,
    page,
    limit,
  };
}
