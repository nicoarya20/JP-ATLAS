/** Turns the plan the project list carries (`?rencana=1`) into what the timeline draws. */
import type { ProjectListPlan } from '@server/project/project-plan.dto';
import type { GanttMilestone, GanttSegment } from './gantt-layout';

export type GanttPlan = { segments: GanttSegment[]; milestones: GanttMilestone[] };

/** Phases without both dates are left out (nothing to place); milestones always have a date. */
export function ganttPlanOf(plan: ProjectListPlan | undefined): GanttPlan {
  if (!plan) return { segments: [], milestones: [] };
  return {
    segments: plan.phases.flatMap((p): GanttSegment[] =>
      p.startDate && p.endDate
        ? [
            {
              id: p.id,
              label: p.name,
              startDate: p.startDate,
              dueDate: p.endDate,
              status: p.status,
            },
          ]
        : [],
    ),
    milestones: plan.milestones.map((m) => ({
      id: m.id,
      label: m.title,
      date: m.dueDate,
      reached: m.reachedAt !== null,
    })),
  };
}
