/**
 * Headcount for the Admin Beranda: one aggregate over the `user` table, never a row per person. Role
 * buckets use the same legacy reading as the Pengguna menu — a stored `user` or a NULL role counts
 * as member — so the numbers here and in the directory can never disagree.
 */
import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema';
import { realUser } from '../../api/admin-users.query';
import { ROLES } from '../../permissions';
import type { Executor } from '../../pm/tx';
import type { MembersSummary } from './overview.dto';

const asInt = (fragment: ReturnType<typeof sql>) => sql<number>`${fragment}::int`;

/** `member` also matches the pre-rename `user` value and NULL, which `normalizeRole` reads as member. */
const isMember = sql`(${user.role} is null or ${user.role} in (${ROLES.MEMBER}, 'user'))`;
const active = sql`${user.banned} is not true`;

export async function getMembers(exec: Executor = db): Promise<MembersSummary> {
  const [row] = await exec
    .select({
      active: asInt(sql`count(*) filter (where ${active})`),
      inactive: asInt(sql`count(*) filter (where ${user.banned} = true)`),
      members: asInt(sql`count(*) filter (where ${active} and ${isMember})`),
      projectManagers: asInt(
        sql`count(*) filter (where ${active} and ${user.role} = ${ROLES.PROJECT_MANAGER})`,
      ),
      admins: asInt(sql`count(*) filter (where ${active} and ${user.role} = ${ROLES.ADMIN})`),
      superAdmins: asInt(
        sql`count(*) filter (where ${active} and ${user.role} = ${ROLES.SUPER_ADMIN})`,
      ),
    })
    .from(user)
    .where(realUser);
  return {
    active: row?.active ?? 0,
    inactive: row?.inactive ?? 0,
    // Order from most to least common keeps the badges reading the way an Admin scans them.
    roles: [
      { role: ROLES.MEMBER, count: row?.members ?? 0 },
      { role: ROLES.PROJECT_MANAGER, count: row?.projectManagers ?? 0 },
      { role: ROLES.ADMIN, count: row?.admins ?? 0 },
      { role: ROLES.SUPER_ADMIN, count: row?.superAdmins ?? 0 },
    ],
  };
}

/** Registrants still waiting for approval — one cheap count, the card that was real before AD-14. */
export async function getPendingApprovals(exec: Executor = db): Promise<{ count: number }> {
  const [row] = await exec
    .select({ count: asInt(sql`count(*) filter (where ${user.approvalStatus} = 'pending')`) })
    .from(user)
    .where(realUser);
  return { count: row?.count ?? 0 };
}
