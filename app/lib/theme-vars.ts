import type { CSSVariablesResolver } from '@mantine/core';

/**
 * Overrides the Mantine CSS variables whose defaults fail WCAG contrast (R11 §3.2.3): `dimmed`,
 * placeholder, the default border (inputs get theirs from theme.css) and the error colour.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    // Mantine default gray-6 (#868e96) is 3.32:1 on white; gray-7 reaches 8.18:1.
    '--mantine-color-dimmed': 'var(--mantine-color-gray-7)',
    // Default gray-5 is 2.07:1; this value is 4.83:1 on white (never a substitute for a label).
    '--mantine-color-placeholder': '#6b7280',
    // Default gray-4 border is 1.49:1; gray-6 passes the 3:1 non-text threshold (SC 1.4.11).
    '--mantine-color-default-border': 'var(--mantine-color-gray-6)',
    // Default red-6 error text is below 4.5:1; danger[8] is 5.46:1 (R11 table omits it in the snippet).
    '--mantine-color-error': 'var(--mantine-color-danger-8)',
  },
  dark: {
    // Default dimmed in dark (#828282) is 4.04:1; dark-1 is 7.83:1.
    '--mantine-color-dimmed': 'var(--mantine-color-dark-1)',
    // Default red-8 error in dark is 3.44:1; red-4 is 6.70:1.
    '--mantine-color-error': 'var(--mantine-color-red-4)',
  },
});
