// A stubbed `/api/app/tasks*` for the Tasks screen tests: the list, its counts and one detail,
// answered from a fixture the way the server would answer them. The point is that the *parameters*
// are honoured — `due=`, `status=`, `q=`, `cursor=` — because a screen test that is served the same
// rows whatever it asks for proves nothing about the request it made.
import { daysBetween, daysToSunday } from '@/data/dates';
import type { WireScheduleGroup, WireTaskListItem, WireTaskStatus } from '@/data/tasks.api.types';

import { TEST_CLOCK } from './session-fixtures';
import { wireCounts, wireDetail, wireItem, wirePage, wireTimeline } from './tasks-wire';

/** The schedule group an open task falls in, as `server/metrics/schedule.ts` decides it. */
export function groupOfDue(dueDate: string | null, today = TEST_CLOCK.today): WireScheduleGroup {
  if (!dueDate) return 'none';
  const days = daysBetween(today, dueDate);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return days <= daysToSunday(today) ? 'week' : 'later';
}

/**
 * The rows the Tasks screen tests are served: one per schedule group plus a finished one, numbered
 * as the prototype's fixtures were so the assertions still read about the same tasks.
 */
export const SAMPLE_ROWS: WireTaskListItem[] = [
  wireItem({ id: 't-12', number: 12, title: 'Fix login layout', dueDate: '2026-10-05' }),
  wireItem({
    id: 't-14',
    number: 14,
    title: 'Write the release notes',
    dueDate: TEST_CLOCK.today,
    status: 'in_progress',
    priority: 'medium',
  }),
  wireItem({ id: 't-9', number: 9, title: 'Check the SSO redirect', dueDate: '2026-10-08' }),
  wireItem({
    id: 't-17',
    number: 17,
    title: 'Review the onboarding copy',
    dueDate: '2026-10-09',
    status: 'in_review',
  }),
  wireItem({
    id: 't-3',
    number: 3,
    title: 'Ship the banner',
    dueDate: '2026-09-30',
    status: 'done',
  }),
];

const paramsOf = (url: string) => new URLSearchParams(url.slice(url.indexOf('?') + 1));

/** The rows one list request asks for, filtered the way the server filters them. */
export function rowsFor(url: string, rows: readonly WireTaskListItem[] = SAMPLE_ROWS) {
  const p = paramsOf(url);
  const statuses = p.getAll('status') as WireTaskStatus[];
  const due = p.get('due') as WireScheduleGroup | null;
  const q = (p.get('q') ?? '').toLowerCase();
  const priority = p.getAll('priority');
  return rows.filter((r) => {
    if (statuses.length && !statuses.includes(r.status)) return false;
    if (due && groupOfDue(r.dueDate) !== due) return false;
    if (priority.length && !priority.includes(r.priority)) return false;
    // The server matches the title, or a number exactly (A15) — no prefixes, no tags.
    if (q && !r.title.toLowerCase().includes(q) && q !== String(r.number)) return false;
    return true;
  });
}

/** Routes for `serveAuth`: the task list, the counts, one detail and an empty timeline. */
export function taskApiRoutes(rows: readonly WireTaskListItem[] = SAMPLE_ROWS) {
  return {
    '/api/app/tasks/counts': () => ({
      body: wireCounts({
        mine: {
          overdue: rowsFor('?status=todo&due=overdue', rows).length,
          today: rowsFor('?status=todo&status=in_progress&due=today', rows).length,
        },
        byStatus: { todo: rows.filter((r) => r.status === 'todo').length },
      }),
    }),
    '/timeline': { body: wireTimeline() },
    '/api/app/tasks/form-options': { body: { projects: [] } },
  };
}

/** The list route itself; kept apart so a test can put a failure or a cursor in front of it. */
export const taskListRoute = (rows: readonly WireTaskListItem[] = SAMPLE_ROWS) => ({
  '/api/app/tasks?': (url: string) => ({ body: wirePage(rowsFor(url, rows)) }),
});

export { wireDetail, wireItem, wirePage };
