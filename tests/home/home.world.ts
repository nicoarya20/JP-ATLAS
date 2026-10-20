/**
 * One small workspace shared by the Beranda suites. "Now" is Wednesday 2026-10-07 10.00 WIB, so the
 * week began on Monday 2026-10-05 00.00 WIB (= 2026-10-04T17:00:00Z). `me` manages Hajatan, is a
 * plain member of Dapur and has nothing to do with Terpisah; Arsip is trashed and must show nowhere.
 */
import { eq } from 'drizzle-orm';
import type { Principal } from '../../server/access/types';
import { db } from '../../server/db';
import { project as projectTable, taskActivity, taskComment } from '../../server/db/schema';
import { toPrincipal } from '../../server/project/membership.query';
import type { Cleaner } from '../support/cleanup';
import { ATLAS_NOW } from '../support/clock';
import type { Factory } from '../support/factory.task';
import type { TestUser } from '../support/factory.user';

export const NOW = ATLAS_NOW;
export const TODAY = '2026-10-07';
const HOUR_MS = 3_600_000;
export const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR_MS);

export const principalOf = (u: TestUser): Principal => toPrincipal({ user: u, role: u.role });

export async function seedHomeWorld(f: Factory, cleaner: Cleaner) {
  return cleaner.shared(async () => {
    const me = await f.user({ role: 'project_manager', name: 'Nico Uji' });
    const peer = await f.user({ name: 'Rina Uji' });
    const boss = await f.user({ role: 'project_manager', name: 'Budi Uji' });
    const outsider = await f.user({ name: 'Luar Uji' });

    const hajatan = await f.project({
      lead: me,
      members: [[peer, 'member']],
      name: 'Hajatan Uji',
      startDate: '2026-09-20',
      dueDate: '2026-10-24',
    });
    const dapur = await f.project({
      lead: boss,
      members: [[me, 'member']],
      name: 'Dapur Uji',
      dueDate: '2026-12-01',
    });
    const terpisah = await f.project({ lead: boss, name: 'Terpisah Uji' });
    const arsip = await f.project({ lead: me, name: 'Arsip Uji' });
    await db.update(projectTable).set({ deletedAt: NOW }).where(eq(projectTable.id, arsip.id));

    const t = (over: Parameters<Factory['task']>[0]) => f.task(over);
    const tasks = {
      overdue: await t({
        project: hajatan,
        assignee: me,
        status: 'in_progress',
        due: '2026-10-05',
        priority: 'high',
        title: 'Bayar DP',
      }),
      todayLow: await t({ project: hajatan, assignee: me, due: TODAY, title: 'Pesan katering' }),
      todayTop: await t({
        project: hajatan,
        assignee: me,
        due: TODAY,
        priority: 'critical',
        title: 'Konfirmasi tenda',
      }),
      week: await t({ project: hajatan, assignee: me, due: '2026-10-10', title: 'Beli cat' }),
      noDue: await t({ project: hajatan, assignee: me, title: 'Tanpa tenggat' }),
      later: await t({
        project: hajatan,
        assignee: me,
        status: 'in_progress',
        due: '2026-10-20',
        title: 'Nanti saja',
      }),
      unassigned: await t({ project: hajatan, status: 'todo', title: 'Tanpa pengerja' }),
      peerBusy: await t({
        project: hajatan,
        assignee: peer,
        status: 'in_progress',
        title: 'Pekerjaan Rina',
      }),
      peerDone: await t({
        project: hajatan,
        assignee: peer,
        status: 'done',
        completedAt: new Date('2026-10-06T05:00:00Z'),
        title: 'Survei harga',
      }),
      canceled: await t({
        project: hajatan,
        assignee: me,
        status: 'canceled',
        title: 'Dibatalkan',
      }),
      trashed: await t({
        project: hajatan,
        assignee: me,
        status: 'done',
        deletedAt: NOW,
        title: 'Sudah dibuang',
      }),
      lastWeek: await t({
        project: hajatan,
        assignee: me,
        status: 'done',
        completedAt: new Date('2026-10-04T16:59:00Z'),
        title: 'Minggu lalu',
      }),
      mondayStart: await t({
        project: hajatan,
        assignee: me,
        status: 'done',
        completedAt: new Date('2026-10-04T17:00:00Z'),
        title: 'Senin pagi',
      }),
      dapurToday: await t({
        project: dapur,
        assignee: me,
        due: TODAY,
        priority: 'low',
        title: 'Beli keramik',
      }),
      dapurDone: await t({
        project: dapur,
        assignee: boss,
        status: 'done',
        completedAt: hoursAgo(1),
        title: 'Ukur dapur',
      }),
      hidden: await t({ project: terpisah, due: '2026-10-01', title: 'Bukan urusan saya' }),
      hiddenDone: await t({
        project: terpisah,
        assignee: boss,
        status: 'done',
        completedAt: hoursAgo(1),
        title: 'Rahasia selesai',
      }),
      archived: await t({
        project: arsip,
        assignee: me,
        due: '2026-10-01',
        title: 'Di proyek terbuang',
      }),
    };
    return { me, peer, boss, outsider, projects: { hajatan, dapur, terpisah, arsip }, tasks };
  });
}

export type HomeWorld = Awaited<ReturnType<typeof seedHomeWorld>>;

/** Writes history rows for the activity suite; tasks cascade them away, so the cleaner needs no extra kind. */
export async function addActivity(
  taskId: string,
  who: TestUser | null,
  action: string,
  at: Date,
  kept = 'Nama lama',
) {
  await db.insert(taskActivity).values({
    taskId,
    actorId: who?.id ?? null,
    actorName: kept,
    action,
    createdAt: at,
  });
}

export async function addComment(
  taskId: string,
  who: TestUser | null,
  at: Date,
  deletedAt: Date | null = null,
) {
  await db.insert(taskComment).values({
    taskId,
    authorId: who?.id ?? null,
    authorName: 'Nama lama',
    body: 'catatan uji',
    createdAt: at,
    deletedAt,
  });
}
