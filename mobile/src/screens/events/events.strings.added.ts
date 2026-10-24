/* Words the port adds beyond the prototype: names only screen readers hear, and the few messages the project's UX
   rules ask for (a reason next to a disabled Save, a search-only no-match). */

/** One spoken name from the visible parts of a card, skipping the empty ones: "Sprint review, Fri, Oct 23, …". */
export const spoken = (...parts: readonly (string | null | undefined)[]) =>
  parts.filter(Boolean).join(', ');

export const SPOKEN = {
  /** The Month / Week pick inside the Calendar tab. */
  calendarView: 'Calendar view',
  /** The archive sheet's way to Cancel, told apart from the sheet's own Cancel (close). */
  cancelInstead: 'Cancel this event instead',
  /** A draft task's button with the task it acts on: "Remove Update the brief". */
  draftAction: (action: string, title: string) => `${action} ${title}`,
} as const;

export const ADDED = {
  /** The list narrowed by the search text alone. */
  noSearchMatch: 'No events match this search.',
  /** Title left empty after it was touched; Save stays disabled until it is filled. */
  titleMissing: 'Enter a title.',
} as const;
