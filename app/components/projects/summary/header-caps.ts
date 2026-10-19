/** Which header actions a viewer sees, decided from the server's `can{}` and the project state, never the role. */
import type { ProjectStatus } from '@server/pm/enums';
import type { ProjectDetail } from '@server/project/project.dto';

/** Statuses whose due date may still move; a finished or canceled project has nothing left to extend. */
const EXTENDABLE: readonly ProjectStatus[] = ['draft', 'active', 'on_hold'];

type CapsInput = Pick<ProjectDetail, 'can' | 'status'>;

/** `can.update` is the server's "may manage this project", the same gate the extend route applies. */
const manages = (p: Pick<ProjectDetail, 'can'>) => p.can.update === true;

/** A manager may extend an unfinished project that has a due date to move. */
export function canExtendDeadline(p: CapsInput & Pick<ProjectDetail, 'dueDate'>): boolean {
  return manages(p) && p.dueDate !== null && EXTENDABLE.includes(p.status);
}

/** A manual condition only makes sense while the project runs (the server answers NOT_ACTIVE otherwise). */
export function canSetCondition(p: CapsInput): boolean {
  return manages(p) && p.status === 'active';
}

/** Clearing needs a manual condition in force and a project that still shows one. */
export function canClearCondition(
  p: CapsInput & Pick<ProjectDetail, 'conditionOverride'>,
): boolean {
  return canSetCondition(p) && p.conditionOverride !== null;
}
