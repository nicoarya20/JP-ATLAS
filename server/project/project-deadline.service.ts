/**
 * Deadline extensions (S5a-03, L5-04). One `inTx` that locks the project row first, so two
 * extensions at once run one after the other and the second sees the date the first wrote.
 * Recorded in `project_activity`; no `audit()`, like the rest of the ordinary project writes.
 */
import { eq, sql } from 'drizzle-orm';
import type { Principal } from '../access/types';
import { project, projectDeadlineExtension } from '../db/schema';
import type { ExtensionReasonCategory } from '../pm/enums';
import { EXTENSION_REASON_MAX } from './project.limits';
import { isCalendarDate, logActivity } from './project.service';
import {
  checkReason,
  type DeadlineResult,
  invalid,
  managed,
  nameOf,
  refuse,
} from './project-deadline.guard';
import { countExtensions } from './project-deadline.query';
import { type DeadlineExtensionDto, toDeadlineExtensionDto } from './project-plan.dto';

export type ExtendInput = {
  /** `YYYY-MM-DD`, strictly after the current due date. */
  newDueDate: string;
  reasonCategory: ExtensionReasonCategory;
  reason: string;
};

export type ExtendOutcome = {
  project: { dueDate: string; originalDueDate: string; extensionCount: number };
  extension: DeadlineExtensionDto;
};

const BAD_DATE = 'Tanggal tidak valid. Pilih tanggal dari kalender, lalu simpan lagi.';
const CLOSED_STATUSES: readonly string[] = ['completed', 'canceled'];

/**
 * Moves the due date later (never earlier), remembers the first baseline in `original_due_date`,
 * writes the history row and the activity line. Allowed in every status except completed/canceled.
 */
export function extendDeadline(
  p: Principal,
  projectId: string,
  input: ExtendInput,
): Promise<DeadlineResult<ExtendOutcome>> {
  return managed(p, projectId, async (tx, row) => {
    const checked = checkReason(input.reason, EXTENSION_REASON_MAX);
    if (!('reason' in checked)) return checked;
    if (!isCalendarDate(input.newDueDate)) return invalid(BAD_DATE);
    if (CLOSED_STATUSES.includes(row.status)) return refuse('PROJECT_CLOSED');
    if (!row.dueDate) return refuse('NO_DEADLINE');
    // ISO dates compare correctly as text.
    if (input.newDueDate <= row.dueDate) return refuse('NOT_LATER');

    // The first extension fixes the baseline; SET reads the old row, so the coalesce sees the old due date.
    const [updated] = await tx
      .update(project)
      .set({
        dueDate: input.newDueDate,
        originalDueDate: sql`coalesce(${project.originalDueDate}, ${project.dueDate})`,
      })
      .where(eq(project.id, row.id))
      .returning({ dueDate: project.dueDate, originalDueDate: project.originalDueDate });
    const [ext] = await tx
      .insert(projectDeadlineExtension)
      .values({
        projectId: row.id,
        oldDueDate: row.dueDate,
        newDueDate: input.newDueDate,
        reasonCategory: input.reasonCategory,
        reason: checked.reason,
        extendedBy: p.id,
      })
      .returning();
    if (!updated?.dueDate || !updated.originalDueDate || !ext) {
      throw new Error(`Deadline extension wrote no row for project ${row.id}`);
    }
    await logActivity(tx, p, row.id, 'deadline.extended', {
      from: row.dueDate,
      to: input.newDueDate,
      category: input.reasonCategory,
    });
    return {
      ok: true,
      value: {
        project: {
          dueDate: updated.dueDate,
          originalDueDate: updated.originalDueDate,
          extensionCount: await countExtensions(tx, row.id),
        },
        extension: toDeadlineExtensionDto({ ...ext, extendedByName: await nameOf(tx, p.id) }),
      },
    };
  });
}
