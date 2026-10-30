/**
 * Write side of project templates (plan §5.2, §5.3, §6): create, replace-all edit, delete and
 * instantiate ("use"). Create/update/delete run in one `inTx` each; `useTemplate` converts offsets to
 * absolute dates and then calls the one `createProject()` that also serves the plain form and
 * story-mode — template-mode never has its own "insert a project" code path.
 */
import { eq } from 'drizzle-orm';
import { canCreateProject } from '../access/project.policy';
import { canCreateTemplate, canUseTemplate } from '../access/project-template.policy';
import type { Principal } from '../access/types';
// Single source of truth shared with the AI draft and the plain create route (plan §4.9, §5.2).
import { PROJECT_DRAFT_PHASES_MAX, PROJECT_DRAFT_TASKS_MAX } from '../ai/project-draft.limits';
import { addDays } from '../ai/task-draft.dates';
import { projectTemplate, projectTemplatePhase, projectTemplateTask } from '../db/schema';
import type { ProjectMemberRole, ProjectPriority, ProjectTemplateSource } from '../pm/enums';
import { inTx, type Tx } from '../pm/tx';
import {
  type CreateProjectPhaseInput,
  type CreateProjectTaskInput,
  createProject,
  isCalendarDate,
  type WriteResult,
} from './project.service';
import type { TemplatePhaseDto, TemplateTaskDto } from './project-template.dto';
import { getTemplateDetail } from './project-template.query';

export type TemplateTaskInput = {
  title: string;
  description?: string | null;
  priority?: ProjectPriority | null;
  kindName?: string | null;
  dueOffsetDays?: number | null;
};
export type TemplatePhaseInput = {
  name: string;
  description?: string | null;
  startOffsetDays?: number | null;
  endOffsetDays?: number | null;
  tasks?: ReadonlyArray<TemplateTaskInput>;
};
export type SaveTemplateInput = {
  name: string;
  description?: string | null;
  source: ProjectTemplateSource;
  phases?: ReadonlyArray<TemplatePhaseInput>;
  looseTasks?: ReadonlyArray<TemplateTaskInput>;
};
export type UseTemplateInput = {
  name?: string;
  /** `YYYY-MM-DD`: the project's day 0, the base every offset is added to. */
  startDate: string;
  leadId?: string;
  priority?: ProjectPriority;
  members?: ReadonlyArray<{ userId: string; role: ProjectMemberRole }>;
};

export const TEMPLATE_WRITE_MESSAGES = {
  NAME_REQUIRED: 'Nama template wajib diisi. Tulis namanya, lalu simpan lagi.',
  PHASE_NAME_REQUIRED: 'Nama fase wajib diisi. Tulis namanya, lalu simpan lagi.',
  PHASE_END_BEFORE_START: 'Hari selesai fase tidak boleh sebelum hari mulainya.',
  TASK_TITLE_REQUIRED: 'Judul tugas wajib diisi. Tulis judulnya, lalu simpan lagi.',
  TOO_MANY_PHASES: `Paling banyak ${PROJECT_DRAFT_PHASES_MAX} fase sekaligus. Kurangi jumlahnya, lalu simpan lagi.`,
  TOO_MANY_TASKS: `Paling banyak ${PROJECT_DRAFT_TASKS_MAX} tugas sekaligus (gabungan semua fase dan tugas lepas). Kurangi jumlahnya, lalu simpan lagi.`,
  START_DATE_REQUIRED: 'Tanggal mulai wajib diisi untuk memakai template ini.',
  BAD_START_DATE: 'Tanggal mulai tidak valid. Pilih tanggal dari kalender, lalu coba lagi.',
} as const;

const invalid = (error: string): WriteResult<never> => ({ ok: false, code: 'VALIDATION', error });

/** The first problem found in `phases`/`looseTasks`, or null (mirrors `project.service.ts`'s own check). */
function templateIssue(
  phases: ReadonlyArray<TemplatePhaseInput> = [],
  looseTasks: ReadonlyArray<TemplateTaskInput> = [],
): string | null {
  if (phases.length > PROJECT_DRAFT_PHASES_MAX) return TEMPLATE_WRITE_MESSAGES.TOO_MANY_PHASES;
  let totalTasks = looseTasks.length;
  for (const phase of phases) {
    if (!phase.name.trim()) return TEMPLATE_WRITE_MESSAGES.PHASE_NAME_REQUIRED;
    if (
      phase.startOffsetDays != null &&
      phase.endOffsetDays != null &&
      phase.endOffsetDays < phase.startOffsetDays
    ) {
      return TEMPLATE_WRITE_MESSAGES.PHASE_END_BEFORE_START;
    }
    totalTasks += phase.tasks?.length ?? 0;
    for (const t of phase.tasks ?? []) {
      if (!t.title.trim()) return TEMPLATE_WRITE_MESSAGES.TASK_TITLE_REQUIRED;
    }
  }
  for (const t of looseTasks) {
    if (!t.title.trim()) return TEMPLATE_WRITE_MESSAGES.TASK_TITLE_REQUIRED;
  }
  return totalTasks > PROJECT_DRAFT_TASKS_MAX ? TEMPLATE_WRITE_MESSAGES.TOO_MANY_TASKS : null;
}

/** Inserts `phases` (in order) and `looseTasks` for a template that has none yet (fresh or just cleared). */
async function insertPhasesAndTasks(
  tx: Tx,
  templateId: string,
  phases: ReadonlyArray<TemplatePhaseInput> = [],
  looseTasks: ReadonlyArray<TemplateTaskInput> = [],
): Promise<void> {
  const phaseIds: Array<string | null> = [];
  if (phases.length > 0) {
    const rows = await tx
      .insert(projectTemplatePhase)
      .values(
        phases.map((phase, position) => ({
          templateId,
          name: phase.name.trim(),
          description: phase.description?.trim() || null,
          position,
          startOffsetDays: phase.startOffsetDays ?? null,
          endOffsetDays: phase.endOffsetDays ?? null,
        })),
      )
      .returning({ id: projectTemplatePhase.id });
    phaseIds.push(...rows.map((r) => r.id));
  }

  const taskRows: (typeof projectTemplateTask.$inferInsert)[] = [];
  let position = 0;
  const pushTask = (t: TemplateTaskInput, templatePhaseId: string | null) =>
    taskRows.push({
      templateId,
      templatePhaseId,
      title: t.title.trim(),
      description: t.description?.trim() || null,
      priority: t.priority ?? null,
      kindName: t.kindName?.trim() || null,
      dueOffsetDays: t.dueOffsetDays ?? null,
      position: position++,
    });
  phases.forEach((phase, i) => {
    for (const t of phase.tasks ?? []) pushTask(t, phaseIds[i] ?? null);
  });
  for (const t of looseTasks) pushTask(t, null);
  if (taskRows.length > 0) await tx.insert(projectTemplateTask).values(taskRows);
}

/** Saves a new template with its phases and tasks, in one transaction. */
export async function createTemplate(
  p: Principal,
  input: SaveTemplateInput,
): Promise<WriteResult<{ id: string }>> {
  const allowed = canCreateTemplate(p);
  if (!allowed.ok) return { ok: false, code: allowed.code };
  const name = input.name.trim();
  if (!name) return invalid(TEMPLATE_WRITE_MESSAGES.NAME_REQUIRED);
  const issue = templateIssue(input.phases, input.looseTasks);
  if (issue) return invalid(issue);

  return inTx(async (tx) => {
    const [row] = await tx
      .insert(projectTemplate)
      .values({
        name,
        description: input.description?.trim() || null,
        source: input.source,
        createdBy: p.id,
      })
      .returning({ id: projectTemplate.id });
    if (!row) throw new Error(`Template insert returned no row for creator ${p.id}`);
    await insertPhasesAndTasks(tx, row.id, input.phases, input.looseTasks);
    return { ok: true, value: { id: row.id } };
  });
}

/** Replaces name/description/source and every phase/task of a template the caller owns (no per-item edit, plan §6). */
export async function updateTemplate(
  p: Principal,
  id: string,
  input: SaveTemplateInput,
): Promise<WriteResult<{ id: string }>> {
  const name = input.name.trim();
  if (!name) return invalid(TEMPLATE_WRITE_MESSAGES.NAME_REQUIRED);
  const issue = templateIssue(input.phases, input.looseTasks);
  if (issue) return invalid(issue);

  return inTx(async (tx) => {
    const [row] = await tx
      .select({ createdBy: projectTemplate.createdBy })
      .from(projectTemplate)
      .where(eq(projectTemplate.id, id))
      .for('update');
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const decision = canUseTemplate(p, row);
    if (!decision.ok) return { ok: false, code: decision.code };

    await tx
      .update(projectTemplate)
      .set({ name, description: input.description?.trim() || null, source: input.source })
      .where(eq(projectTemplate.id, id));
    // Replace-all (plan §6): a template's own phases/tasks have no other reader, so clearing and
    // reinserting them in the same transaction is simpler than diffing against the new list.
    await tx.delete(projectTemplateTask).where(eq(projectTemplateTask.templateId, id));
    await tx.delete(projectTemplatePhase).where(eq(projectTemplatePhase.templateId, id));
    await insertPhasesAndTasks(tx, id, input.phases, input.looseTasks);
    return { ok: true, value: { id } };
  });
}

/** Deletes a template the caller owns (and its phases/tasks, cascade); permanent, T2 in the UI (plan §9.3). */
export async function deleteTemplate(
  p: Principal,
  id: string,
): Promise<WriteResult<{ id: string }>> {
  return inTx(async (tx) => {
    const [row] = await tx
      .select({ createdBy: projectTemplate.createdBy })
      .from(projectTemplate)
      .where(eq(projectTemplate.id, id))
      .for('update');
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const decision = canUseTemplate(p, row);
    if (!decision.ok) return { ok: false, code: decision.code };
    await tx.delete(projectTemplate).where(eq(projectTemplate.id, id));
    return { ok: true, value: { id } };
  });
}

/** `t`'s offset converted to an absolute `CreateProjectTaskInput` against `startDate` (plan §5.4). */
function taskInputOf(t: TemplateTaskDto, startDate: string): CreateProjectTaskInput {
  return {
    title: t.title,
    description: t.description,
    priority: t.priority ?? undefined,
    kindName: t.kindName,
    dueDate: t.dueOffsetDays != null ? addDays(startDate, t.dueOffsetDays) : null,
  };
}

/** `phase`'s offsets converted to absolute dates against `startDate`; a missing start offset is day 0 (plan §5.3). */
function phaseInputOf(phase: TemplatePhaseDto, startDate: string): CreateProjectPhaseInput {
  return {
    name: phase.name,
    description: phase.description,
    startDate: addDays(startDate, phase.startOffsetDays ?? 0),
    endDate: phase.endOffsetDays != null ? addDays(startDate, phase.endOffsetDays) : null,
    tasks: phase.tasks.map((t) => taskInputOf(t, startDate)),
  };
}

/**
 * Instantiates a template the caller owns into a real project, through the same `createProject()`
 * the plain form and story-mode use (plan §5.3): template-mode only prepares its input.
 */
export async function useTemplate(
  p: Principal,
  id: string,
  input: UseTemplateInput,
  now: Date = new Date(),
): Promise<WriteResult<{ id: string }>> {
  const allowed = canCreateProject(p);
  if (!allowed.ok) return { ok: false, code: allowed.code };
  if (!input.startDate) return invalid(TEMPLATE_WRITE_MESSAGES.START_DATE_REQUIRED);
  if (!isCalendarDate(input.startDate)) return invalid(TEMPLATE_WRITE_MESSAGES.BAD_START_DATE);

  const detail = await getTemplateDetail(p, id);
  if (!detail) return { ok: false, code: 'NOT_FOUND' };

  const { startDate } = input;
  return createProject(
    p,
    {
      name: input.name?.trim() || detail.name,
      description: detail.description,
      startDate,
      leadId: input.leadId,
      priority: input.priority,
      members: input.members,
      phases: detail.phases.map((phase) => phaseInputOf(phase, startDate)),
      looseTasks: detail.looseTasks.map((t) => taskInputOf(t, startDate)),
    },
    now,
  );
}
