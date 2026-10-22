/** Pure helpers shared by the Tahapan tab components: date wording, ordering and the row-busy marker. */
import type { MilestoneDto, PhaseDto } from '@server/project/project-plan.dto';
import { formatCalendarDate } from '~/components/ui/DateText';
import { PLAN_COPY } from './plan.copy';

/** The row whose write is running, so only its button spins; ids are unique across phases and milestones. */
export type PlanBusy = {
  id: string;
  action: 'move' | 'remove' | 'reach';
} | null;

export type MoveDirection = 'up' | 'down';

/** "1 Okt 2026 – 31 Okt 2026", or the one date that is set, or a note that none is. */
export function describeRange(start: string | null, end: string | null): string {
  if (start && end) return PLAN_COPY.dateRange(formatCalendarDate(start), formatCalendarDate(end));
  if (start) return PLAN_COPY.startsOn(formatCalendarDate(start));
  if (end) return PLAN_COPY.endsOn(formatCalendarDate(end));
  return PLAN_COPY.noDates;
}

/** Ids in the order after moving `phaseId` one step; null at the ends or when the phase is unknown. */
export function movedOrder(
  phases: readonly PhaseDto[],
  phaseId: string,
  direction: MoveDirection,
): string[] | null {
  const from = phases.findIndex((p) => p.id === phaseId);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= phases.length) return null;
  const ids = phases.map((p) => p.id);
  const [moved] = ids.splice(from, 1);
  if (moved === undefined) return null;
  ids.splice(to, 0, moved);
  return ids;
}

/** An unreached milestone whose date has passed; "today" is the server's day, never the browser's. */
export const isMilestoneOverdue = (m: MilestoneDto, today: string): boolean =>
  m.reachedAt === null && m.dueDate < today;
