import { DARK, LIGHT, type SchemeTokens } from './tokens';

/*
 * JP Atlas roles on gluestack-ui v5's semantic theme variables (plus our own: atlas, status pairs, veil, snack). global.css
 * holds these as RGB triplets (a colour with alpha as a whole rgb(), see hexToRgb); `bun run theme:css` rewrites that block from here and theme-css.test.ts
 * fails when global.css drifts. Same role split as the web app (app/lib/theme-vars.ts): canvas behind the page,
 * surface for cards, menus and modals, lime fill with navy text for the main action, violet for interaction.
 */

/** Text on a filled destructive button. Derived (the handoff defines none): white on the light red, navy on the dark one. */
const ON_DANGER = { light: LIGHT.surface, dark: DARK.onPrimary } as const;

/**
 * Snackbar (Undo) stays dark in both schemes, like the prototype's --snack-*: dark surface on the light canvas, dark
 * raised on the dark canvas (the surface would vanish there), with the dark text and dark violet for its action.
 */
const SNACK = { light: DARK.surface, dark: DARK.raised } as const;

type Scheme = 'light' | 'dark';
type Source = keyof SchemeTokens | ((scheme: Scheme) => string);

/** CSS variable name (without `--`) → the token it carries. Tailwind colour = colorRef(name). */
export const THEME_ROLES: Record<string, Source> = {
  background: 'canvas',
  foreground: 'text',
  card: 'surface',
  'card-foreground': 'text',
  popover: 'surface',
  'popover-foreground': 'text',
  primary: 'primary',
  'primary-foreground': 'onPrimary',
  'primary-pressed': 'primaryHover',
  'primary-border': 'primaryBorder',
  secondary: 'raised',
  'secondary-foreground': 'text',
  muted: 'raised',
  'muted-foreground': 'muted',
  accent: 'selected',
  'accent-foreground': 'selectedText',
  atlas: 'violet',
  destructive: 'danger',
  'destructive-foreground': (scheme) => ON_DANGER[scheme],
  'danger-soft': 'dangerBg',
  success: 'success',
  'success-soft': 'successBg',
  warning: 'warning',
  'warning-soft': 'warningBg',
  info: 'info',
  'info-soft': 'infoBg',
  border: 'line',
  input: 'control',
  ring: 'focus',
  veil: 'veil',
  snack: (scheme) => SNACK[scheme],
  'snack-foreground': () => DARK.text,
  'snack-action': () => DARK.violet,
};

/**
 * `#rrggbb` → `"r g b"`, the triplet `rgb(var(--x))` expects. `#rrggbbaa` → `"rgb(r g b / a)"`, a whole colour read as
 * `var(--x)` (see colorRef): Uniwind 1.13 compiles the triplet form `r g b / a` inside a custom property to the JS
 * expression `b / a`, so `7 19 33 / 0.6` became the opaque `rgb(7 19 55)` and the More panel's dim hid the screen.
 */
export function hexToRgb(hex: string): string {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m) throw new Error(`Not a #rrggbb[aa] colour: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  const rgb = `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  // Three decimals so the alpha byte survives the round trip (bb = 0.733; 0.73 came back as ba).
  return m[2] ? `rgb(${rgb} / ${Number((Number.parseInt(m[2], 16) / 255).toFixed(3))})` : rgb;
}

/** Hex value of one role in one scheme. */
export function roleHex(name: string, scheme: Scheme): string {
  const source = THEME_ROLES[name];
  if (!source) throw new Error(`Unknown theme role: ${name}`);
  return typeof source === 'function'
    ? source(scheme)
    : (scheme === 'light' ? LIGHT : DARK)[source];
}

/** Tailwind colour of a role: `rgb(var(--name))` for a triplet, `var(--name)` for a role carrying alpha (hexToRgb). */
export function colorRef(name: string): string {
  const alpha = (['light', 'dark'] as const).map((scheme) => roleHex(name, scheme).length === 9);
  if (alpha[0] !== alpha[1])
    throw new Error(`Theme role ${name} must carry alpha in both schemes or in neither`);
  return alpha[0] ? `var(--${name})` : `rgb(var(--${name}))`;
}

/** `--name: r g b;` lines of one scheme, in THEME_ROLES order. */
export function schemeVars(scheme: Scheme): string[] {
  return Object.keys(THEME_ROLES).map((name) => `--${name}: ${hexToRgb(roleHex(name, scheme))};`);
}
