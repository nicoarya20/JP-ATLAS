/*
 * The stat chips of Home.
 *
 * A chip is only shown when the server sends a number that means what its label says (K6: no
 * invented numbers). "Assigned" is `focus.total` (my open tasks, with `overdueTotal` under it);
 * "Completed" is `done.total`, worded as what it is — finished this week across my projects, by
 * anyone (GAP H-3). In Progress and Upcoming come with `GET /api/app/tasks/counts` in the Tasks
 * wave (H-1, H-2, H-4); the Admin chips have no workspace-wide number on Home (H-5, H-6). The GAPs
 * and the reasons are in `mobile/docs/phase2-gap-disembunyikan.md`.
 */
import type { HomeDoneWire, HomeFocusWire, Widget } from './home.api';
import type { HomeTarget, StatChip, StatKey, StatSub } from './home.types';

const TARGET: Record<StatKey, HomeTarget> = {
  assigned: 'tasks.all',
  completed: 'tasks.all',
  inbox: 'inbox.respond',
};

const chip = (key: StatKey, count: number | null, sub: StatSub, alert = false): StatChip => ({
  key,
  count,
  sub,
  alert,
  target: TARGET[key],
});

/**
 * The chips Home can stand behind. A section that failed simply has no chip: an empty space is
 * honest, a zero would not be. `inboxAction` is the Inbox's action count, or null while it has no
 * source (the chip is then left out).
 */
export function homeStats(
  focus: Widget<HomeFocusWire>,
  done: Widget<HomeDoneWire>,
  inboxAction: number | null,
): StatChip[] {
  const chips: StatChip[] = [];
  if (focus.ok) {
    const { total, overdueTotal } = focus.data;
    chips.push(
      chip(
        'assigned',
        total,
        overdueTotal > 0 ? { kind: 'overdue', n: overdueTotal } : { kind: 'onTrack' },
        overdueTotal > 0,
      ),
    );
  }
  if (done.ok) chips.push(chip('completed', done.data.total, { kind: 'thisWeekMyProjects' }));
  if (inboxAction !== null) {
    chips.push(
      chip(
        'inbox',
        null,
        inboxAction > 0 ? { kind: 'toRespond', n: inboxAction } : { kind: 'caughtUp' },
      ),
    );
  }
  return chips;
}
