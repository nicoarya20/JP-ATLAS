/** A mix of projects in every condition for the list filters (S5a-04); dates are far from any real "today". */
import { db } from '../../server/db';
import { projectConditionOverride, projectMilestone } from '../../server/db/schema';
import type { ProjectCondition } from '../../server/pm/enums';
import type { ProjectOptions } from './factory.project';
import type { createFactory } from './factory.task';
import type { TestUser } from './factory.user';

const LONG_AGO = '2020-01-01'; // test-only
const FAR_AHEAD = '2099-01-01'; // test-only

export type AttentionWorld = {
  marker: string;
  lead: TestUser;
  me: TestUser;
  /** Names by role in the story; every one is `${marker} <label>`. */
  names: Record<'lancar' | 'berisiko' | 'terlambat' | 'override' | 'dicabut', string>;
};

async function overrideOf(projectId: string, condition: ProjectCondition, setBy: string) {
  await db
    .insert(projectConditionOverride)
    .values({ projectId, condition, reason: 'Dinilai pengelola', setBy }); // test-only
}

/** `me` follows every project but "Bukan milik saya"; the marker keeps other files' rows out of a `q` search. */
export async function seedAttentionWorld(
  f: ReturnType<typeof createFactory>,
): Promise<AttentionWorld> {
  const marker = `att${crypto.randomUUID().slice(0, 8)}`;
  const lead = await f.user({ role: 'project_manager' });
  const me = await f.user();
  const mine = (label: string, over: Omit<ProjectOptions, 'lead' | 'name'>) =>
    f.project({ lead, members: [[me, 'member']], name: `${marker} ${label}`, ...over });

  await mine('Lancar', { dueDate: FAR_AHEAD });
  const risky = await mine('Berisiko', { dueDate: FAR_AHEAD });
  // A milestone that was due long ago and never reached: "1 milestone terlewat".
  await db
    .insert(projectMilestone)
    .values({ projectId: risky.id, title: 'Terlewat', dueDate: LONG_AGO }); // test-only
  await mine('Terlambat', { dueDate: LONG_AGO });
  const manual = await mine('Dinilai manual', { dueDate: FAR_AHEAD });
  await overrideOf(manual.id, 'off_track', lead.id);
  const revoked = await mine('Penilaian dicabut', { dueDate: LONG_AGO });
  await overrideOf(revoked.id, 'on_track', lead.id);
  // No condition without `active`: a late draft, a finished and a paused project never need attention.
  await mine('Draf', { dueDate: LONG_AGO, status: 'draft' });
  await mine('Selesai', { dueDate: LONG_AGO, status: 'completed' });
  await mine('Ditahan', { dueDate: LONG_AGO, status: 'on_hold' });
  await f.project({ lead, name: `${marker} Bukan milik saya`, dueDate: LONG_AGO });

  const n = (label: string) => `${marker} ${label}`;
  return {
    marker,
    lead,
    me,
    names: {
      lancar: n('Lancar'),
      berisiko: n('Berisiko'),
      terlambat: n('Terlambat'),
      override: n('Dinilai manual'),
      dicabut: n('Penilaian dicabut'),
    },
  };
}
