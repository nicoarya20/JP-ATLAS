/* Words added in the Projects QA pass (W4e), not in the prototype: why a primary is off, accessible names without the
   visible "+" or "→", and what the screen-reader labels of the cards and the phase steps say. */

/** Shown under the field (and read as the disabled primary's hint) while the form can't be sent. */
export const WHY = {
  name: 'Enter a project name.',
  next: 'Pick a new deadline.',
  reason: 'Enter a reason.',
  dueBeforeStart: 'The deadline must be on or after the start date.',
} as const;

/** Accessible names of the buttons whose visible text carries a symbol. */
export const NAMES = {
  newTask: 'New task',
  addMember: 'Add member',
  view: 'View',
  allPhases: 'See all phases',
} as const;

import type { PhaseStatusWire } from '@/data/projects.wire';

/** One phase step of the Overview, read as "<name>, done". */
export const STEP_STATE = {
  done: 'done',
  in_progress: 'current',
  not_started: 'upcoming',
} as const satisfies Record<PhaseStatusWire, string>;

export const ADDED = {
  leadStays: "The Lead stays Manager and can't be removed.",
  progress: (percent: string) => `Progress ${percent}`,
} as const;
