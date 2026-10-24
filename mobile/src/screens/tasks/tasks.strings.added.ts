/* Words the port adds beyond the prototype (W1e QA): names only screen readers hear, and the few messages the project's
   UX rules ask for (a reason next to a disabled button, a confirm before deleting a tag). */

/** One spoken name from the visible parts of a card, skipping the empty ones: "#12 Fix login, Website, High, …". */
export const spoken = (...parts: readonly (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(', ');

/** New task's Just write ✦ / Fill form segments, without the ✦. */
export const MODE_NAMES = ['Just write', 'Fill form'] as const;

export const SPOKEN = {
  steps: (done: string) => `Steps ${done}`,
  /** A card's named move: the held card alone, or the picked group it belongs to (as the gesture moves it). */
  moveTo: (n: number, status: string) =>
    n > 1 ? `Move ${n} tasks to ${status}` : `Move to ${status}`,
  /** The radial option of the status the task already has (drawn "Now"). */
  current: (status: string) => `${status}, current status`,
  selectIn: (status: string) => `Select tasks in ${status}`,
  stopIn: (status: string) => `Stop selecting in ${status}`,
  addTo: (status: string) => `Add task to ${status}`,
  selectTask: (no: number, title: string) => `Select #${no} ${title}`,
  include: (title: string) => `Include ${title}`,
  noTags: 'No tags',
  scope: 'Scope',
  view: 'View',
  source: 'Source',
  /** The buttons whose visible text starts with "+" or ends with "✦". */
  compose: 'Compose',
  addStep: 'Add step',
  attach: 'Attach evidence',
  addType: 'Add type',
} as const;

/** Why a primary button is disabled, shown once the field was touched and read as the button's hint. */
export const MISSING = {
  title: 'Enter a title to save.',
  reason: 'Enter a reason to return the task.',
  why: 'Pick why to cancel the task.',
  note: 'Add a note to cancel for Other.',
} as const;

export const DELETE_TAG = {
  title: (tag: string) => `Delete tag ${tag}?`,
  message: 'Tasks keep their other tags. This cannot be undone.',
  confirm: 'Delete tag',
} as const;
