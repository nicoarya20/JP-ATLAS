import type { DateStringValue } from '@mantine/dates';
import dayjs from 'dayjs';
// The locale file must stay in sync with DATES_LOCALE; a static path is the only way to load it.
import 'dayjs/locale/id';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { DATES_LOCALE } from './date-config';

dayjs.extend(customParseFormat);

/**
 * Formats a typed date may take, tried in order. Day comes before month (Indonesian convention)
 * and the year is always `YYYY`, so `25/10/26` stays ambiguous and is refused rather than guessed.
 */
const ACCEPTED_FORMATS = [
  'D MMMM YYYY',
  'DD MMMM YYYY',
  'D MMM YYYY',
  'DD MMM YYYY',
  'YYYY-MM-DD',
  'D/M/YYYY',
  'DD/MM/YYYY',
  'D-M-YYYY',
  'DD-MM-YYYY',
] as const;

/**
 * Collapses runs of whitespace and title-cases words, so `25  oktober 2026` and `25 OKTOBER 2026`
 * both reach dayjs as the `25 Oktober 2026` its strict matcher expects.
 */
const normalize = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[a-z]+/gi, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());

/**
 * Parses a date typed into a DateInput, returning `YYYY-MM-DD` or `null` for anything unparseable.
 *
 * Strict by design: a half-typed value (`2`, `25 Okt`) and a date that does not exist
 * (`31 Februari 2026`) both yield `null`, which makes the input keep the user's text instead of
 * locking in a wrong date. There is deliberately no `new Date(value)` fallback — `new Date('2')`
 * is 1 February 2001 in V8, which is how a keystroke used to become a silently saved wrong date.
 */
export function parseDateInput(value: string): DateStringValue | null {
  const text = normalize(value);
  if (!text) return null;
  for (const format of ACCEPTED_FORMATS) {
    const parsed = dayjs(text, format, DATES_LOCALE, true);
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
  }
  return null;
}
