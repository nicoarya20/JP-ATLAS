/* Words added in the Projects QA pass (W4e) and in Phase 2, not in the prototype: why a primary is off, accessible
   names without the visible "+" or "→", and the words the server-backed screens needed (paging, honest counts, and the
   one line a control disabled by the server gets). */

/** Shown under the field (and read as the disabled primary's hint) while the form can't be sent. */
export const WHY = {
  name: 'Enter a project name.',
  template: 'Choose a template.',
  story: 'Write your story first.',
  next: 'Pick a new deadline.',
  reason: 'Enter a reason.',
  /** Save sends only what changed, so with nothing changed there is nothing to send. */
  unchanged: 'Change something first.',
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
  leadStays: "The Lead stays Manager and can't be removed.",
  progress: (percent: string) => `Progress ${percent}`,
  /** Asks the server for the next page; the lists here are paged, not loaded whole. */
  more: 'Load more',
  /** A project in Archive took its tasks along, so the tab says where they went. */
  archivedTasks: 'This project is in Archive, and its tasks went with it.',
} as const;
