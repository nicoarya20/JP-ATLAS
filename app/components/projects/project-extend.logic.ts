// DUMMY: validasi permintaan perpanjang tenggat; aturan sebenarnya (`NOT_LATER`) ada di server saat S5 dibuat.
import { DETAIL_COPY } from './project-detail.copy';
import { addDays } from './projects.gantt';

export type ExtendErrors = Partial<Record<'due' | 'category' | 'note', string>>;
type Request = { currentDue: string; due: string | null; category: string | null; note: string };

/** The earliest date the new due date may be: the day after the current one. */
export const earliestDue = (currentDue: string) => addDays(currentDue, 1);

export function validateExtension({ currentDue, due, category, note }: Request): ExtendErrors {
  const errors: ExtendErrors = {};
  if (!due || due <= currentDue) errors.due = DETAIL_COPY.newDueAfter(currentDue);
  const reason = DETAIL_COPY.reasons.find((r) => r.value === category);
  if (!reason) errors.category = DETAIL_COPY.reasonPick;
  else if ('requireNote' in reason && reason.requireNote && !note.trim())
    errors.note = DETAIL_COPY.noteRequired;
  return errors;
}

/** What is written on the activity line: the chosen reason, then the note when there is one. */
export function reasonText(category: string | null, note: string): string {
  const label = DETAIL_COPY.reasons.find((r) => r.value === category)?.label ?? '';
  const extra = note.trim();
  return extra ? `${label}: ${extra}` : label;
}
