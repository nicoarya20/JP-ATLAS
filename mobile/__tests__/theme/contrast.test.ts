import { hexToRgb, roleHex } from '../../src/theme/theme-roles';

// Same thresholds as the web app (tests/theme-contrast.test.ts, JP Atlas handoff 2026-10-21): text pairs need 4.5:1
// (WCAG SC 1.4.3), non-text pairs need 3:1 (SC 1.4.11). Pairs are the gluestack theme roles the mobile UI paints.
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).split(' ').map(Number);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two colours. */
function ratio(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [fg: string, bg: string, min: number];

// biome-ignore format: one pair per line keeps the table scannable
const PAIRS: Pair[] = [
  ['foreground', 'background', TEXT_MIN],
  ['foreground', 'card', TEXT_MIN],
  ['muted-foreground', 'background', TEXT_MIN],
  ['muted-foreground', 'card', TEXT_MIN],
  ['muted-foreground', 'muted', TEXT_MIN],
  ['secondary-foreground', 'secondary', TEXT_MIN],
  ['primary-foreground', 'primary', TEXT_MIN],
  ['primary-foreground', 'primary-pressed', TEXT_MIN],
  ['accent-foreground', 'accent', TEXT_MIN],
  ['atlas', 'card', TEXT_MIN],
  ['atlas', 'background', TEXT_MIN],
  ['destructive-foreground', 'destructive', TEXT_MIN],
  ['destructive', 'card', TEXT_MIN],
  ['destructive', 'danger-soft', TEXT_MIN],
  ['success', 'success-soft', TEXT_MIN],
  ['warning', 'warning-soft', TEXT_MIN],
  ['info', 'info-soft', TEXT_MIN],
  ['popover-foreground', 'popover', TEXT_MIN],
  ['primary-border', 'card', NON_TEXT_MIN],
  ['input', 'card', NON_TEXT_MIN],
  ['input', 'background', NON_TEXT_MIN],
  ['ring', 'card', NON_TEXT_MIN],
  ['ring', 'background', NON_TEXT_MIN],
  ['atlas', 'muted', NON_TEXT_MIN],
  ['success', 'card', NON_TEXT_MIN],
  ['snack-foreground', 'snack', TEXT_MIN],
  ['snack-action', 'snack', TEXT_MIN],
];

describe.each(['light', 'dark'] as const)('JP Atlas contrast pairs (%s)', (scheme) => {
  test.each(PAIRS)('%s on %s reaches %d:1', (fg, bg, min) => {
    expect(ratio(roleHex(fg, scheme), roleHex(bg, scheme))).toBeGreaterThanOrEqual(min);
  });
});
