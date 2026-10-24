import { TYPE } from './tokens';

/*
 * Mobile type scale in px (Uniwind's rem base is 16, but px keeps sizes literal on every platform). Sizes follow the
 * Atlas handoff (page 26 on phones, section 20, body 16 / 1.5, table 14, metadata 12, metric 32) under the prototype's
 * names (t-title2, t-headline, t-subhead, t-footnote). Line heights are absolute because React Native needs points.
 */

const TIGHT = 1.2;
const SNUG = 1.3;
const BODY = Number(TYPE.bodyLeading);

const step = (size: number, leading: number) => ({ size, leading: Math.round(size * leading) });

/** `text-<name>` utilities: font size and line height in px. */
export const TEXT_SCALE = {
  page: step(TYPE.pageMobile, TIGHT),
  section: step(TYPE.section, TIGHT),
  headline: step(16, SNUG),
  body: step(16, BODY),
  subhead: step(14, BODY),
  footnote: step(12, BODY),
  metric: step(32, TIGHT),
} as const;

/** Tailwind weight utility → the static Manrope instance that draws it (assets/fonts, Atlas 650 → SemiBold). */
export const WEIGHT_FONTS = {
  normal: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
} as const;
