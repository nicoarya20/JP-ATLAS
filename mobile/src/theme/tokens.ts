/*
 * JP Atlas design tokens for the mobile app: a copy of app/lib/theme-tokens.ts (the web app's single source), because
 * mobile/ is its own project and cannot import from the root. __tests__/theme/tokens-sync.test.ts fails when the two drift.
 * Everything else (global.css theme variables, font families) derives from here; components never carry raw colours.
 */

/** Radius scale in px: controls 10, cards 14, modals 16, identity surfaces 20. */
export const RADIUS = { control: 10, card: 14, modal: 16, identity: 20 } as const;

/** Spacing scale in px (4/8/12/16/24/32/48/64); Mantine's xs..xl take the middle five. */
export const SPACING = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 } as const;

/** Page title: 32 px on desktop, 26 px on mobile. Section title: 20 px. Body line height 1.5. */
export const TYPE = { pageMobile: 26, page: 32, section: 20, bodyLeading: '1.5' } as const;

export type SchemeTokens = {
  canvas: string;
  surface: string;
  raised: string;
  text: string;
  muted: string;
  /** Decorative separators only; interactive borders use `control`. */
  line: string;
  control: string;
  primary: string;
  /** Hover is derived (the handoff defines none): one step off `primary`. */
  primaryHover: string;
  onPrimary: string;
  primaryBorder: string;
  violet: string;
  selected: string;
  selectedText: string;
  focus: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  info: string;
  infoBg: string;
  veil: string;
  shadow: string;
};

export const LIGHT: SchemeTokens = {
  canvas: '#f4f6fa',
  surface: '#ffffff',
  raised: '#eaf0f6',
  text: '#122236',
  muted: '#4c6075',
  line: '#c7d2df',
  control: '#697d92',
  primary: '#c8f904',
  primaryHover: '#b5e300',
  onPrimary: '#071321',
  primaryBorder: '#647d00',
  violet: '#5146c9',
  selected: '#ebe9ff',
  selectedText: '#3b3294',
  focus: '#5146c9',
  success: '#0c6847',
  successBg: '#e5f6ec',
  warning: '#805400',
  warningBg: '#fff3d6',
  danger: '#a51b3c',
  dangerBg: '#ffedf0',
  info: '#5146c9',
  infoBg: '#ebe9ff',
  veil: '#07132199',
  shadow: '0 14px 48px #16263818',
};

export const DARK: SchemeTokens = {
  canvas: '#071321',
  surface: '#0e1a24',
  raised: '#162638',
  text: '#f3f6fb',
  muted: '#b7c4d3',
  line: '#34465a',
  control: '#72869c',
  primary: '#c8f904',
  primaryHover: '#d9ff3d',
  onPrimary: '#071321',
  primaryBorder: '#c8f904',
  violet: '#b6b4ff',
  selected: '#252949',
  selectedText: '#e5e0ff',
  focus: '#c8f904',
  success: '#74deae',
  successBg: '#14382e',
  warning: '#ffd17a',
  warningBg: '#382d15',
  danger: '#ffa0ac',
  dangerBg: '#381e29',
  info: '#b6b4ff',
  infoBg: '#252949',
  veil: '#071321bb',
  shadow: '0 14px 48px #0005',
};
