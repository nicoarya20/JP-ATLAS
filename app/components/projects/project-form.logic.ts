// DUMMY: nilai awal dan validasi formulir Proyek; validasi sebenarnya ada di server saat S1 dibuat.
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import { FORM_COPY } from './project-form.copy';
import { addDays } from './projects.gantt';
import type { ProjectInput } from './projects.logic';

export const NAME_MAX = 100;

/** Quick due dates counted from the start date; the labels are what the buttons say. */
export const QUICK_DUE = [
  { label: '1 minggu', days: 7 },
  { label: '2 minggu', days: 14 },
  { label: '1 bulan', days: 30 },
  { label: '3 bulan', days: 90 },
] as const;

export type FormErrors = Partial<Record<'name' | 'due', string>>;

/** A new project starts today and is due in a month, so only the name has to be typed. */
export function emptyValues(creator: string): ProjectInput {
  return {
    name: '',
    description: '',
    status: 'active',
    priority: 'medium',
    lead: creator,
    start: DUMMY_TODAY,
    due: addDays(DUMMY_TODAY, 30),
    members: [],
  };
}

export function validate(v: ProjectInput): FormErrors {
  const errors: FormErrors = {};
  const name = v.name.trim();
  if (!name) errors.name = FORM_COPY.nameRequired;
  else if (name.length > NAME_MAX) errors.name = FORM_COPY.nameTooLong(NAME_MAX);
  if (v.start && v.due && v.due < v.start) errors.due = FORM_COPY.dueBeforeStart;
  return errors;
}

/** Trims what the person typed before it is stored. */
export const clean = (v: ProjectInput): ProjectInput => ({
  ...v,
  name: v.name.trim(),
  description: v.description.trim(),
});
