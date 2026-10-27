import { Button, type MantineThemeComponents, rem } from '@mantine/core';
import { dateInputDefaults } from './theme-date-input';
import { RADIUS } from './theme-tokens';

const LARGE = { defaultProps: { size: 'lg' } } as const;

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
  // Project forms use DateInput (CLAUDE.md); its defaults live in ./theme-date-input.
  DateInput: dateInputDefaults,
  // Event form (S7): TimeInput and MultiSelect also sit beside 50 px inputs and defaulted to `md`.
  TimeInput: LARGE,
  MultiSelect: LARGE,
  Checkbox: LARGE,
  Radio: LARGE,
  Switch: LARGE,
  ActionIcon: { defaultProps: { size: 'xl' } },
  // Card 14 px and modal 16 px (RADIUS); anything else follows the 10 px control default.
  // A card is bordered unless it opts out: 116 of 121 call sites asked for it by hand. `Card`
  // renders a `Paper` and inherits this; Modal, Drawer, Menu and Popover dropdowns do not.
  Paper: { defaultProps: { radius: RADIUS.card, withBorder: true } },
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
