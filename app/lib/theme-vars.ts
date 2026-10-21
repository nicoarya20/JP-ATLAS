import type { CSSVariablesResolver } from '@mantine/core';
import { ROLE_NAMES } from './theme-palette';
import { DARK, LIGHT, type SchemeTokens } from './theme-tokens';

type Vars = Record<string, string>;

/** Placeholder text: 4.83:1 on white (never a substitute for a label). */
const LIGHT_PLACEHOLDER = '#5d7186';

/** Dark-mode derived steps the handoff does not define: filled violet and hover washes. */
const DARK_FILLED = '#6c61d6';
const DARK_FILLED_HOVER = '#5146c9';
const DARK_HOVER_WASH: Record<string, string> = {
  [DARK.infoBg]: '#2f3460',
  [DARK.successBg]: '#1a4739',
  [DARK.warningBg]: '#473a1c',
  [DARK.dangerBg]: '#472634',
};

/** Light variant, text and outline of every colour in a role, in the scheme's own tokens. */
function roleVars(names: readonly string[], fg: string, bg: string, onBg: string): Vars {
  const vars: Vars = {};
  for (const name of names) {
    vars[`--mantine-color-${name}-text`] = fg;
    vars[`--mantine-color-${name}-light`] = bg;
    vars[`--mantine-color-${name}-light-hover`] = DARK_HOVER_WASH[bg];
    vars[`--mantine-color-${name}-light-color`] = onBg;
    vars[`--mantine-color-${name}-outline`] = fg;
    vars[`--mantine-color-${name}-outline-hover`] = `${fg}0d`;
  }
  return vars;
}

function interactionDark(): Vars {
  const vars = roleVars(ROLE_NAMES.interaction, DARK.violet, DARK.infoBg, DARK.selectedText);
  for (const name of ROLE_NAMES.interaction) {
    vars[`--mantine-color-${name}-filled`] = DARK_FILLED;
    vars[`--mantine-color-${name}-filled-hover`] = DARK_FILLED_HOVER;
  }
  return vars;
}

/** The `--jp-*` handles that CSS (theme.css) and component vars read; one set per scheme. */
function jpVars(t: SchemeTokens): Vars {
  return {
    '--jp-canvas': t.canvas,
    '--jp-surface': t.surface,
    '--jp-raised': t.raised,
    '--jp-line': t.line,
    '--jp-control': t.control,
    '--jp-primary': t.primary,
    '--jp-primary-hover': t.primaryHover,
    '--jp-on-primary': t.onPrimary,
    '--jp-primary-border': t.primaryBorder,
    '--jp-focus': t.focus,
    '--jp-veil': t.veil,
    '--mantine-shadow-md': t.shadow,
    '--mantine-shadow-lg': t.shadow,
    '--mantine-shadow-xl': t.shadow,
  };
}

/**
 * Maps the JP Atlas tokens onto Mantine's CSS variables (and fixes the defaults that fail WCAG
 * contrast): body/surface/text, dimmed, placeholder, input border, error, link and the per-role
 * dark-mode colours. The page canvas is painted by theme.css from `--jp-canvas`.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    ...jpVars(LIGHT),
    '--mantine-color-text': LIGHT.text,
    // Cards, menus and modals sit on the surface; the canvas behind them is `--jp-canvas`.
    '--mantine-color-body': LIGHT.surface,
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
    '--mantine-color-placeholder': LIGHT_PLACEHOLDER,
    // Input border = `control` (4.24:1 on white), not the decorative `line`.
    '--mantine-color-default-border': 'var(--mantine-color-gray-6)',
    '--mantine-color-error': 'var(--mantine-color-danger-8)',
  },
  dark: {
    ...jpVars(DARK),
    ...interactionDark(),
    ...roleVars(ROLE_NAMES.success, DARK.success, DARK.successBg, DARK.success),
    ...roleVars(ROLE_NAMES.warning, DARK.warning, DARK.warningBg, DARK.warning),
    ...roleVars(ROLE_NAMES.danger, DARK.danger, DARK.dangerBg, DARK.danger),
    '--mantine-color-text': DARK.text,
    '--mantine-color-body': DARK.surface,
    '--mantine-color-dimmed': 'var(--mantine-color-dark-1)',
    '--mantine-color-placeholder': DARK.control,
    '--mantine-color-default-border': DARK.control,
    '--mantine-color-error': DARK.danger,
    '--mantine-color-anchor': DARK.violet,
  },
});
