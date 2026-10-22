import { createTheme, DEFAULT_THEME, type MantineBreakpointsValues, rem } from '@mantine/core';
import { themeComponents } from './theme-components';
import { STATUS_COLORS } from './theme-palette';
import { FONT_FAMILY, RADIUS, SPACING, TYPE } from './theme-tokens';

const BREAKPOINT_PRECISION = 4;

/** Multiplies every default breakpoint (em) by `scale` so layout follows effective width (X1 D2). */
export function scaleBreakpoints(scale: number): MantineBreakpointsValues {
  const scaled = Object.entries(DEFAULT_THEME.breakpoints).map(([key, value]) => {
    const em = Number((Number.parseFloat(value) * scale).toFixed(BREAKPOINT_PRECISION));
    return [key, `${em}em`];
  });
  return Object.fromEntries(scaled) as MantineBreakpointsValues;
}

/**
 * Builds the accessible Mantine theme for one text scale (1 = Normal). `theme.scale` is the only
 * scaling mechanism: no manual `--mantine-scale`, no `html{font-size}`, no CSS `zoom` (X1 D2).
 */
export function buildTheme(scale: number) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError(`Text scale must be a positive finite number, received ${scale}`);
  }
  return createTheme({
    scale,
    breakpoints: scaleBreakpoints(scale),
    // Violet is the interaction colour; the lime primary action is set on Button (theme-components.ts).
    primaryColor: 'atlas',
    // One shade drives every filled colour; shade 8 is the first that reaches 4.5:1 with white text.
    primaryShade: { light: 8, dark: 8 },
    colors: STATUS_COLORS,
    fontFamily: FONT_FAMILY,
    lineHeights: { md: TYPE.bodyLeading },
    // Handoff scale: control 10, card 14 (md), modal 16 (lg), identity 20 (xl).
    defaultRadius: RADIUS.control,
    radius: {
      xs: rem(4),
      sm: rem(8),
      md: rem(RADIUS.card),
      lg: rem(RADIUS.modal),
      xl: rem(RADIUS.identity),
    },
    spacing: {
      xs: rem(SPACING.xs),
      sm: rem(SPACING.sm),
      md: rem(SPACING.md),
      lg: rem(SPACING.lg),
      xl: rem(SPACING.xl),
    },
    headings: {
      fontFamily: FONT_FAMILY,
      fontWeight: '600',
      sizes: {
        // Page title: 32 px, 26 px on narrow screens (clamp, scaled with the text size).
        h1: {
          fontSize: `clamp(${rem(TYPE.pageMobile)}, 4vw, ${rem(TYPE.page)})`,
          lineHeight: '1.25',
        },
        h2: { fontSize: rem(26), lineHeight: '1.3' },
        // Section title: 20 px.
        h3: { fontSize: rem(TYPE.section), lineHeight: '1.3' },
      },
    },
    respectReducedMotion: true,
    components: themeComponents,
  });
}
