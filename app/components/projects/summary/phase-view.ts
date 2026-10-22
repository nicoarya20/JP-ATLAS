/** Pure view rules of the phase stepper and the "next phase" card, so they are testable without a DOM. */
import type { IsoDate } from '@server/metrics/types';
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import { describeDue } from '~/components/ui/DateText';
import { NEXT_PHASE_COPY } from './summary.copy';

const PERCENT_FULL = 100;
/** The highest share shown while a phase still has open tasks, as the project progress rule does. */
const PERCENT_BEFORE_DONE = 99;

/** Share of a phase's tasks that are done; null without tasks. Never 100% until every task is done. */
export function phasePercent(phase: Pick<PhaseDto, 'taskCount' | 'doneCount'>): number | null {
  if (phase.taskCount <= 0) return null;
  if (phase.doneCount >= phase.taskCount) return PERCENT_FULL;
  const raw = Math.round((phase.doneCount * PERCENT_FULL) / phase.taskCount);
  return Math.min(Math.max(raw, 0), PERCENT_BEFORE_DONE);
}

/** "20 Okt 2026 · 13 hari lagi" and whether it is already late, for the next milestone. */
export function milestoneWhen(milestone: Pick<MilestoneDto, 'dueDate'>, today: IsoDate) {
  return describeDue(milestone.dueDate as IsoDate, today);
}

/** What the card says about the running phase: its name and progress, or why there is none. */
export function currentPhaseLine(phases: readonly PhaseDto[], current: PhaseDto | null): string {
  if (current) return NEXT_PHASE_COPY.now(current.name, phasePercent(current));
  return phases.every((p) => p.status === 'done')
    ? NEXT_PHASE_COPY.allDone
    : NEXT_PHASE_COPY.noCurrent;
}
