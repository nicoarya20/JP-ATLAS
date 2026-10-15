import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { DEFAULT_THEME } from '@mantine/core';
import { buildTheme } from '../app/lib/theme';
import { cssVariablesResolver } from '../app/lib/theme-vars';

// R11 §3.2.3: text pairs need 4.5:1 (SC 1.4.3), non-text pairs need 3:1 (SC 1.4.11).
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;
// R11 prints ratios with 2 decimals; allow rounding noise only.
const R11_TOLERANCE = 0.011;

const theme = buildTheme(1);
const palette = { ...DEFAULT_THEME.colors, ...theme.colors } as Record<string, readonly string[]>;
const resolved = cssVariablesResolver(DEFAULT_THEME);

/** Resolves a hex colour or a `var(--mantine-color-<name>-<shade>)` token to a hex colour. */
function toHex(value: string): string {
  if (value.startsWith('#')) return value;
  if (value === 'var(--mantine-color-white)') return '#ffffff';
  const match = /^var\(--mantine-color-([a-z]+)-(\d)\)$/.exec(value);
  const shades = match ? palette[match[1]] : undefined;
  if (!match || !shades) throw new Error(`Cannot resolve colour token: ${value}`);
  return shades[Number(match[2])];
}

function channel(hex: string, offset: number): number {
  const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(color: string): number {
  const hex = toHex(color).replace(/^#(\w)(\w)(\w)$/, '#$1$1$2$2$3$3');
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG 2.x contrast ratio between two colours. */
function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** Reads `--mk-focus-ring` from the `:root` rule of theme.css that matches `selector`. */
function focusRing(selector: ':root' | ":root[data-mantine-color-scheme='dark']"): string {
  const css = readFileSync(new URL('../app/lib/theme.css', import.meta.url), 'utf8').replaceAll(
    '"',
    "'",
  ); // biome writes double quotes
  const start = css.indexOf(`${selector} {`);
  const value = /--mk-focus-ring:\s*([^;]+);/.exec(css.slice(start))?.[1];
  if (start < 0 || !value) throw new Error(`--mk-focus-ring not found for ${selector}`);
  return value.trim();
}

const gray = (i: number) => `var(--mantine-color-gray-${i})`;
const blue = (i: number) => `var(--mantine-color-blue-${i})`;
const dark = (i: number) => `var(--mantine-color-dark-${i})`;
const shade = (name: string, i: number) => `var(--mantine-color-${name}-${i})`;
const FILLED = theme.primaryShade as { light: number; dark: number };
const light = (key: string) => (resolved.light as Record<string, string>)[key];
const night = (key: string) => (resolved.dark as Record<string, string>)[key];

type Pair = { name: string; fg: string; bg: string; min: number; r11: number };
const text = (name: string, fg: string, bg: string, r11: number): Pair => ({
  name,
  fg,
  bg,
  r11,
  min: TEXT_MIN,
});
const nonText = (name: string, fg: string, bg: string, r11: number): Pair => ({
  name,
  fg,
  bg,
  r11,
  min: NON_TEXT_MIN,
});

// biome-ignore format: one pair per line mirrors the R11 §3.2.3 table row by row
const LIGHT_PAIRS: Pair[] = [
  text('body text on white', gray(9), '#fff', 15.43),
  text('body text on gray-0', gray(9), gray(0), 14.63),
  text('secondary text (dimmed) on white', light('--mantine-color-dimmed'), '#fff', 8.18),
  text('secondary text (dimmed) on gray-1', light('--mantine-color-dimmed'), gray(1), 7.35),
  text('placeholder on white', light('--mantine-color-placeholder'), '#fff', 4.83),
  nonText('input/default border on white', light('--mantine-color-default-border'), '#fff', 3.32),
  nonText('input/default border on gray-0', light('--mantine-color-default-border'), gray(0), 3.15),
  text('primary filled (white text)', '#fff', blue(FILLED.light), 5.02),
  text('primary hover (white text)', '#fff', blue(FILLED.light + 1), 6.09),
  text('link on white', blue(FILLED.light), '#fff', 5.02),
  text('link on gray-0', blue(FILLED.light), gray(0), 4.76),
  text('info light badge', blue(9), blue(1), 4.93),
  text('danger filled (white text)', '#fff', shade('danger', FILLED.light), 5.46),
  text('danger hover (white text)', '#fff', shade('danger', FILLED.light + 1), 7.43),
  text('error text on white', light('--mantine-color-error'), '#fff', 5.46),
  text('error text on gray-0', light('--mantine-color-error'), gray(0), 5.18),
  text('danger light badge', shade('danger', 9), shade('danger', 1), 6.14),
  text('ok filled (white text)', '#fff', shade('ok', FILLED.light), 6.33),
  text('ok hover (white text)', '#fff', shade('ok', FILLED.light + 1), 9.11),
  text('ok light badge', shade('ok', 9), shade('ok', 1), 7.94),
  text('warn filled (white text)', '#fff', shade('warn', FILLED.light), 6.8),
  text('warn light badge', shade('warn', 9), shade('warn', 1), 8.44),
  text('neutral light badge', gray(8), gray(2), 9.7),
  nonText('focus ring on white', focusRing(':root'), '#fff', 5.02),
  nonText('focus ring on gray-0', focusRing(':root'), gray(0), 4.76),
];

// biome-ignore format: one pair per line mirrors the R11 §3.2.3 dark-mode paragraph
const DARK_PAIRS: Pair[] = [
  text('body text on dark body', dark(0), dark(7), 9.37),
  text('secondary text (dimmed) on dark body', night('--mantine-color-dimmed'), dark(7), 7.83),
  text('error text on dark body', night('--mantine-color-error'), dark(7), 6.7),
  nonText('focus ring on dark body', focusRing(":root[data-mantine-color-scheme='dark']"), dark(7), 6.27),
];

describe('R11 §3.2.3 contrast pairs (light)', () => {
  for (const pair of LIGHT_PAIRS) {
    test(`${pair.name} reaches ${pair.min}:1 and matches the R11 table`, () => {
      const actual = ratio(pair.fg, pair.bg);
      expect(actual).toBeGreaterThanOrEqual(pair.min);
      expect(Math.abs(actual - pair.r11)).toBeLessThan(R11_TOLERANCE);
    });
  }
});

describe('R11 §3.2.3 contrast pairs (dark)', () => {
  for (const pair of DARK_PAIRS) {
    test(`${pair.name} reaches ${pair.min}:1 and matches the R11 text`, () => {
      const actual = ratio(pair.fg, pair.bg);
      expect(actual).toBeGreaterThanOrEqual(pair.min);
      expect(Math.abs(actual - pair.r11)).toBeLessThan(R11_TOLERANCE);
    });
  }
});

describe('Mantine defaults that the resolver replaces', () => {
  test('default dimmed, placeholder, border and error colours fail their thresholds', () => {
    expect(ratio(gray(6), '#fff')).toBeLessThan(TEXT_MIN); // dimmed 3.32
    expect(ratio(gray(5), '#fff')).toBeLessThan(TEXT_MIN); // placeholder 2.07
    expect(ratio(gray(4), '#fff')).toBeLessThan(NON_TEXT_MIN); // border 1.49
    expect(ratio(shade('red', 6), '#fff')).toBeLessThan(TEXT_MIN); // error text
    expect(ratio(dark(2), dark(7))).toBeLessThan(TEXT_MIN); // dark dimmed 4.04
    expect(ratio(shade('red', 8), dark(7))).toBeLessThan(TEXT_MIN); // dark error 3.44
    // Blue-8 on the dark body is 3.09:1: passes by a hair, which is why theme.css uses blue-4.
    expect(ratio(blue(8), dark(7))).toBeLessThan(ratio(blue(4), dark(7)) / 2);
  });

  test('the shade 8 palettes are what primaryShade resolves to', () => {
    expect(FILLED).toEqual({ light: 8, dark: 8 });
    expect(Object.keys(theme.colors ?? {}).sort()).toEqual(['danger', 'ok', 'warn']);
  });
});
