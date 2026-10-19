import { diffDays } from '@server/metrics/dates';
import { DUMMY_TODAY } from '../../lib/dummy-clock';
import type { DummyEvent, EventKind } from './events.dummy';

const WEEK_DAYS = 7;
export type EventTab = 'upcoming' | 'past';
export type EventGroup = 'Hari ini' | 'Minggu ini' | 'Nanti';
const GROUPS: EventGroup[] = ['Hari ini', 'Minggu ini', 'Nanti'];

/** Today's events stay under "Akan datang" (even finished ones); only earlier days are "Sudah lewat". */
export function inTab(e: DummyEvent, tab: EventTab): boolean {
  const past = diffDays(DUMMY_TODAY, e.date) < 0;
  return tab === 'past' ? past : !past;
}

export function groupOf(e: DummyEvent): EventGroup {
  const days = diffDays(DUMMY_TODAY, e.date);
  if (days <= 0) return 'Hari ini';
  return days <= WEEK_DAYS ? 'Minggu ini' : 'Nanti';
}

/** Tab, search over title/location and kind filter, in date then start-time order. */
export function filterEvents(
  rows: readonly DummyEvent[],
  tab: EventTab,
  q: string,
  kind: EventKind | 'all',
): DummyEvent[] {
  const needle = q.trim().toLowerCase();
  return rows
    .filter((e) => inTab(e, tab))
    .filter((e) => kind === 'all' || e.kind === kind)
    .filter((e) => !needle || `${e.title} ${e.location}`.toLowerCase().includes(needle))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
}

/** Upcoming events grouped for the list; past events stay in one flat group. */
export function groupEvents(rows: readonly DummyEvent[], tab: EventTab) {
  if (tab === 'past') return rows.length ? [{ group: 'Sebelumnya', rows: [...rows] }] : [];
  return GROUPS.map((group) => ({
    group: group as string,
    rows: rows.filter((e) => groupOf(e) === group),
  })).filter((g) => g.rows.length > 0);
}
