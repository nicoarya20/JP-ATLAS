import {
  DARK as WEB_DARK,
  LIGHT as WEB_LIGHT,
  RADIUS as WEB_RADIUS,
  SPACING as WEB_SPACING,
  TYPE as WEB_TYPE,
} from '../../../app/lib/theme-tokens';
import { statSlop } from '../../src/screens/home/parts/stat-chip';
import { blockSlops } from '../../src/screens/profile/day-grid.slop';
import { hexToRgb, roleHex, THEME_ROLES } from '../../src/theme/theme-roles';
import { DARK, LIGHT, MIN_TARGET, RADIUS, SPACING, TYPE } from '../../src/theme/tokens';

// The mobile tokens are a copy of the web app's single source; this fails as soon as one side changes alone.
describe('mobile tokens mirror app/lib/theme-tokens.ts', () => {
  test.each([
    ['LIGHT', LIGHT, WEB_LIGHT],
    ['DARK', DARK, WEB_DARK],
    ['RADIUS', RADIUS, WEB_RADIUS],
    ['SPACING', SPACING, WEB_SPACING],
    ['TYPE', TYPE, WEB_TYPE],
  ] as const)('%s is identical', (_name, mobile, web) => {
    expect(mobile).toEqual(web);
  });
});

// Mobile only (no web counterpart): the touch target every hitSlop grows a small control to.
describe('MIN_TARGET', () => {
  test('is 44 pt, and the stat chip and day grid slops grow a short target to exactly that', () => {
    expect(MIN_TARGET).toBe(44);
    const line = 20;
    const chip = statSlop(line);
    expect(2 * SPACING.xs + line + chip.top + chip.bottom).toBe(MIN_TARGET);
    const [block] = blockSlops([{ top: 100, height: 20 }], 400);
    expect(20 + (block?.top ?? 0) + (block?.bottom ?? 0)).toBe(MIN_TARGET);
  });
});

describe('theme roles', () => {
  test('lime is the main action with navy text in both schemes (never white on lime)', () => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(roleHex('primary', scheme)).toBe('#c8f904');
      expect(roleHex('primary-foreground', scheme)).toBe('#071321');
    }
  });

  test('canvas is the page, surface is cards and popovers', () => {
    expect(roleHex('background', 'light')).toBe(LIGHT.canvas);
    expect(roleHex('card', 'dark')).toBe(DARK.surface);
    expect(roleHex('popover', 'light')).toBe(LIGHT.surface);
  });

  test('every role resolves in both schemes', () => {
    for (const name of Object.keys(THEME_ROLES)) {
      expect(roleHex(name, 'light')).toMatch(/^#[0-9a-f]{6,8}$/i);
      expect(roleHex(name, 'dark')).toMatch(/^#[0-9a-f]{6,8}$/i);
    }
  });

  test('hexToRgb writes triplets and carries alpha', () => {
    expect(hexToRgb('#c8f904')).toBe('200 249 4');
    expect(hexToRgb('#07132199')).toBe('7 19 33 / 0.6');
    expect(() => hexToRgb('red')).toThrow('Not a #rrggbb[aa] colour: red');
  });
});
