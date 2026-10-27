/**
 * Recent role changes for the Admin Beranda, read from the audit trail (`user.role.set`). Both the
 * actor and the person re-roled are resolved with a join each — two aliased joins on `user`, never a
 * lookup per row — and the `from`/`to` values come straight from the audit `meta` the writer stored.
 *
 * The audit row is the source of truth: it keeps an email snapshot even when the account is later
 * deleted, so a change still reads sensibly after the target or actor is gone.
 */
import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { AUDIT_ACTIONS } from '../../audit';
import { db } from '../../db';
import { auditLog, user } from '../../db/schema';
import type { Executor } from '../../pm/tx';
import { OVERVIEW_LIST_LIMIT } from './overview.config';
import type { RoleChangesSummary } from './overview.dto';

const target = alias(user, 'role_change_target');

/** Reads a string field out of the stored audit meta (jsonb, so `unknown`); non-string or missing → null. */
function metaString(meta: unknown, key: string): string | null {
  if (meta === null || typeof meta !== 'object') return null;
  const v = (meta as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : null;
}

export async function getRoleChanges(exec: Executor = db): Promise<RoleChangesSummary> {
  const rows = await exec
    .select({
      id: auditLog.id,
      actorName: user.name,
      actorEmail: auditLog.actorEmail,
      targetName: target.name,
      targetEmail: target.email,
      meta: auditLog.meta,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .leftJoin(target, eq(target.id, auditLog.targetId))
    .where(sql`${auditLog.action} = ${AUDIT_ACTIONS.USER_ROLE_SET}`)
    .orderBy(desc(auditLog.createdAt))
    .limit(OVERVIEW_LIST_LIMIT);
  const items = rows.map((r) => ({
    id: r.id,
    targetName: r.targetName,
    targetEmail: r.targetEmail,
    from: metaString(r.meta, 'from'),
    to: metaString(r.meta, 'to'),
    byName: r.actorName,
    byEmail: r.actorEmail,
    at: r.createdAt.toISOString(),
  }));
  return { items };
}
