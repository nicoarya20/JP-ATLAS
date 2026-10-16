import { diffDays } from '@server/metrics/dates';
import { DUMMY_TODAY } from '../../lib/dummy-clock';
import { RETENTION_DAYS, type TrashItem, type TrashKind } from './trash.dummy';

/** Days left before the item is purged for good (never negative). */
export function daysLeft(item: TrashItem, today = DUMMY_TODAY): number {
  return Math.max(0, RETENTION_DAYS - diffDays(item.deletedAt, today));
}

/** Items of one kind, or all of them when `kind` is "all". */
export function ofKind(items: readonly TrashItem[], kind: TrashKind | 'all'): TrashItem[] {
  return kind === 'all' ? [...items] : items.filter((i) => i.kind === kind);
}

/** Counts shown on the tabs: Semua (2), Proyek (0), Tugas (1), Event (1). */
export function countsOf(items: readonly TrashItem[]): Record<TrashKind | 'all', number> {
  return {
    all: items.length,
    project: ofKind(items, 'project').length,
    task: ofKind(items, 'task').length,
    event: ofKind(items, 'event').length,
  };
}
