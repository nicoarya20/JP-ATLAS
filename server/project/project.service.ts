/**
 * Write side of projects (S1-03): create, edit details, change status and hand over the Lead.
 * Every write runs in one `inTx` and only through `tx`; permissions come from `server/access/*`.
 * No `audit()`: these are ordinary project changes, recorded in `project_activity` instead.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { canSetLead, type LeadDecision } from '../access/members.policy';
import { canCreateProject, canManageProject } from '../access/project.policy';
import type { Principal, ProjectSubject } from '../access/types';
// Single source of truth for "a project created with phases/tasks in one call" (story-mode and
// template-mode both funnel through this file, plan §4.9) — not duplicated as separate constants.
import { PROJECT_DRAFT_PHASES_MAX, PROJECT_DRAFT_TASKS_MAX } from '../ai/project-draft.limits';
import { isBanActive } from '../ban';
import {
  project,
  projectActivity,
  projectMember,
  projectPhase,
  task,
  taskKind,
  user,
} from '../db/schema';
import { CALENDAR_YEAR_MAX, CALENDAR_YEAR_MIN, isInCalendarRange } from '../metrics/dates';
import type { ProjectMemberRole, ProjectPriority, ProjectStatus } from '../pm/enums';
import type { PmCode } from '../pm/errors';
import { DEFAULT_TASK_KINDS, TASK_REVIEW_UI_ENABLED } from '../pm/limits';
import { inTx, type Tx } from '../pm/tx';
import { loadMembership } from './membership.query';
import { PROJECT_INITIAL_STATUSES } from './project.limits';

/** A write outcome; `error` refines the catalog message of `code` when the cause is specific. */
export type WriteResult<T> = { ok: true; value: T } | { ok: false; code: PmCode; error?: string };

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

export type CreateProjectInput = {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  /** Defaults to the creator; whoever it is becomes a manager. */
  leadId?: string;
  /** `YYYY-MM-DD` or null. */
  startDate?: string | null;
  dueDate?: string | null;
  members?: ReadonlyArray<{ userId: string; role: ProjectMemberRole }>;
  tasksNeedReviewDefault?: boolean;
  /**
   * Phases (with their own tasks) and loose tasks created together with the project, in the same
   * transaction (plan §4.9: story-mode and template-mode both build a project this way). Both
   * optional and backward compatible: omitting them creates a project exactly as before.
   */
  phases?: ReadonlyArray<CreateProjectPhaseInput>;
  looseTasks?: ReadonlyArray<CreateProjectTaskInput>;
};

/** Fields an edit may change; `undefined` keeps the stored value, `null` clears an optional one. */
export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
};

// User-facing Indonesian; each one says what to do next.
export const PROJECT_WRITE_MESSAGES = {
  NAME_REQUIRED: 'Nama proyek wajib diisi. Tulis nama proyeknya, lalu simpan lagi.',
  INITIAL_STATUS: 'Proyek baru hanya bisa berstatus Draf atau Berjalan. Pilih salah satunya.',
  REVIEW_UNAVAILABLE:
    'Pemeriksaan tugas belum tersedia. Matikan pilihan "Tugas baru perlu diperiksa", lalu simpan lagi.',
  BAD_DATE: 'Tanggal tidak valid. Pilih tanggal dari kalender, lalu simpan lagi.',
  DATE_OUT_OF_RANGE: `Tahun tanggal harus antara ${CALENDAR_YEAR_MIN} dan ${CALENDAR_YEAR_MAX}. Periksa tahunnya, lalu simpan lagi.`,
  DUE_BEFORE_START: 'Tenggat tidak boleh sebelum tanggal mulai. Ubah salah satu tanggalnya.',
  BAD_CANDIDATE:
    'Ada orang yang belum disetujui, sedang diblokir, atau tidak ditemukan. Hapus dari daftar, lalu simpan lagi.',
  PHASE_NAME_REQUIRED: 'Nama fase wajib diisi. Tulis namanya, lalu simpan lagi.',
  PHASE_END_BEFORE_START: 'Tanggal selesai fase tidak boleh sebelum tanggal mulainya.',
  TASK_TITLE_REQUIRED: 'Judul tugas wajib diisi. Tulis judulnya, lalu simpan lagi.',
  TOO_MANY_PHASES: `Paling banyak ${PROJECT_DRAFT_PHASES_MAX} fase sekaligus. Kurangi jumlahnya, lalu simpan lagi.`,
  TOO_MANY_TASKS: `Paling banyak ${PROJECT_DRAFT_TASKS_MAX} tugas sekaligus (gabungan semua fase dan tugas lepas). Kurangi jumlahnya, lalu simpan lagi.`,
} as const;

const invalid = (error: string): WriteResult<never> => ({ ok: false, code: 'VALIDATION', error });

/** Refused decision to result; a hidden project answers NOT_FOUND so it looks missing (D8). */
export function refused(d: Exclude<LeadDecision, { ok: true }>): WriteResult<never> {
  return { ok: false, code: d.code === 'NOT_VISIBLE' ? 'NOT_FOUND' : d.code };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar date such as `2026-02-28`; `2026-02-30` is false. */
export function isCalendarDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * The date problem of a start/due pair, or null; ISO strings compare correctly as text. The year
 * range is checked here and not in the route schema, so a mistyped year answers in Indonesian
 * instead of a shape error (PD-01).
 */
function dateProblem(start: string | null | undefined, due: string | null | undefined) {
  for (const d of [start, due]) {
    if (!d) continue;
    if (!isCalendarDate(d)) return PROJECT_WRITE_MESSAGES.BAD_DATE;
    if (!isInCalendarRange(d)) return PROJECT_WRITE_MESSAGES.DATE_OUT_OF_RANGE;
  }
  return start && due && due < start ? PROJECT_WRITE_MESSAGES.DUE_BEFORE_START : null;
}

/**
 * The first problem found in `phases`/`looseTasks`, or null; validated here (not only in the route
 * schema) so a bad phase/task date answers the same Indonesian message as the project's own dates
 * (PD-01), and so the cross-array task total is caught even though each array's own `maxItems` is
 * checked independently by the route schema.
 */
function phasesProblem(
  phases: ReadonlyArray<CreateProjectPhaseInput> = [],
  looseTasks: ReadonlyArray<CreateProjectTaskInput> = [],
): string | null {
  if (phases.length > PROJECT_DRAFT_PHASES_MAX) return PROJECT_WRITE_MESSAGES.TOO_MANY_PHASES;
  const taskProblem = (t: CreateProjectTaskInput): string | null => {
    if (!t.title.trim()) return PROJECT_WRITE_MESSAGES.TASK_TITLE_REQUIRED;
    if (!t.dueDate) return null;
    if (!isCalendarDate(t.dueDate)) return PROJECT_WRITE_MESSAGES.BAD_DATE;
    return isInCalendarRange(t.dueDate) ? null : PROJECT_WRITE_MESSAGES.DATE_OUT_OF_RANGE;
  };
  let totalTasks = looseTasks.length;
  for (const phase of phases) {
    if (!phase.name.trim()) return PROJECT_WRITE_MESSAGES.PHASE_NAME_REQUIRED;
    const dates = dateProblem(phase.startDate, phase.endDate);
    if (dates) {
      return dates === PROJECT_WRITE_MESSAGES.DUE_BEFORE_START
        ? PROJECT_WRITE_MESSAGES.PHASE_END_BEFORE_START
        : dates;
    }
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
  return totalTasks > PROJECT_DRAFT_TASKS_MAX ? PROJECT_WRITE_MESSAGES.TOO_MANY_TASKS : null;
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

/** Member rows of a new project: duplicates dropped (first wins), the creator and the Lead forced to manager. */
function memberRoles(creatorId: string, leadId: string, input: CreateProjectInput) {
  const roles = new Map<string, ProjectMemberRole>();
  for (const m of input.members ?? []) if (!roles.has(m.userId)) roles.set(m.userId, m.role);
  roles.set(creatorId, 'manager');
  roles.set(leadId, 'manager');
  return roles;
}

/**
 * Creates a project with its members, the three default task kinds and a `created` activity,
 * all in one transaction: a bad member leaves no project row behind.
 */
export async function createProject(
  p: Principal,
  input: CreateProjectInput,
  now: Date = new Date(),
): Promise<WriteResult<{ id: string }>> {
  const allowed = canCreateProject(p);
  if (!allowed.ok) return { ok: false, code: allowed.code };
  const name = input.name.trim();
  if (!name) return invalid(PROJECT_WRITE_MESSAGES.NAME_REQUIRED);
  const status = input.status ?? 'draft';
  if (!(PROJECT_INITIAL_STATUSES as readonly string[]).includes(status)) {
    return invalid(PROJECT_WRITE_MESSAGES.INITIAL_STATUS);
  }
  // M25: `needs_review` stays off until reviewing ships, or tasks would wait on nobody.
  if (input.tasksNeedReviewDefault && !TASK_REVIEW_UI_ENABLED) {
    return invalid(PROJECT_WRITE_MESSAGES.REVIEW_UNAVAILABLE);
  }
  const dates = dateProblem(input.startDate, input.dueDate);
  if (dates) return invalid(dates);
  const phasesIssue = phasesProblem(input.phases, input.looseTasks);
  if (phasesIssue) return invalid(phasesIssue);

  const leadId = input.leadId ?? p.id;
  const roles = memberRoles(p.id, leadId, input);

  return inTx(async (tx) => {
    const people = await tx
      .select({
        id: user.id,
        name: user.name,
        approvalStatus: user.approvalStatus,
        banned: user.banned,
        banExpires: user.banExpires,
      })
      .from(user)
      .where(inArray(user.id, [...roles.keys()]));
    const usable = new Set(
      people
        .filter(
          (u) =>
            u.id === p.id || (u.approvalStatus === 'approved' && !isBanActive(u, now.getTime())),
        )
        .map((u) => u.id),
    );
    if ([...roles.keys()].some((id) => !usable.has(id))) {
      return invalid(PROJECT_WRITE_MESSAGES.BAD_CANDIDATE);
    }

    const [row] = await tx
      .insert(project)
      .values({
        name,
        description: input.description?.trim() || null,
        status,
        priority: input.priority ?? 'medium',
        leadId,
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        tasksNeedReviewDefault: false,
        createdBy: p.id,
      })
      .returning({ id: project.id });
    if (!row) throw new Error(`Project insert returned no row for creator ${p.id}`);
    await tx
      .insert(projectMember)
      .values(
        [...roles].map(([userId, role]) => ({ projectId: row.id, userId, role, addedBy: p.id })),
      );
    const kindRows = await tx
      .insert(taskKind)
      .values(DEFAULT_TASK_KINDS.map((k, position) => ({ projectId: row.id, ...k, position })))
      .returning({ id: taskKind.id, name: taskKind.name });
    // DEFAULT_TASK_KINDS[0] is "Tugas" (plan §4.9 step 3/5): the fallback kind for an unmatched or absent kindName.
    const fallbackKindId = kindRows.find((k) => k.name === DEFAULT_TASK_KINDS[0]?.name)?.id;
    if (!fallbackKindId)
      throw new Error(`"Tugas" kind missing right after creating project ${row.id}`);

    const phaseIds: Array<string | null> = [];
    if (input.phases && input.phases.length > 0) {
      const phaseRows = await tx
        .insert(projectPhase)
        .values(
          input.phases.map((phase, position) => ({
            projectId: row.id,
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
        projectId: row.id,
        phaseId,
        kindId: resolveKindId(t.kindName, kindRows, fallbackKindId),
        title: t.title.trim(),
        description: t.description?.trim() || null,
        priority: t.priority ?? 'medium',
        createdBy: p.id,
        dueDate: t.dueDate ?? null,
        lastActivityAt: now,
      });
    input.phases?.forEach((phase, i) => {
      for (const t of phase.tasks ?? []) pushTask(t, phaseIds[i] ?? null);
    });
    for (const t of input.looseTasks ?? []) pushTask(t, null);
    if (taskRows.length > 0) await tx.insert(task).values(taskRows);

    const actorName = people.find((u) => u.id === p.id)?.name ?? null;
    await tx.insert(projectActivity).values({
      projectId: row.id,
      actorId: p.id,
      actorName,
      action: 'created',
      payload: { status },
    });
    return { ok: true as const, value: { id: row.id } };
  });
}

export type LockedProject = ProjectSubject & { startDate: string | null; dueDate: string | null };

/** Locks one project row (trashed included: the policy reports the Trash itself) for the rest of `tx`. */
export async function lockProject(tx: Tx, id: string): Promise<LockedProject | undefined> {
  const [row] = await tx
    .select({
      id: project.id,
      status: project.status,
      leadId: project.leadId,
      deletedAt: project.deletedAt,
      deletedBy: project.deletedBy,
      startDate: project.startDate,
      dueDate: project.dueDate,
    })
    .from(project)
    .where(eq(project.id, id))
    .for('update');
  return row;
}

/** Locks the project and checks the caller may manage it; `run` gets the row and writes in the same `tx`. */
async function managed<T>(
  p: Principal,
  projectId: string,
  run: (tx: Tx, row: LockedProject) => Promise<WriteResult<T>>,
): Promise<WriteResult<T>> {
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const membership = (await loadMembership(p.id, [projectId], tx)).get(projectId) ?? null;
    const decision = canManageProject(p, row, membership);
    if (!decision.ok) return refused(decision);
    return run(tx, row);
  });
}

/** Appends one `project_activity` row in `tx`, naming the actor as they are called now. */
export async function logActivity(
  tx: Tx,
  p: Principal,
  projectId: string,
  action: string,
  payload: object,
) {
  const [me] = await tx.select({ name: user.name }).from(user).where(eq(user.id, p.id));
  await tx
    .insert(projectActivity)
    .values({ projectId, actorId: p.id, actorName: me?.name ?? null, action, payload });
}

/**
 * Edits name, description, priority and dates. The due date may change directly in S1 (KB-3);
 * `original_due_date` stays empty until deadline extensions arrive in S5.
 */
export function updateProject(
  p: Principal,
  projectId: string,
  input: UpdateProjectInput,
): Promise<WriteResult<{ id: string }>> {
  return managed(p, projectId, async (tx, row) => {
    const patch: Partial<typeof project.$inferInsert> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) return invalid(PROJECT_WRITE_MESSAGES.NAME_REQUIRED);
      patch.name = name;
    }
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.startDate !== undefined) patch.startDate = input.startDate;
    if (input.dueDate !== undefined) patch.dueDate = input.dueDate;
    const dates = dateProblem(
      input.startDate === undefined ? row.startDate : input.startDate,
      input.dueDate === undefined ? row.dueDate : input.dueDate,
    );
    if (dates) return invalid(dates);
    const fields = Object.keys(patch);
    if (fields.length === 0) return { ok: true, value: { id: row.id } };
    await tx.update(project).set(patch).where(eq(project.id, row.id));
    await logActivity(tx, p, row.id, 'updated', { fields });
    return { ok: true, value: { id: row.id } };
  });
}

/** Moves the project to any of the five statuses (KB-12); `completed_at` follows the `completed` status. */
export function setProjectStatus(
  p: Principal,
  projectId: string,
  next: ProjectStatus,
  now: Date = new Date(),
): Promise<WriteResult<{ id: string }>> {
  return managed(p, projectId, async (tx, row) => {
    if (row.status === next) return { ok: true, value: { id: row.id } };
    await tx
      .update(project)
      .set({ status: next, completedAt: next === 'completed' ? now : null })
      .where(eq(project.id, row.id));
    await logActivity(tx, p, row.id, 'status_changed', { from: row.status, to: next });
    return { ok: true, value: { id: row.id } };
  });
}

/** Makes `nextLeadId` the Lead; they must already be one of the project's managers. */
export function setProjectLead(
  p: Principal,
  projectId: string,
  nextLeadId: string,
): Promise<WriteResult<{ id: string }>> {
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row) return { ok: false, code: 'NOT_FOUND' };
    const membership = (await loadMembership(p.id, [projectId], tx)).get(projectId) ?? null;
    const managers = await tx
      .select({ userId: projectMember.userId })
      .from(projectMember)
      .where(and(eq(projectMember.projectId, projectId), eq(projectMember.role, 'manager')));
    const ids = managers.map((m) => m.userId);
    const decision = canSetLead(p, row, membership, nextLeadId, ids);
    if (!decision.ok) return refused(decision);
    if (row.leadId === nextLeadId) return { ok: true, value: { id: row.id } };
    await tx.update(project).set({ leadId: nextLeadId }).where(eq(project.id, row.id));
    await logActivity(tx, p, row.id, 'lead_changed', { from: row.leadId, to: nextLeadId });
    return { ok: true, value: { id: row.id } };
  });
}
