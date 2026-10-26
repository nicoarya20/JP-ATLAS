import type { MantineThemeComponents } from '@mantine/core';
import { CALENDAR_DATE_MAX, CALENDAR_DATE_MIN } from '@server/metrics/dates';
import { parseDateInput } from './date-parse';

/**
 * Theme defaults for every DateInput: `lg` to match the 50 px inputs beside it, the sane calendar
 * range, and the strict parser. A screen passing its own `minDate`/`maxDate`/`dateParser` wins.
 *
 * - Bounds (PD-01): a mistyped year (2062 for 2026, or 9999) is refused at the keyboard instead of
 *   reaching the server or the project timeline.
 * - Parser: without one Mantine falls back to `new Date(value)`, where the first keystroke "2" of
 *   "25 Oktober 2026" is already a valid date (1 February 2001) and gets locked in on blur. The
 *   strict parser returns `null` for partial input, so the typed text survives until it is real.
 */
export const dateInputDefaults: MantineThemeComponents[string] = {
  defaultProps: {
    size: 'lg',
    minDate: CALENDAR_DATE_MIN,
    maxDate: CALENDAR_DATE_MAX,
    dateParser: parseDateInput,
  },
};
