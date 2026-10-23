import { Button, type MantineThemeComponents, rem } from '@mantine/core';
import { CALENDAR_DATE_MAX, CALENDAR_DATE_MIN } from '@server/metrics/dates';
import { RADIUS } from './theme-tokens';

const LARGE = { defaultProps: { size: 'lg' } } as const;

/**
 * Every date input is bounded to the sane calendar range, so a mistyped year (2062 for 2026, or
 * 9999) is refused at the keyboard instead of reaching the server or the project timeline (PD-01).
 * A screen with a narrower range passes its own `minDate`/`maxDate`, which wins over this default.
 */
const DATE_BOUNDS = { minDate: CALENDAR_DATE_MIN, maxDate: CALENDAR_DATE_MAX } as const;

/** Overlay behind modals and drawers: the identity navy at the handoff's veil strength. */
const OVERLAY = { color: 'var(--jp-canvas)', backgroundOpacity: 0.73 } as const;

/** Primary action = lime with navy text (never white on lime); a coloured `color` prop opts out. */
const PrimaryButton = Button.extend({
  defaultProps: { size: 'lg' },
  vars: (_theme, props) =>
    (props.variant ?? 'filled') === 'filled' && !props.color
      ? {
          root: {
            '--button-bg': 'var(--jp-primary)',
            '--button-hover': 'var(--jp-primary-hover)',
            '--button-color': 'var(--jp-on-primary)',
            '--button-bd': `${rem(1)} solid var(--jp-primary-border)`,
          },
        }
      : { root: {} },
});

/** Badge status size in px (R11 §3.2.2): text 16, height 32, horizontal padding 12. */
const BADGE_FONT_SIZE = 16;
const BADGE_HEIGHT = 32;
const BADGE_PADDING_X = 12;

/**
 * Component defaults (R11 §3.2.2, X1 D2): Button/inputs `lg` (50 px), ActionIcon `xl` (44 px),
 * Checkbox/Radio/Switch `lg`. `rem()` returns `calc(N/16 rem * var(--mantine-scale))`, so Badge
 * dimensions follow the text scale too.
 */
export const themeComponents: MantineThemeComponents = {
  Button: PrimaryButton,
  TextInput: LARGE,
  PasswordInput: LARGE,
  Textarea: LARGE,
  NumberInput: LARGE,
  Select: LARGE,
  // Project forms use DateInput (CLAUDE.md); left at `md` it would sit next to 50 px inputs.
  DateInput: { defaultProps: { ...LARGE.defaultProps, ...DATE_BOUNDS } },
  // Event form (S7): TimeInput and MultiSelect also sit beside 50 px inputs and defaulted to `md`.
  TimeInput: LARGE,
  MultiSelect: LARGE,
  Checkbox: LARGE,
  Radio: LARGE,
  Switch: LARGE,
  ActionIcon: { defaultProps: { size: 'xl' } },
  // Card 14 px and modal 16 px (RADIUS); anything else follows the 10 px control default.
  Paper: { defaultProps: { radius: RADIUS.card } },
  Card: { defaultProps: { radius: RADIUS.card } },
  Modal: { defaultProps: { radius: RADIUS.modal, overlayProps: OVERLAY } },
  Drawer: { defaultProps: { radius: RADIUS.modal, overlayProps: OVERLAY } },
  Badge: {
    defaultProps: { size: 'lg' },
    vars: () => ({
      root: {
        '--badge-fz': rem(BADGE_FONT_SIZE),
        '--badge-height': rem(BADGE_HEIGHT),
        '--badge-padding-x': rem(BADGE_PADDING_X),
      },
    }),
  },
};
