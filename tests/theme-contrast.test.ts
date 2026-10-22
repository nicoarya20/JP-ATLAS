import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { DEFAULT_THEME } from '@mantine/core';
import { buildTheme } from '../app/lib/theme';
import { DARK, LIGHT } from '../app/lib/theme-tokens';
import { cssVariablesResolver } from '../app/lib/theme-vars';

// JP Atlas handoff (2026-10-21): text pairs need 4.5:1 (SC 1.4.3), non-text pairs need 3:1 (SC 1.4.11).
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

const theme = buildTheme(1);
const palette = { ...DEFAULT_THEME.colors, ...theme.colors } as Record<string, readonly string[]>;
const resolved = cssVariablesResolver(DEFAULT_THEME);
const light = (key: string) => (resolved.light as Record<string, string>)[key];
const night = (key: string) => (resolved.dark as Record<string, string>)[key];

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
  const hex = toHex(color);
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG 2.x contrast ratio between two colours. */
function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const shade = (name: string, i: number) => `var(--mantine-color-${name}-${i})`;
const FILLED = theme.primaryShade as { light: number; dark: number };
const WHITE = '#ffffff';

type Pair = { name: string; fg: string; bg: string; min: number };
const text = (name: string, fg: string, bg: string): Pair => ({ name, fg, bg, min: TEXT_MIN });
const nonText = (name: string, fg: string, bg: string): Pair => ({
  name,
  fg,
  bg,
  min: NON_TEXT_MIN,
});

// biome-ignore format: one pair per line keeps the table scannable
const LIGHT_PAIRS: Pair[] = [
  text('body text on canvas', LIGHT.text, LIGHT.canvas),
  text('body text on surface', light('--mantine-color-text'), LIGHT.surface),
  text('secondary text (dimmed) on canvas', light('--mantine-color-dimmed'), LIGHT.canvas),
  text('secondary text (dimmed) on surface', light('--mantine-color-dimmed'), LIGHT.surface),
  text('secondary text (dimmed) on raised', light('--mantine-color-dimmed'), LIGHT.raised),
  text('placeholder on surface', light('--mantine-color-placeholder'), LIGHT.surface),
  nonText('input/default border on surface', light('--mantine-color-default-border'), LIGHT.surface),
  nonText('input/default border on canvas', light('--mantine-color-default-border'), LIGHT.canvas),
  text('primary action label (navy on lime)', LIGHT.onPrimary, LIGHT.primary),
  nonText('primary action border on surface', LIGHT.primaryBorder, LIGHT.surface),
  text('primary action label on hover', LIGHT.onPrimary, LIGHT.primaryHover),
  text('default filled (white text)', WHITE, shade('atlas', FILLED.light)),
  text('default filled hover (white text)', WHITE, shade('atlas', FILLED.light + 1)),
  text('link on surface', shade('atlas', FILLED.light), LIGHT.surface),
  text('link on canvas', shade('atlas', FILLED.light), LIGHT.canvas),
  text('selected text on selected', LIGHT.selectedText, LIGHT.selected),
  text('info light badge', shade('atlas', 9), shade('atlas', 1)),
  text('danger filled (white text)', WHITE, shade('danger', FILLED.light)),
  text('danger hover (white text)', WHITE, shade('danger', FILLED.light + 1)),
  text('error text on surface', light('--mantine-color-error'), LIGHT.surface),
  text('error text on canvas', light('--mantine-color-error'), LIGHT.canvas),
  text('danger light badge', shade('danger', 9), shade('danger', 1)),
  text('danger on danger-bg', LIGHT.danger, LIGHT.dangerBg),
  text('ok filled (white text)', WHITE, shade('ok', FILLED.light)),
  text('ok hover (white text)', WHITE, shade('ok', FILLED.light + 1)),
  text('ok light badge', shade('ok', 9), shade('ok', 1)),
  text('success on success-bg', LIGHT.success, LIGHT.successBg),
  text('warn filled (white text)', WHITE, shade('warn', FILLED.light)),
  text('warn light badge', shade('warn', 9), shade('warn', 1)),
  text('warning on warning-bg', LIGHT.warning, LIGHT.warningBg),
  text('neutral light badge', shade('gray', 9), shade('gray', 1)),
  nonText('focus ring on surface', LIGHT.focus, LIGHT.surface),
  nonText('focus ring on canvas', LIGHT.focus, LIGHT.canvas),
];

// biome-ignore format: one pair per line keeps the table scannable
const DARK_PAIRS: Pair[] = [
  text('body text on canvas', DARK.text, DARK.canvas),
  text('body text on surface', night('--mantine-color-text'), DARK.surface),
  text('secondary text (dimmed) on canvas', night('--mantine-color-dimmed'), DARK.canvas),
  text('secondary text (dimmed) on surface', night('--mantine-color-dimmed'), DARK.surface),
  text('secondary text (dimmed) on raised', night('--mantine-color-dimmed'), DARK.raised),
  text('placeholder on surface', night('--mantine-color-placeholder'), DARK.surface),
  nonText('input/default border on surface', night('--mantine-color-default-border'), DARK.surface),
  nonText('input/default border on canvas', night('--mantine-color-default-border'), DARK.canvas),
  text('primary action label (navy on lime)', DARK.onPrimary, DARK.primary),
  text('primary action label on hover', DARK.onPrimary, DARK.primaryHover),
  nonText('primary action on surface', DARK.primary, DARK.surface),
  text('default filled (white text)', WHITE, night('--mantine-color-atlas-filled')),
  text('default filled hover (white text)', WHITE, night('--mantine-color-atlas-filled-hover')),
  nonText('default filled on surface', night('--mantine-color-atlas-filled'), DARK.surface),
  text('link on surface', night('--mantine-color-anchor'), DARK.surface),
  text('link on canvas', night('--mantine-color-anchor'), DARK.canvas),
  text('selected text on selected', DARK.selectedText, DARK.selected),
  text('info text on info-bg', night('--mantine-color-blue-text'), night('--mantine-color-blue-light')),
  text('error text on surface', night('--mantine-color-error'), DARK.surface),
  text('danger on danger-bg', night('--mantine-color-red-light-color'), night('--mantine-color-red-light')),
  text('success on success-bg', night('--mantine-color-teal-light-color'), night('--mantine-color-teal-light')),
  text('warning on warning-bg', night('--mantine-color-orange-light-color'), night('--mantine-color-orange-light')),
  nonText('focus ring on surface', DARK.focus, DARK.surface),
  nonText('focus ring on canvas', DARK.focus, DARK.canvas),
];

describe('JP Atlas contrast pairs (light)', () => {
  for (const pair of LIGHT_PAIRS) {
    test(`${pair.name} reaches ${pair.min}:1`, () => {
      expect(ratio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
});

describe('JP Atlas contrast pairs (dark)', () => {
  for (const pair of DARK_PAIRS) {
    test(`${pair.name} reaches ${pair.min}:1`, () => {
      expect(ratio(pair.fg, pair.bg)).toBeGreaterThanOrEqual(pair.min);
    });
  }
});

describe('focus ring', () => {
  test('theme.css reads the per-scheme --jp-focus token', () => {
    const css = readFileSync(new URL('../app/lib/theme.css', import.meta.url), 'utf8');
    expect(css).toMatch(/--mk-focus-ring:\s*var\(--jp-focus\)/);
    expect(light('--jp-focus')).toBe(LIGHT.focus);
    expect(night('--jp-focus')).toBe(DARK.focus);
  });
});

describe('Mantine defaults that the resolver replaces', () => {
  test('default dimmed, placeholder and border colours fail their thresholds', () => {
    const g = (i: number) => DEFAULT_THEME.colors.gray[i];
    expect(ratio(g(6), WHITE)).toBeLessThan(TEXT_MIN); // dimmed 3.32
    expect(ratio(g(5), WHITE)).toBeLessThan(TEXT_MIN); // placeholder 2.07
    expect(ratio(g(4), WHITE)).toBeLessThan(NON_TEXT_MIN); // border 1.49
    expect(ratio(DEFAULT_THEME.colors.red[6], WHITE)).toBeLessThan(TEXT_MIN); // error text
  });

  test('primaryShade resolves to shade 8 and the colour aliases land on the role palettes', () => {
    expect(FILLED).toEqual({ light: 8, dark: 8 });
    expect(theme.primaryColor).toBe('atlas');
    const colors = theme.colors ?? {};
    for (const name of ['blue', 'indigo', 'violet']) expect(colors[name]).toEqual(colors.atlas);
    for (const name of ['teal', 'green']) expect(colors[name]).toEqual(colors.ok);
    for (const name of ['orange', 'yellow']) expect(colors[name]).toEqual(colors.warn);
    expect(colors.red).toEqual(colors.danger);
  });
});
