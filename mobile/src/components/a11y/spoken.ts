// One accessible name for a card or row that shows several facts: React Native reads each Text on its own, so the
// pressable carries the visible parts joined by commas and the parts themselves stay out of the reading order.

/** The visible parts as one spoken name, skipping the empty ones: "#12 Fix login, Website, High, …". */
export const spoken = (...parts: readonly (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(', ');
