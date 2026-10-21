import type { MantineColorsTuple } from '@mantine/core';

/*
 * JP Atlas palettes on Mantine's 10-step tuples. `primaryShade` is 8 for both schemes, so shade 8
 * is the filled colour in light mode (white text) and shade 9 its hover and its text on shade 1.
 * Dark mode swaps filled/text/light colours in theme-vars.ts, because one tuple cannot serve both.
 */

/** Violet: interaction (links, selection, focus, default filled controls). 8 = #5146c9 / 9 = selected text. */
export const atlas: MantineColorsTuple = [
  '#f1efff',
  '#ebe9ff',
  '#dcd8ff',
  '#cbc7ff',
  '#b6b4ff',
  '#9d98f5',
  '#6c61d6',
  '#5a4fd0',
  '#5146c9',
  '#3b3294',
];

export const ok: MantineColorsTuple = [
  '#effaf4',
  '#e5f6ec',
  '#c9ecd9',
  '#9fe0bf',
  '#74deae',
  '#4fc994',
  '#2f9e6f',
  '#0f7350',
  '#0c6847',
  '#084c35',
];

export const warn: MantineColorsTuple = [
  '#fff9ea',
  '#fff3d6',
  '#ffe6ad',
  '#ffd17a',
  '#f5b94a',
  '#e0a02a',
  '#b87b0a',
  '#966300',
  '#805400',
  '#5e3d00',
];

export const danger: MantineColorsTuple = [
  '#fff5f6',
  '#ffedf0',
  '#ffd3da',
  '#ffa0ac',
  '#f77a8a',
  '#e04e63',
  '#c63150',
  '#b52346',
  '#a51b3c',
  '#7d1230',
];

/** Neutral ramp: 0 canvas, 1 raised, 3 line, 6 control, 7 muted, 9 text (light scheme). */
export const gray: MantineColorsTuple = [
  '#f4f6fa',
  '#eaf0f6',
  '#dde5ee',
  '#c7d2df',
  '#a9b8c8',
  '#8b9eb2',
  '#697d92',
  '#4c6075',
  '#2f4358',
  '#122236',
];

/** Dark ramp: 0 text, 1 muted, 3 control, 4 line, 5 raised, 6 surface, 7 canvas. */
export const dark: MantineColorsTuple = [
  '#f3f6fb',
  '#b7c4d3',
  '#93a5b8',
  '#72869c',
  '#34465a',
  '#162638',
  '#0e1a24',
  '#071321',
  '#050e18',
  '#030a12',
];

/** Colour names grouped by the JP Atlas role they now express; theme-vars.ts keys dark mode off this. */
export const ROLE_NAMES = {
  interaction: ['atlas', 'blue', 'indigo', 'violet'],
  success: ['ok', 'teal', 'green'],
  warning: ['warn', 'orange', 'yellow'],
  danger: ['danger', 'red'],
} as const;

/*
 * Existing call sites say color="red" / "teal" / "blue" ...; aliasing those names to the four
 * role palettes moves the whole app onto the design-system colours without touching each one.
 */
export const STATUS_COLORS = {
  atlas,
  blue: atlas,
  indigo: atlas,
  violet: atlas,
  ok,
  teal: ok,
  green: ok,
  warn,
  orange: warn,
  yellow: warn,
  danger,
  red: danger,
  gray,
  dark,
} as const;
