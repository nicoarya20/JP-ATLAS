import { type MantineThemeComponents, rem } from '@mantine/core';

const LARGE = { defaultProps: { size: 'lg' } } as const;

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
  Button: LARGE,
  TextInput: LARGE,
  PasswordInput: LARGE,
  Textarea: LARGE,
  NumberInput: LARGE,
  Select: LARGE,
  // Project forms use DateInput (CLAUDE.md); left at `md` it would sit next to 50 px inputs.
  DateInput: LARGE,
  Checkbox: LARGE,
  Radio: LARGE,
  Switch: LARGE,
  ActionIcon: { defaultProps: { size: 'xl' } },
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
