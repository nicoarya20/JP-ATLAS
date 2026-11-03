/**
 * The `phases`/`looseTasks` extension of `createProject()` (plan §4.9): validating the shape
 * `project.service.ts`'s route schema cannot (cross-array totals, date ordering with the same
 * Indonesian wording as the project's own dates) and inserting the rows inside its transaction.
 * Split out of `project.service.ts` on purpose — that file was already near its size budget.
 */
import { PROJECT_DRAFT_PHASES_MAX, PROJECT_DRAFT_TASKS_MAX } from '../ai/project-draft.limits';
import { projectPhase, task } from '../db/schema';
import { CALENDAR_YEAR_MAX, CALENDAR_YEAR_MIN, isInCalendarRange } from '../metrics/dates';
import type { ProjectPriority } from '../pm/enums';
import type { Tx } from '../pm/tx';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Not imported from `project.service.ts`: that file imports this one (plan rows feed the same
// transaction `createProject()` runs), so sharing the binding would make the two files circular.
/** True for a real calendar date such as `2026-02-28`; `2026-02-30` is false. */
function isCalendarDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** A task inside `CreateProjectInput`, either under a phase or loose; same shape either way. */
export type CreateProjectTaskInput = {
  title: string;
  description?: string | null;
  priority?: ProjectPriority;
  /** Matched case-insensitively against this project's task kinds; unmatched or absent falls back to "Tugas". */
  kindName?: string | null;
  dueDate?: string | null;
};

/** A phase inside `CreateProjectInput`, with the tasks the caller places inside it. */
export type CreateProjectPhaseInput = {
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tasks?: ReadonlyArray<CreateProjectTaskInput>;
};

// User-facing Indonesian; each one says what to do next.
export const PLAN_MESSAGES = {
  BAD_DATE: 'Tanggal tidak valid. Pilih tanggal dari kalender, lalu simpan lagi.',
  DATE_OUT_OF_RANGE: `Tahun tanggal harus antara ${CALENDAR_YEAR_MIN} dan ${CALENDAR_YEAR_MAX}. Periksa tahunnya, lalu simpan lagi.`,
  PHASE_NAME_REQUIRED: 'Nama fase wajib diisi. Tulis namanya, lalu simpan lagi.',
  PHASE_END_BEFORE_START: 'Tanggal selesai fase tidak boleh sebelum tanggal mulainya.',
  TASK_TITLE_REQUIRED: 'Judul tugas wajib diisi. Tulis judulnya, lalu simpan lagi.',
  TOO_MANY_PHASES: `Paling banyak ${PROJECT_DRAFT_PHASES_MAX} fase sekaligus. Kurangi jumlahnya, lalu simpan lagi.`,
  TOO_MANY_TASKS: `Paling banyak ${PROJECT_DRAFT_TASKS_MAX} tugas sekaligus (gabungan semua fase dan tugas lepas). Kurangi jumlahnya, lalu simpan lagi.`,
} as const;

/** `d`'s date problem (shape + calendar-year range), or null when `d` is absent or fine. */
function oneDateProblem(d: string | null | undefined): string | null {
  if (!d) return null;
  if (!isCalendarDate(d)) return PLAN_MESSAGES.BAD_DATE;
  return isInCalendarRange(d) ? null : PLAN_MESSAGES.DATE_OUT_OF_RANGE;
}

function dateRangeProblem(start: string | null | undefined, end: string | null | undefined) {
  for (const d of [start, end]) {
    const problem = oneDateProblem(d);
    if (problem) return problem;
  }
  return start && end && end < start ? PLAN_MESSAGES.PHASE_END_BEFORE_START : null;
}

/**
 * The first problem found in `phases`/`looseTasks`, or null; validated here (not only in the route
 * schema) so a bad phase/task date answers the same Indonesian message as the project's own dates
 * (PD-01), and so the cross-array task total is caught even though each array's own `maxItems` is
 * checked independently by the route schema.
 */
export function planProblem(
  phases: ReadonlyArray<CreateProjectPhaseInput> = [],
  looseTasks: ReadonlyArray<CreateProjectTaskInput> = [],
): string | null {
  if (phases.length > PROJECT_DRAFT_PHASES_MAX) return PLAN_MESSAGES.TOO_MANY_PHASES;
  const taskProblem = (t: CreateProjectTaskInput): string | null =>
    t.title.trim() ? oneDateProblem(t.dueDate) : PLAN_MESSAGES.TASK_TITLE_REQUIRED;
  let totalTasks = looseTasks.length;
  for (const phase of phases) {
    if (!phase.name.trim()) return PLAN_MESSAGES.PHASE_NAME_REQUIRED;
    const dates = dateRangeProblem(phase.startDate, phase.endDate);
    if (dates) return dates;
    totalTasks += phase.tasks?.length ?? 0;
    for (const t of phase.tasks ?? []) {
      const problem = taskProblem(t);
      if (problem) return problem;
    }
  }
  for (const t of looseTasks) {
    const problem = taskProblem(t);
    if (problem) return problem;
  }
  return totalTasks > PROJECT_DRAFT_TASKS_MAX ? PLAN_MESSAGES.TOO_MANY_TASKS : null;
}

/** The id of the task kind named `name` (case-insensitive) among `kinds`, or `fallbackId` when
 * `name` is absent or matches none — "Tugas" is the fallback per plan §4.9 step 5. */
function resolveKindId(
  name: string | null | undefined,
  kinds: ReadonlyArray<{ id: string; name: string }>,
  fallbackId: string,
): string {
  const wanted = name?.trim().toLowerCase();
  if (!wanted) return fallbackId;
  return kinds.find((k) => k.name.toLowerCase() === wanted)?.id ?? fallbackId;
}

/**
 * Inserts `phases` (in order, with their tasks) and `looseTasks` for a just-created project, inside
 * the caller's own transaction. `kindRows`/`fallbackKindId` come from the `taskKind` insert
 * `createProject()` already does, right before calling this.
 */
export async function insertProjectPlan(
  tx: Tx,
  opts: {
    projectId: string;
    creatorId: string;
    now: Date;
    kindRows: ReadonlyArray<{ id: string; name: string }>;
    fallbackKindId: string;
    phases: ReadonlyArray<CreateProjectPhaseInput>;
    looseTasks: ReadonlyArray<CreateProjectTaskInput>;
  },
): Promise<void> {
  const { projectId, creatorId, now, kindRows, fallbackKindId, phases, looseTasks } = opts;
  const phaseIds: Array<string | null> = [];
  if (phases.length > 0) {
    const phaseRows = await tx
      .insert(projectPhase)
      .values(
        phases.map((phase, position) => ({
          projectId,
          name: phase.name.trim(),
          description: phase.description?.trim() || null,
          position,
          startDate: phase.startDate ?? null,
          endDate: phase.endDate ?? null,
        })),
      )
      .returning({ id: projectPhase.id });
    phaseIds.push(...phaseRows.map((r) => r.id));
  }

  const taskRows: (typeof task.$inferInsert)[] = [];
  const pushTask = (t: CreateProjectTaskInput, phaseId: string | null) =>
    taskRows.push({
      projectId,
      phaseId,
      kindId: resolveKindId(t.kindName, kindRows, fallbackKindId),
      title: t.title.trim(),
      description: t.description?.trim() || null,
      priority: t.priority ?? 'medium',
      createdBy: creatorId,
      dueDate: t.dueDate ?? null,
      lastActivityAt: now,
    });
  phases.forEach((phase, i) => {
    for (const t of phase.tasks ?? []) pushTask(t, phaseIds[i] ?? null);
  });
  for (const t of looseTasks) pushTask(t, null);
  if (taskRows.length > 0) await tx.insert(task).values(taskRows);
}
