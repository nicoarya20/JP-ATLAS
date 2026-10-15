import type { MantineColorsTuple } from '@mantine/core';

/*
 * Status palettes from R11 §3.2.3. Only shades 0/1 (light background), 8 (filled) and 9 (light
 * text / hover) are contrast-checked in tests/theme-contrast.test.ts; the rest are fillers that
 * follow the nearest Mantine palette. `primaryShade: 8` makes shade 8 the filled colour of every
 * palette, which is why the default green/yellow/orange cannot be used for status.
 */

export const ok: MantineColorsTuple = [
  '#ebfbee',
  '#d3f9d8',
  '#b2f2bb',
  '#8ce99a',
  '#69db7c',
  '#51cf66',
  '#2f9e44',
  '#237a38',
  '#1b6e2f',
  '#14532d',
];

export const warn: MantineColorsTuple = [
  '#fff9db',
  '#fff3bf',
  '#ffec99',
  '#ffe066',
  '#ffd43b',
  '#fcc419',
  '#f59f00',
  '#b36200',
  '#8a4b00',
  '#6b3a00',
];

export const danger: MantineColorsTuple = [
  '#fff5f5',
  '#ffe3e3',
  '#ffc9c9',
  '#ffa8a8',
  '#ff8787',
  '#ff6b6b',
  '#e03131',
  '#d12c2c',
  '#c92a2a',
  '#a61e1e',
];

/** Palettes registered under `theme.colors` so `color="ok" | "warn" | "danger"` resolve. */
export const STATUS_COLORS = { ok, warn, danger } as const;
