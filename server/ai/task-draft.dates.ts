/**
 * Turns the relative or structured due-date token the model returns into a calendar date. The model
 * never writes a date it computed itself: it only says what the story said ("besok", "Jumat",
 * "tanggal 15"), and this file resolves it against "today" given by the caller (team zone, server).
 */
import type { IsoDate } from '../metrics/dates';
import { diffDays } from '../metrics/dates';
import { TASK_DRAFT_DATE_WINDOW_DAYS, TASK_DRAFT_OFFSET_MAX_DAYS } from './task-draft.limits';

/** Monday first, the order of an Indonesian week. */
export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** What the model may say about a due date. */
export type DueToken =
  /** "hari ini" = 0, "besok" = 1, "lusa" = 2, "minggu depan" = 7. */
  | { kind: 'offset'; days: number }
  /** "Jumat" (`next: false`: the coming Friday, today counts) or "Jumat depan" (`next: true`: Friday of next week). */
  | { kind: 'weekday'; weekday: Weekday; next: boolean }
  /** "tanggal 15" (`month: null`) or "15 November": the next such day from today on. */
  | { kind: 'monthday'; day: number; month: number | null }
  /** A full date written in the story. */
  | { kind: 'date'; iso: string };

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_PER_WEEK = 7;
const MONTHS_PER_YEAR = 12;
// Feb 29 falls in a leap year at most 8 years away (the century rule), so this horizon always finds it.
const YEARS_AHEAD = 9;

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number): IsoDate => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function partsOf(iso: string): [number, number, number] | null {
  const m = ISO_RE.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  // Round trip: `2026-02-30` would otherwise roll over to March.
  const ok = mo >= 1 && mo <= MONTHS_PER_YEAR && d >= 1 && d <= daysInMonth(y, mo);
  return ok ? [y, mo, d] : null;
}

/** `iso` moved by `n` calendar days (UTC arithmetic, so DST cannot shift it). */
export function addDays(iso: IsoDate, n: number): IsoDate {
  const [y, m, d] = partsOf(iso) ?? [1970, 1, 1];
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** 0 = Monday ... 6 = Sunday. */
function weekdayIndex(iso: IsoDate): number {
  const [y, m, d] = partsOf(iso) ?? [1970, 1, 1];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
}

function resolveWeekday(today: IsoDate, weekday: Weekday, next: boolean): IsoDate {
  const target = WEEKDAYS.indexOf(weekday);
  const from = weekdayIndex(today);
  if (!next) return addDays(today, (target - from + DAYS_PER_WEEK) % DAYS_PER_WEEK);
  return addDays(today, DAYS_PER_WEEK - from + target); // Monday of next week, then forward
}

/** The first date on or after `today` whose day is `day` (and month `month` when given). */
function resolveMonthDay(today: IsoDate, day: number, month: number | null): IsoDate | null {
  const [ty, tm] = partsOf(today) ?? [1970, 1];
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (month !== null && (!Number.isInteger(month) || month < 1 || month > MONTHS_PER_YEAR)) {
    return null;
  }
  for (let i = 0; i < YEARS_AHEAD * MONTHS_PER_YEAR; i++) {
    const y = ty + Math.floor((tm - 1 + i) / MONTHS_PER_YEAR);
    const m = ((tm - 1 + i) % MONTHS_PER_YEAR) + 1;
    if ((month !== null && m !== month) || day > daysInMonth(y, m)) continue;
    const candidate = isoOf(y, m, day);
    if (candidate >= today) return candidate;
  }
  return null;
}

/** The date a token means on `today`, or null when it is out of range or not a real date. */
export function resolveDue(token: DueToken, today: IsoDate): IsoDate | null {
  switch (token.kind) {
    case 'offset':
      return Number.isInteger(token.days) &&
        token.days >= 0 &&
        token.days <= TASK_DRAFT_OFFSET_MAX_DAYS
        ? addDays(today, token.days)
        : null;
    case 'weekday':
      return WEEKDAYS.includes(token.weekday)
        ? resolveWeekday(today, token.weekday, token.next)
        : null;
    case 'monthday':
      return resolveMonthDay(today, token.day, token.month);
    case 'date': {
      if (!partsOf(token.iso)) return null;
      return Math.abs(diffDays(today, token.iso)) <= TASK_DRAFT_DATE_WINDOW_DAYS ? token.iso : null;
    }
  }
}
