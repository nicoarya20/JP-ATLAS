import { schemeVars, THEME_ROLES } from './theme-roles';
import { RADIUS } from './tokens';
import { TEXT_SCALE, WEIGHT_FONTS } from './type-scale';

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

/** Only the Atlas roles are colours: Tailwind's own palette is reset, so no bg-green-500 can slip a hex past the tokens. */
function colorMappings(): string[] {
  const lines = Object.keys(THEME_ROLES).map((name) => `--color-${name}: rgb(var(--${name}));`);
  return ['@theme inline {', ...indent(['--color-*: initial;', ...lines], 1), '}'];
}

function scales(): string[] {
  const radius = Object.entries(RADIUS).map(([name, px]) => `--radius-${name}: ${px}px;`);
  const text = Object.entries(TEXT_SCALE).flatMap(([name, t]) => [
    `--text-${name}: ${t.size}px;`,
    `--text-${name}--line-height: ${t.leading}px;`,
  ]);
  return [
    '@theme {',
    // Tailwind's font families and weights are reset: the weight utilities below are the only font utilities. Its
    // .font-semibold (fontWeight 600) would fake bold on the static file, and a family utility (font-sans, or a role
    // like font-body) comes later in the cascade than the weights and would put Manrope-Regular back over them.
    ...indent(
      [
        '--font-*: initial;',
        '--font-weight-*: initial;',
        `--spacing: ${SPACING_STEP}px;`,
        ...radius,
        ...text,
      ],
      1,
    ),
    '}',
  ];
}

/**
 * font-normal/medium/semibold/bold pick the static Manrope file and keep the weight normal, so no platform fakes bold.
 * They are the only font utilities (see scales()): body text is font-normal, headings font-semibold.
 */
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
