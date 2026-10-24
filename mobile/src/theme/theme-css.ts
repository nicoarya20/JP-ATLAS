import { schemeVars, THEME_ROLES } from './theme-roles';
import { RADIUS } from './tokens';
import { FONT_ROLES, TEXT_SCALE, WEIGHT_FONTS } from './type-scale';

/*
 * Builds mobile/global.css from the theme modules, so the CSS never holds a value of its own.
 * `bun run theme:css` writes it; theme-css.test.ts fails when the file and this output differ.
 */

/** Tailwind's spacing step in px: p-2 = 8, p-3 = 12, p-4 = 16, p-6 = 24, p-8 = 32 (the Atlas scale). */
const SPACING_STEP = 4;

const indent = (lines: string[], depth: number) => lines.map((l) => `${'  '.repeat(depth)}${l}`);

function themeLayer(): string[] {
  return [
    '@layer theme {',
    '  :root {',
    '    @variant light {',
    ...indent(schemeVars('light'), 3),
    '    }',
    '',
    '    @variant dark {',
    ...indent(schemeVars('dark'), 3),
    '    }',
    '  }',
    '}',
  ];
}

function colorMappings(): string[] {
  const lines = Object.keys(THEME_ROLES).map((name) => `--color-${name}: rgb(var(--${name}));`);
  return ['@theme inline {', ...indent(lines, 1), '}'];
}

function scales(): string[] {
  const radius = Object.entries(RADIUS).map(([name, px]) => `--radius-${name}: ${px}px;`);
  const fonts = Object.entries(FONT_ROLES).map(([role, family]) => `--font-${role}: '${family}';`);
  const text = Object.entries(TEXT_SCALE).flatMap(([name, t]) => [
    `--text-${name}: ${t.size}px;`,
    `--text-${name}--line-height: ${t.leading}px;`,
  ]);
  return [
    '@theme {',
    ...indent([`--spacing: ${SPACING_STEP}px;`, ...radius, ...fonts, ...text], 1),
    '}',
  ];
}

/** font-normal/medium/semibold/bold pick the static Manrope file; the weight stays normal so no platform fakes bold. */
function weightUtilities(): string[] {
  return Object.entries(WEIGHT_FONTS).flatMap(([weight, family]) => [
    `@utility font-${weight} {`,
    `  font-family: '${family}';`,
    '  font-weight: normal;',
    '}',
  ]);
}

/** The whole global.css text. */
export function buildGlobalCss(): string {
  return [
    '/* GENERATED from src/theme/*.ts by `bun run theme:css`; edit those files, not this one.',
    '   JP Atlas tokens as gluestack-ui v5 theme variables (RGB triplets), switched by Uniwind.setTheme. */',
    '@import "tailwindcss";',
    "@import 'uniwind';",
    '',
    ...themeLayer(),
    '',
    ...colorMappings(),
    '',
    ...scales(),
    '',
    ...weightUtilities(),
    '',
  ].join('\n');
}
