import { execFileSync } from 'node:child_process';
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

  describe('compiled by Tailwind (the compiler Uniwind runs)', () => {
    // @tailwindcss/node registers module hooks, which jest refuses; the compile runs in its own process.
    const build = (candidates: string[]) =>
      execFileSync('bun', [join(ROOT, 'scripts', 'compile-theme-css.ts'), ...candidates], {
        cwd: ROOT,
        encoding: 'utf8',
      });

    test('weight utilities set the Manrope file only; no Tailwind weight or family utility remains', () => {
      const css = build([
        'font-normal',
        'font-medium',
        'font-semibold',
        'font-bold',
        'font-sans',
        'font-body',
      ]);
      expect(css).not.toContain('font-weight: var(--font-weight-');
      expect(css).not.toMatch(/\.font-(sans|body|heading)\b/);
      for (const [weight, family] of Object.entries(WEIGHT_FONTS)) {
        expect(css).toMatch(
          new RegExp(`\\.font-${weight} \\{\\s*font-family: '${family}';\\s*font-weight: normal;`),
        );
      }
    });

    test('only Atlas role colours exist: Tailwind palette classes compile to nothing', () => {
      const css = build([
        'bg-green-500',
        'bg-yellow-500',
        'text-white',
        'bg-success',
        'bg-warning-soft',
      ]);
      expect(css).not.toMatch(/\.(bg-green-500|bg-yellow-500|text-white)\b/);
      expect(css).toContain('background-color: rgb(var(--success));');
      expect(css).toContain('background-color: rgb(var(--warning-soft));');
    });

    test('a colour with alpha (the veil) is used whole, not through rgb()', () => {
      expect(build(['bg-veil'])).toContain('background-color: var(--veil);');
    });
  });
});
