/**
 * Pure step of "Simpan sebagai template": turns a project's phases and tasks into template input.
 * Dates become day offsets from the earliest date the project has (day 0), so a template carries the
 * shape and rhythm of the project, not its calendar. No DB access here; `project-template.from-project.ts`
 * loads the rows and calls this.
 */
import { diffDays, type IsoDate } from '../metrics/dates';
import type { ProjectPriority } from '../pm/enums';
import type { TemplatePhaseInput, TemplateTaskInput } from './project-template.service';

/** A project phase as read for a snapshot, already in display order. */
export type SnapshotPhase = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
};

/** A live, non-canceled task as read for a snapshot; `phaseId` null = loose. Already in display order. */
export type SnapshotTask = {
  title: string;
  description: string | null;
  priority: ProjectPriority;
  kindName: string | null;
  dueDate: string | null;
  phaseId: string | null;
};

export type SnapshotLimits = { maxPhases: number; maxTasks: number };

/** What a snapshot left out because a template (like a new project) holds a bounded number of each. */
export type SnapshotOmitted = { phases: number; tasks: number };

export type TemplateSnapshot = {
  phases: TemplatePhaseInput[];
  looseTasks: TemplateTaskInput[];
  omitted: SnapshotOmitted;
};

/** The earliest of the dates given, or null when there are none (ISO dates compare correctly as text). */
function earliest(dates: ReadonlyArray<string | null>): string | null {
  let min: string | null = null;
  for (const d of dates) if (d && (min === null || d < min)) min = d;
  return min;
}

/**
 * Builds the template body from `phases`/`tasks`. Keeps the first `maxPhases` phases, then the first
 * `maxTasks` tasks in template order (each kept phase's tasks, then loose ones) and counts the rest
 * in `omitted`, so the caller can say plainly what did not make it. Assignee, status and progress
 * are never read: a template is a skeleton.
 */
export function buildTemplateSnapshot(
  input: {
    projectStart: string | null;
    phases: ReadonlyArray<SnapshotPhase>;
    tasks: ReadonlyArray<SnapshotTask>;
  },
  limits: SnapshotLimits,
): TemplateSnapshot {
  const { phases, tasks } = input;
  // Day 0 is the earliest date of all, never later than any of them, so no offset comes out negative.
  const base = earliest([
    input.projectStart,
    ...phases.flatMap((p) => [p.startDate, p.endDate]),
    ...tasks.map((t) => t.dueDate),
  ]);
  const offsetOf = (date: string | null): number | null =>
    base && date ? diffDays(base as IsoDate, date as IsoDate) : null;

  const keptPhases = phases.slice(0, limits.maxPhases);
  const keptIds = new Set(keptPhases.map((p) => p.id));
  // A task of a dropped phase is dropped with it; it must not turn into a loose task by accident.
  const eligible = tasks.filter((t) => t.phaseId === null || keptIds.has(t.phaseId));
  const ordered = [
    ...keptPhases.flatMap((p) => eligible.filter((t) => t.phaseId === p.id)),
    ...eligible.filter((t) => t.phaseId === null),
  ];
  const keptTasks = new Set(ordered.slice(0, limits.maxTasks));

  const toTask = (t: SnapshotTask): TemplateTaskInput => ({
    title: t.title,
    description: t.description,
    priority: t.priority,
    kindName: t.kindName,
    dueOffsetDays: offsetOf(t.dueDate),
  });
  return {
    phases: keptPhases.map((p) => ({
      name: p.name,
      description: p.description,
      startOffsetDays: offsetOf(p.startDate),
      endOffsetDays: offsetOf(p.endDate),
      tasks: eligible.filter((t) => t.phaseId === p.id && keptTasks.has(t)).map(toTask),
    })),
    looseTasks: eligible.filter((t) => t.phaseId === null && keptTasks.has(t)).map(toTask),
    omitted: { phases: phases.length - keptPhases.length, tasks: tasks.length - keptTasks.size },
  };
}
