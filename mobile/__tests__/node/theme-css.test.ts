import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { FONT_FILES } from '../../src/theme/fonts';
import { buildGlobalCss } from '../../src/theme/theme-css';
import { WEIGHT_FONTS } from '../../src/theme/type-scale';

const ROOT = join(__dirname, '..', '..');

describe('global.css', () => {
  test('matches what src/theme builds (run `bun run theme:css` after changing a token)', () => {
    expect(readFileSync(join(ROOT, 'global.css'), 'utf8')).toBe(buildGlobalCss());
  });

  test('holds no raw hex colour', () => {
    expect(buildGlobalCss()).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  test('sizes are px, never rem', () => {
    const css = buildGlobalCss();
    expect(css).toContain('--spacing: 4px;');
    expect(css).toContain('--text-page: 26px;');
    expect(css).not.toMatch(/\d+rem\b/);
  });

  test('each weight utility uses a loaded Manrope file that exists with its licence', () => {
    for (const family of Object.values(WEIGHT_FONTS)) {
      expect(buildGlobalCss()).toContain(`font-family: '${family}';`);
      expect(Object.keys(FONT_FILES)).toContain(family);
      expect(existsSync(join(ROOT, 'assets', 'fonts', `${family}.ttf`))).toBe(true);
    }
    expect(existsSync(join(ROOT, 'assets', 'fonts', 'OFL.txt'))).toBe(true);
  });
});
