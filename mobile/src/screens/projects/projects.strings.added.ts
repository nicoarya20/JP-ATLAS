/* Words added in the Projects QA pass (W4e), not in the prototype: why a primary is off, accessible names without the
   visible "+" or "→", and what the screen-reader labels of the cards and the phase steps say. */

/** Shown under the field (and read as the disabled primary's hint) while the form can't be sent. */
export const WHY = {
  name: 'Enter a project name.',
  nameTaken: 'A project with this name already exists.',
  template: 'Choose a template.',
  story: 'Write your story first.',
  next: 'Pick a new deadline.',
  reason: 'Enter a reason.',
} as const;

/** Accessible names of the buttons whose visible text carries a symbol. */
export const NAMES = {
  newTask: 'New task',
  addPhase: 'Add phase',
  addMilestone: (phase: string) => `Add milestone to ${phase}`,
  addMember: 'Add member',
  choose: (way: string) => `Choose: ${way}`,
  view: 'View',
  allPhases: 'See all phases',
} as const;

import type { PhaseState } from '@/data/sample/projects.extra';

/** One phase step of the Overview, read as "<name>, done". */
export const STEP_STATE = {
  Done: 'done',
  'In progress': 'current',
  'Not started': 'upcoming',
} as const satisfies Record<PhaseState, string>;

export const ADDED = {
  archivedTasks: 'Tasks are in Archive with the project.',
  leadStays: "The Lead stays Manager and can't be removed.",
  members: (n: number) => `${n} member${n === 1 ? '' : 's'}`,
  progress: (percent: string) => `Progress ${percent}`,
} as const;
