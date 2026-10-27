import type { CSSProperties } from 'react';

/**
 * Text that must break rather than widen its column. Mantine has no `overflow-wrap` style prop
 * (docs/ui-pola.md §3), so these stay `style` objects — gathered here so the reason is written
 * once instead of at 20 call sites.
 *
 * Use them only where a long unbroken string can appear (an email, a URL, a pasted token) in text
 * the reader came for in full: detail pages, titles and free-text bodies. In a list row or a card,
 * `truncate` or `lineClamp` instead, so every row keeps the same height (K-5).
 */
export const WRAP_ANYWHERE: CSSProperties = { overflowWrap: 'anywhere' };

/** Same, for text whose own line breaks must survive: a description, an agenda, a comment. */
export const WRAP_PRE_ANYWHERE: CSSProperties = {
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};
