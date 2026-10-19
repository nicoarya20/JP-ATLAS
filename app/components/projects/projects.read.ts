// DUMMY: pembantu baca/hitung untuk layar Proyek; ganti dengan data API saat S1 dibuat.
import { diffDays } from '@server/metrics/dates';
import { elapsed } from '@server/metrics/project.metrics';
import { DUMMY_TODAY } from '~/lib/dummy-clock';
import type { DummyTask } from '../tasks/tasks.dummy';
import type { DummyProject } from './projects.dummy';

const shortFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
/** `2026-10-31` → "31 Okt". */
export const shortDate = (iso: string) => shortFmt.format(new Date(`${iso}T00:00:00Z`));

export const percentDone = (p: Pick<DummyProject, 'done' | 'total'>) =>
  p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);

/** Share of the start-to-due span that has passed; 0 when the dates cannot say. */
export const percentTime = (p: Pick<DummyProject, 'start' | 'due'>, today: string = DUMMY_TODAY) =>
  elapsed(p.start, p.due, today)?.percent ?? 0;

/** Days until the due date; negative once it has passed. */
export const daysLeft = (p: Pick<DummyProject, 'due'>, today: string = DUMMY_TODAY) =>
  diffDays(today, p.due);

const OPEN: ReadonlySet<DummyTask['status']> = new Set(['todo', 'in_progress', 'in_review']);
const PRIORITY_RANK: Record<DummyTask['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** The few tasks of one project that need a look: late ones first, then waiting for review, then by date. */
export function attentionTasks(
  tasks: readonly DummyTask[],
  projectName: string,
  today: string = DUMMY_TODAY,
  limit = 3,
): DummyTask[] {
  const rank = (t: DummyTask) => (t.due < today ? 0 : t.status === 'in_review' ? 1 : 2);
  return tasks
    .filter((t) => t.project === projectName && OPEN.has(t.status))
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.due.localeCompare(b.due) ||
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
    )
    .slice(0, limit);
}

/** "Terlambat 2 hari", "Hari ini", "Besok" or the date: how a task's due date reads at a glance. */
export function dueText(due: string, today: string = DUMMY_TODAY): string {
  const d = diffDays(today, due);
  if (d < 0) return `Terlambat ${-d} hari`;
  if (d === 0) return 'Hari ini';
  if (d === 1) return 'Besok';
  return shortDate(due);
}
