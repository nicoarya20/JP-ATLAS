/**
 * Shared scenario of the leave tests: one workspace with the four roles in it. Nobody decides leave
 * any more (P14 D3) — Admin records it — but the cast stays, because what every role may *read* of
 * someone else's leave is exactly what these tests check.
 *
 *   Ayu   Admin
 *   Nico  Project Manager, Pengelola of X
 *   Lea   Project Manager, Pengelola of Y (shares nothing with Dodi)
 *   Dodi  Member in X
 *   Eka   Member in X who holds the project role Pengelola (a Member-Pengelola)
 *   Oki   Member in Y only
 */
import { db } from '../../server/db';
import { leavePeriod } from '../../server/db/schema';
import { ATLAS_NOW } from '../support/clock';
import type { Factory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

/** 2026-10-07 10:00 WIB: "today" of every leave test. */
export const CLOCK = { now: ATLAS_NOW, today: '2026-10-07' } as const;

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

/** Records a leave period straight into the table; `note` is Admin-only and never read back by Team. */
export async function seedLeave(
  user: Pick<TestUser, 'id'>,
  start: string,
  end: string,
  note: string | null = null,
) {
  const [row] = await db
    .insert(leavePeriod)
    .values({ userId: user.id, startDate: start, endDate: end, note })
    .returning();
  return row;
}
