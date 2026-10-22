/** Rules of the "Perpanjang tenggat" form, pure so the button's reason and the payload are testable. */
import type { ExtensionReasonCategory } from '@server/pm/enums';
import { EXTENSION_REASON_MAX } from '@server/project/project.limits';
import type { ExtendDeadlineInput } from '~/lib/project-deadline-api';
import type { QuickRange } from '../QuickDates';
import { EXTEND_COPY } from './summary.copy';

export type ExtendValues = {
  /** `YYYY-MM-DD` from the date field, null while empty. */
  newDueDate: string | null;
  category: ExtensionReasonCategory | null;
  reason: string;
};

export const EMPTY_EXTEND: ExtendValues = { newDueDate: null, category: null, reason: '' };

/** The three one-tap shortcuts, counted from the current due date. */
export const EXTEND_QUICK: readonly { range: QuickRange; label: string }[] = [
  { range: 'w1', label: EXTEND_COPY.quick.w1 },
  { range: 'w2', label: EXTEND_COPY.quick.w2 },
  { range: 'm1', label: EXTEND_COPY.quick.m1 },
];

/** Length as the server counts it (trimmed UTF-16 units), so a reason that passes here passes there. */
export const reasonLength = (reason: string): number => reason.trim().length;

/** `YYYY-MM-DD` compares correctly as text, so no Date (and no time zone) is involved. */
export const isLater = (candidate: string, current: string): boolean => candidate > current;

/** Why the submit button is off right now, or null when the form can be sent. Shown beside the button. */
export function extendBlocker(v: ExtendValues, currentDue: string): string | null {
  if (!v.newDueDate) return EXTEND_COPY.needDate;
  if (!isLater(v.newDueDate, currentDue)) return EXTEND_COPY.notLater;
  if (!v.category) return EXTEND_COPY.needCategory;
  const length = reasonLength(v.reason);
  if (length === 0) return EXTEND_COPY.needReason;
  if (length > EXTENSION_REASON_MAX) return EXTEND_COPY.tooLong(EXTENSION_REASON_MAX);
  return null;
}

/** The request body, or null while `extendBlocker` has something to say. */
export function toExtendInput(v: ExtendValues, currentDue: string): ExtendDeadlineInput | null {
  if (extendBlocker(v, currentDue) !== null || !v.newDueDate || !v.category) return null;
  return { newDueDate: v.newDueDate, reasonCategory: v.category, reason: v.reason.trim() };
}
