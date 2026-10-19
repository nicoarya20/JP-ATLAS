/**
 * The phase side of a task write (H-B5): a task may only sit in a phase of its own project, and a
 * move between phases is recorded as an activity row carrying the phase names.
 */
import { inArray } from 'drizzle-orm';
import { projectPhase } from '../db/schema';
import type { Tx } from '../pm/tx';
import { phaseInProject } from '../project/project-plan.write';
import { TASK_WRITE_MESSAGES } from './task.limits';
import { invalid, type Refusal } from './task-write.check';

/**
 * Refuses a phase that is not one of the project's own. Another project's phase and an unknown id
 * answer the same sentence, so nothing leaks about phases elsewhere. Locks the phase row while checking.
 */
export async function checkPhase(
  tx: Tx,
  projectId: string,
  phaseId: string,
): Promise<Refusal | null> {
  return (await phaseInProject(tx, projectId, phaseId))
    ? null
    : invalid(TASK_WRITE_MESSAGES.phaseNotInProject);
}

/** Payload of a `phase_changed` row: the names of both phases (null = out of any phase). */
export async function phaseChangePayload(
  tx: Tx,
  from: string | null,
  to: string | null,
): Promise<{ from: string | null; to: string | null }> {
  const ids = [from, to].filter((id): id is string => id !== null);
  const rows = ids.length
    ? await tx
        .select({ id: projectPhase.id, name: projectPhase.name })
        .from(projectPhase)
        .where(inArray(projectPhase.id, ids))
    : [];
  const names = new Map(rows.map((r) => [r.id, r.name]));
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? null) : null);
  return { from: nameOf(from), to: nameOf(to) };
}
