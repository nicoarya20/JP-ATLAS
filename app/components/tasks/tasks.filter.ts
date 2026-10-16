import { diffDays } from '@server/metrics/dates';
import { DUMMY_TODAY } from '../../lib/dummy-clock';
import { type DummyTask, ME, NO_FILTERS, type TaskFilters } from './tasks.dummy';

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const WEEK_DAYS = 7;
export const GROUP_ORDER = [
  'Terlambat',
  'Hari ini',
  'Besok',
  'Minggu ini',
  'Nanti',
  'Selesai',
] as const;
export type TaskGroup = (typeof GROUP_ORDER)[number];

/** Which due-date bucket a task belongs to; finished tasks are never "late". */
export function groupOf(t: DummyTask): TaskGroup {
  if (t.status === 'done' || t.status === 'canceled') return 'Selesai';
  const days = diffDays(DUMMY_TODAY, t.due);
  if (days < 0) return 'Terlambat';
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  return days <= WEEK_DAYS ? 'Minggu ini' : 'Nanti';
}

/** Applies scope, search, chips, dropdown filters and the sort order. */
export function filterTasks(rows: readonly DummyTask[], f: TaskFilters): DummyTask[] {
  const needle = f.q.trim().toLowerCase().replace(/^#/, '');
  const kept = rows.filter((t) => {
    if (f.scope === 'mine' && t.assignee !== ME) return false;
    if (needle) {
      const hay = `${t.title} ${t.number} ${t.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (
      f.status === 'active' ? t.status === 'done' || t.status === 'canceled' : t.status !== f.status
    )
      return false;
    if (f.project && t.project !== f.project) return false;
    if (f.person && t.assignee !== f.person) return false;
    if (f.kind && t.kind !== f.kind) return false;
    if (f.priority && t.priority !== f.priority) return false;
    return !f.tag || t.tags.includes(f.tag);
  });
  return kept.sort((a, b) =>
    f.sort === 'priority'
      ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      : a.due.localeCompare(b.due),
  );
}

/** Rows split into due-date groups, in display order, skipping empty groups. */
export function groupTasks(rows: readonly DummyTask[]): { group: TaskGroup; rows: DummyTask[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    rows: rows.filter((t) => groupOf(t) === group),
  })).filter((g) => g.rows.length > 0);
}

/** Distinct values for a dropdown, sorted for stable options. */
export function distinct(rows: readonly DummyTask[], pick: (t: DummyTask) => string[]): string[] {
  return [...new Set(rows.flatMap(pick))].sort((a, b) => a.localeCompare(b, 'id'));
}

/** True when anything other than the default scope/sort narrows the list (drives the empty state). */
export function isFiltered(f: TaskFilters): boolean {
  return (
    f.q !== '' ||
    f.status !== NO_FILTERS.status ||
    [f.project, f.person, f.kind, f.priority, f.tag].some((v) => v !== null)
  );
}
