/** Pure view logic of the Trash page: tab labels, one merged list, short dates and the card texts. */
import { describe, expect, it } from 'bun:test';
import type { TrashItem } from '../../app/lib/trash-api';
import {
  describeItem,
  formatShortDate,
  itemKey,
  mergePages,
  tabCount,
  tabOptions,
} from '../../app/lib/trash-view';

const base = {
  deletedAt: '2026-10-06T03:00:00.000Z', // test-only
  restorableUntil: '2026-11-04',
  daysLeft: 29,
  deletedBy: { id: 'u-1', name: 'Nico' },
  can: { restore: true as const },
};
const task = (id: string, over: Partial<Extract<TrashItem, { kind: 'task' }>> = {}): TrashItem => ({
  ...base,
  kind: 'task',
  id,
  number: 7,
  title: 'Cek tombol lama',
  project: { id: 'p-1', name: 'Atlas' },
  blockedBy: null,
  projectInTrash: false,
  ...over,
});

describe('tabOptions', () => {
  it('labels the four tabs with their counts, "Semua" being the sum', () => {
    const counts = { project: 1, task: 3, event: 1 };
    expect(tabOptions(counts)).toEqual([
      { value: 'all', label: 'Semua (5)' },
      { value: 'project', label: 'Proyek (1)' },
      { value: 'task', label: 'Tugas (3)' },
      { value: 'event', label: 'Event (1)' },
    ]);
    expect(tabCount(counts, 'all')).toBe(5);
    expect(tabCount(counts, 'task')).toBe(3);
  });

  it('shows zero counts instead of hiding the tab', () => {
    expect(tabOptions({ project: 0, task: 0, event: 0 }).map((o) => o.label)).toEqual([
      'Semua (0)',
      'Proyek (0)',
      'Tugas (0)',
      'Event (0)',
    ]);
  });
});

describe('mergePages', () => {
  it('keeps the server order and shows a row once when two pages overlap', () => {
    const a = task('a');
    const b = task('b');
    const c = task('c');
    expect(mergePages([{ items: [a, b] }, { items: [b, c] }]).map((i) => i.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('tells apart the same id under two kinds', () => {
    const event = { ...task('x'), kind: 'event' } as unknown as TrashItem;
    expect(mergePages([{ items: [task('x'), event] }])).toHaveLength(2);
    expect(itemKey(task('x'))).not.toBe(itemKey(event));
  });

  it('is empty for no pages', () => {
    expect(mergePages([])).toEqual([]);
  });
});

describe('formatShortDate', () => {
  it('prints the day in the team zone without the year', () => {
    expect(formatShortDate('2026-10-06T03:00:00.000Z')).toBe('6 Okt');
    // 17:30 UTC is already the next day in Jakarta (UTC+7).
    expect(formatShortDate('2026-09-29T17:30:00.000Z')).toBe('30 Sep');
  });

  it('does not throw on garbage', () => {
    expect(formatShortDate('nope')).toBe('—');
  });
});

describe('describeItem', () => {
  it('writes the wireframe line of a task and marks nothing as blocked', () => {
    const v = describeItem(task('t'));
    expect(v.title).toBe('#7 Cek tombol lama');
    expect(v.info).toBe('Proyek Atlas · Dihapus oleh Nico · 6 Okt · Sisa 29 hari');
    expect(v.chip).toBe('Tugas');
    expect(v.blocked).toBeNull();
  });

  it('flags the project in the Trash and carries what "Lihat proyeknya" needs', () => {
    const v = describeItem(
      task('t', {
        projectInTrash: true,
        blockedBy: { projectId: 'p-1', name: 'Atlas', visible: true },
      }),
    );
    expect(v.info).toContain('Proyek Atlas (ada di Sampah)');
    expect(v.blocked).toEqual({ projectId: 'p-1', visible: true });
  });

  it('omits the cascade note of an empty project', () => {
    const v = describeItem({
      ...base,
      kind: 'project',
      id: 'p',
      name: 'Kosong',
      cascade: { tasks: 0, events: 0 },
    });
    expect(v.info).toBe('Dihapus oleh Nico · 6 Okt · Sisa 29 hari');
    expect(v.chip).toBe('Proyek');
  });
});
