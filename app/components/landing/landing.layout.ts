/**
 * Layout constants the landing page needs but the design system does not name.
 *
 * `TYPE` in app/lib/theme-tokens.ts defines three steps (page 32, section 20, body) and no code
 * step, and the spacing scale names nothing between 8 and 12 — so the few values below live here,
 * once, instead of being retyped as inline `style` numbers in each section.
 */

/** Code blocks in the hero, architecture and quick-start sections. */
export const CODE_FONT_SIZE = 13;

/** Keeps an anchored section clear of the sticky header when jumped to via `#id`. */
export const SECTION_SCROLL_MARGIN = 80;

/** Right padding that keeps the quick-start code clear of the floating copy button (44 px). */
export const COPY_BUTTON_CLEARANCE = 44;
