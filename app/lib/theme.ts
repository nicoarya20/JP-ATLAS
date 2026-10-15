import { createTheme, DEFAULT_THEME, type MantineBreakpointsValues } from '@mantine/core';
import { themeComponents } from './theme-components';
import { STATUS_COLORS } from './theme-palette';

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
    primaryColor: 'blue',
    // One shade drives every filled colour; shade 8 is the first that reaches 4.5:1 with white text.
    primaryShade: { light: 8, dark: 8 },
    colors: STATUS_COLORS,
    respectReducedMotion: true,
    components: themeComponents,
  });
}

/**
 * Legacy theme still mounted by app/root.tsx and ErrorPage.tsx. Kept at Mantine defaults until
 * S0B-25 switches the root to `buildTheme(scale)`: the new `lg` defaults would otherwise resize
 * every existing control (including /dev and /dashboard, which are not audited — X1 D2).
 */
export const theme = createTheme({});
