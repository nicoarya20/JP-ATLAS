/**
 * Shared write plumbing of the project plan (S5a-02): the manager gate every phase and milestone write
 * goes through, the result type, the user-facing messages and the small validators both services use.
 * Same shape as `managed()` in `project.service.ts`, plus the plan's own limit codes.
 */
import { and, eq } from 'drizzle-orm';
import { canManageProject } from '../access/project.policy';
import type { Principal } from '../access/types';
import { projectPhase } from '../db/schema';
import type { PmCode } from '../pm/errors';
import { inTx, type Tx } from '../pm/tx';
import { loadMembership } from './membership.query';
import { isCalendarDate, type LockedProject, lockProject, refused } from './project.service';

/**
 * Limit codes of the plan. They live here, not in the shared `pm/errors.ts` catalog, so the plan
 * routes can ship without touching that file; the router answers them as 422 `{ error, code }`.
 */
export const PLAN_LIMIT_CODES = ['PHASE_LIMIT', 'MILESTONE_LIMIT'] as const;
export type PlanLimitCode = (typeof PLAN_LIMIT_CODES)[number];

export type PlanResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: PmCode | PlanLimitCode; error?: string };

export const isPlanLimitCode = (code: string): code is PlanLimitCode =>
  (PLAN_LIMIT_CODES as readonly string[]).includes(code);

// User-facing Indonesian; each one says what to do next.
export const PLAN_MESSAGES = {
  PHASE_NAME_REQUIRED: 'Nama tahapan wajib diisi. Tulis namanya, lalu simpan lagi.',
  PHASE_NAME_TOO_LONG: (max: number) =>
    `Nama tahapan terlalu panjang (paling banyak ${max} huruf). Persingkat, lalu simpan lagi.`,
  PHASE_LIMIT: (max: number) =>
    `Satu proyek paling banyak punya ${max} tahapan. Hapus tahapan yang tidak dipakai, lalu coba lagi.`,
  PHASE_REORDER:
    'Urutan tahapan tidak lengkap atau sudah berubah. Muat ulang halaman, lalu atur urutannya lagi.',
  PHASE_MISSING: 'Tahapan tidak ditemukan di proyek ini. Pilih tahapan lain.',
  MILESTONE_TITLE_REQUIRED: 'Judul milestone wajib diisi. Tulis judulnya, lalu simpan lagi.',
  MILESTONE_TITLE_TOO_LONG: (max: number) =>
    `Judul milestone terlalu panjang (paling banyak ${max} huruf). Persingkat, lalu simpan lagi.`,
  MILESTONE_LIMIT: (max: number) =>
    `Satu proyek paling banyak punya ${max} milestone. Hapus milestone yang tidak dipakai, lalu coba lagi.`,
  DESCRIPTION_TOO_LONG: (max: number) =>
    `Keterangan terlalu panjang (paling banyak ${max} huruf). Persingkat, lalu simpan lagi.`,
  BAD_DATE: 'Tanggal tidak valid. Pilih tanggal dari kalender, lalu simpan lagi.',
  END_BEFORE_START: 'Tanggal selesai tidak boleh sebelum tanggal mulai. Ubah salah satunya.',
} as const;

export const invalid = (error: string): PlanResult<never> => ({
  ok: false,
  code: 'VALIDATION',
  error,
});

/**
 * Locks the project and checks the caller may manage it; `run` writes in the same `tx`. The row lock
 * is also what makes the "at most N" counts safe: two writers of one project run one after the other.
 * A trashed project answers NOT_FOUND (the plan is frozen until it is restored), like a hidden one.
 */
export function managedPlan<T>(
  p: Principal,
  projectId: string,
  run: (tx: Tx, row: LockedProject) => Promise<PlanResult<T>>,
): Promise<PlanResult<T>> {
  return inTx(async (tx) => {
    const row = await lockProject(tx, projectId);
    if (!row || row.deletedAt) return { ok: false, code: 'NOT_FOUND' };
    const membership = (await loadMembership(p.id, [projectId], tx)).get(projectId) ?? null;
    const decision = canManageProject(p, row, membership);
    if (!decision.ok) return refused(decision);
    return run(tx, row);
  });
}

/** The date problem of a start/end pair, or null; ISO strings compare correctly as text. */
export function rangeProblem(start: string | null | undefined, end: string | null | undefined) {
  for (const d of [start, end]) if (d && !isCalendarDate(d)) return PLAN_MESSAGES.BAD_DATE;
  return start && end && end < start ? PLAN_MESSAGES.END_BEFORE_START : null;
}

/** Message when the trimmed `raw` is longer than `max`, else null. */
export function lengthProblem(raw: string | null | undefined, max: number): string | null {
  return raw && raw.trim().length > max ? PLAN_MESSAGES.DESCRIPTION_TOO_LONG(max) : null;
}

/** Trimmed text, with empty text stored as null. */
export const cleanOptional = (raw: string | null | undefined): string | null => raw?.trim() || null;

/**
 * True when the phase exists in this project; another project's phase looks the same as a missing one.
 * The row is read FOR SHARE so a phase being deleted at the same moment cannot be assigned from under it.
 */
export async function phaseInProject(tx: Tx, projectId: string, phaseId: string): Promise<boolean> {
  const [row] = await tx
    .select({ id: projectPhase.id })
    .from(projectPhase)
    .where(and(eq(projectPhase.id, phaseId), eq(projectPhase.projectId, projectId)))
    .for('share');
  return Boolean(row);
}
