/**
 * Shared scenario of the leave tests: one workspace, the people who decide and the people who ask.
 *
 *   Ayu   Admin
 *   Nico  Project Manager, Pengelola of X
 *   Lea   Project Manager, Pengelola of Y (shares nothing with Dodi)
 *   Dodi  Member in X
 *   Eka   Member in X who holds the project role Pengelola (a Member-Pengelola: still never decides leave)
 *   Oki   Member in Y only
 */
import { and, eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { leaveRequest, notification } from '../../server/db/schema';
import type { LeaveClock } from '../../server/leave/leave.dto';
import type { Role } from '../../server/permissions';
import { ATLAS_NOW } from '../support/clock';
import type { Factory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

/** 2026-10-07 10:00 WIB: "today" of every leave test. */
export const CLOCK: LeaveClock = { now: ATLAS_NOW, today: '2026-10-07' };

export const asPrincipal = (
  u: Pick<TestUser, 'id' | 'role'>,
  impersonating = false,
): Principal => ({
  id: u.id,
  appRole: u.role as Role,
  impersonating,
});

export async function leaveWorld(f: Factory) {
  const ayu = await f.user({ role: 'admin', name: 'Ayu' });
  const nico = await f.user({ role: 'project_manager', name: 'Nico' });
  const lea = await f.user({ role: 'project_manager', name: 'Lea' });
  const dodi = await f.user({ name: 'Dodi' });
  const eka = await f.user({ name: 'Eka' });
  const oki = await f.user({ name: 'Oki' });
  const x = await f.project({
    lead: nico,
    members: [
      [dodi, 'member'],
      [eka, 'manager'],
    ],
  });
  const y = await f.project({ lead: lea, members: [[oki, 'member']] });
  return { ayu, nico, lea, dodi, eka, oki, x, y };
}
export type LeaveWorld = Awaited<ReturnType<typeof leaveWorld>>;

/** Inserts a request directly, bypassing the service (for states the service would not create). */
export async function seedLeave(
  user: Pick<TestUser, 'id'>,
  start: string,
  end: string,
  status: 'pending' | 'approved' | 'rejected' | 'canceled' = 'pending',
) {
  const [row] = await db
    .insert(leaveRequest)
    .values({ userId: user.id, startDate: start, endDate: end, status })
    .returning();
  return row;
}

/** The Inbox cards written for one leave request, optionally for one kind. */
export function leaveCards(requestId: string, kind?: string) {
  return db
    .select()
    .from(notification)
    .where(
      and(
        eq(notification.refType, 'leave'),
        eq(notification.refId, requestId),
        kind ? eq(notification.kind, kind) : undefined,
      ),
    );
}
