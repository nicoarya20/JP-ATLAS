/**
 * Fixture for the S5a security tests: one project with the eight personas of the permission matrix,
 * a second project nobody here belongs to, and a resettable plan (phases, milestone, override).
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../../server/db';
import {
  project,
  projectActivity,
  projectConditionOverride,
  projectDeadlineExtension,
  projectMilestone,
  projectPhase,
} from '../../server/db/schema';
import type { PersonaCode } from '../access/fixtures';
import type { Cleaner } from './cleanup';
import type { createFactory } from './factory.task';
import type { TestUser } from './factory.user';

export const SCHEDULE_DUE = '2030-10-15'; // test-only
export const MILESTONE_DUE = '2030-09-01'; // test-only

export type ScheduleWorld = {
  projectId: string;
  /** A project none of the personas belongs to, with a phase and a milestone of its own. */
  other: { projectId: string; phaseId: string; milestoneId: string };
  people: Record<PersonaCode, TestUser>;
};

export type SeededPlan = {
  phaseA: string;
  phaseB: string;
  milestoneId: string;
  overrideId: string;
};

/** Builds the world inside `cleaner.shared`, so it lives for the whole file. */
export function buildScheduleWorld(
  cleaner: Cleaner,
  f: ReturnType<typeof createFactory>,
): Promise<ScheduleWorld> {
  return cleaner.shared(async () => {
    const lead = await f.user({ role: 'project_manager' });
    const people: Record<PersonaCode, TestUser> = {
      SA: await f.user({ role: 'super-admin' }),
      AD: await f.user({ role: 'admin' }),
      'PM-K': lead,
      'PM-X': await f.user({ role: 'project_manager' }),
      'M-K': await f.user(),
      AG: await f.user(),
      PT: await f.user(),
      BA: await f.user(),
    };
    const prj = await f.project({
      lead,
      dueDate: SCHEDULE_DUE,
      members: [
        [people.AD, 'viewer'], // an Admin is never limited by the project role they hold
        [people['M-K'], 'manager'],
        [people.AG, 'member'],
        [people.PT, 'viewer'],
      ],
    });
    const otherLead = await f.user({ role: 'project_manager' });
    const other = await f.project({ lead: otherLead, dueDate: SCHEDULE_DUE });
    const [phase] = await db
      .insert(projectPhase)
      .values({ projectId: other.id, name: 'Tahap proyek lain', position: 0 }) // test-only
      .returning({ id: projectPhase.id });
    const [ms] = await db
      .insert(projectMilestone)
      .values({ projectId: other.id, title: 'Milestone proyek lain', dueDate: MILESTONE_DUE }) // test-only
      .returning({ id: projectMilestone.id });
    if (!phase || !ms) throw new Error('Seeding the second project failed');
    return {
      projectId: prj.id,
      other: { projectId: other.id, phaseId: phase.id, milestoneId: ms.id },
      people,
    };
  });
}

/** Empties the project's plan and history and puts back a known one: two phases, a milestone, an override. */
export async function resetPlan(w: ScheduleWorld): Promise<SeededPlan> {
  const id = w.projectId;
  await db.delete(projectConditionOverride).where(eq(projectConditionOverride.projectId, id));
  await db.delete(projectDeadlineExtension).where(eq(projectDeadlineExtension.projectId, id));
  await db.delete(projectActivity).where(eq(projectActivity.projectId, id));
  await db.delete(projectMilestone).where(eq(projectMilestone.projectId, id));
  await db.delete(projectPhase).where(eq(projectPhase.projectId, id));
  await db
    .update(project)
    .set({ dueDate: SCHEDULE_DUE, originalDueDate: null, status: 'active' })
    .where(eq(project.id, id));
  const phases = await db
    .insert(projectPhase)
    .values([
      { projectId: id, name: 'Tahap A', position: 0 },
      { projectId: id, name: 'Tahap B', position: 1 },
    ]) // test-only
    .returning({ id: projectPhase.id });
  const [a, b] = phases;
  const [ms] = await db
    .insert(projectMilestone)
    .values({ projectId: id, title: 'Milestone awal', dueDate: MILESTONE_DUE }) // test-only
    .returning({ id: projectMilestone.id });
  const [ov] = await db
    .insert(projectConditionOverride)
    .values({
      projectId: id,
      condition: 'at_risk',
      reason: 'Menunggu bahan', // test-only
      setBy: w.people['PM-K'].id,
    })
    .returning({ id: projectConditionOverride.id });
  if (!a || !b || !ms || !ov) throw new Error('Seeding the plan failed');
  return { phaseA: a.id, phaseB: b.id, milestoneId: ms.id, overrideId: ov.id };
}

/** Everything a schedule write could touch; equal before and after a refused write. */
export async function planFingerprint(projectId: string) {
  const [prj] = await db
    .select({
      status: project.status,
      dueDate: project.dueDate,
      originalDueDate: project.originalDueDate,
    })
    .from(project)
    .where(eq(project.id, projectId));
  const phases = await db
    .select()
    .from(projectPhase)
    .where(eq(projectPhase.projectId, projectId))
    .orderBy(asc(projectPhase.id));
  const milestones = await db
    .select()
    .from(projectMilestone)
    .where(eq(projectMilestone.projectId, projectId))
    .orderBy(asc(projectMilestone.id));
  const overrides = await db
    .select()
    .from(projectConditionOverride)
    .where(eq(projectConditionOverride.projectId, projectId))
    .orderBy(asc(projectConditionOverride.id));
  const extensions = await db
    .select({ id: projectDeadlineExtension.id })
    .from(projectDeadlineExtension)
    .where(eq(projectDeadlineExtension.projectId, projectId));
  const activity = await db
    .select({ id: projectActivity.id })
    .from(projectActivity)
    .where(eq(projectActivity.projectId, projectId));
  return {
    prj,
    phases,
    milestones,
    overrides,
    extensions: extensions.length,
    activity: activity.length,
  };
}

/** The override in force (not cleared), or undefined. */
export async function activeOverride(projectId: string) {
  const [row] = await db
    .select()
    .from(projectConditionOverride)
    .where(
      and(
        eq(projectConditionOverride.projectId, projectId),
        isNull(projectConditionOverride.clearedAt),
      ),
    )
    .limit(1);
  return row;
}
