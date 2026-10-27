// Task DTOs as `/api/app/tasks*` sends them, for the Tasks suites. Built from the server's shapes
// (server/task/task.dto.ts), with the sample's own day (TEST_CLOCK) as "today", so a fixture's due
// date can be read as "two days overdue" the way the prototype's rows were.
import type {
  WireCaps,
  WirePrimaryAction,
  WireTaskCounts,
  WireTaskDetail,
  WireTaskListItem,
  WireTaskPage,
  WireTaskStatus,
  WireTimelineEntry,
  WireTimelinePage,
} from '@/data/tasks.api.types';

/** Everything a Manager may do to an open task, as the server would send it. */
export const CAN_ALL: WireCaps = {
  update: true,
  start: true,
  complete: true,
  cancel: true,
  comment: true,
  trash: true,
};

/**
 * What a Manager may do to a task in each status, as `server/access/capabilities.ts` answers it.
 *
 * Per status and not one blanket map, because `can{}` is the whole of how this app decides what to
 * offer: a fixture that says a finished task may be started would have the screens under test
 * offering a step the server would refuse. `approve` and `return` are left out of `in_review` on
 * purpose — the server sends them but their routes answer 404 until S4 (A6).
 */
export const CAPS_OF: Record<WireTaskStatus, WireCaps> = {
  todo: CAN_ALL,
  in_progress: {
    update: true,
    unstart: true,
    complete: true,
    cancel: true,
    comment: true,
    trash: true,
  },
  in_review: { update: true, cancel: true, comment: true, trash: true },
  done: { update: true, reopen: true, comment: true, trash: true },
  canceled: { uncancel: true, comment: true, trash: true },
};

/** The one step the server highlights per status. */
export const PRIMARY_OF: Record<WireTaskStatus, WirePrimaryAction | null> = {
  todo: 'start',
  in_progress: 'complete',
  in_review: 'approve',
  done: 'reopen',
  canceled: 'uncancel',
};

/** One list row; every field has a default, so a test names only what it is about. */
export function wireItem(over: Partial<WireTaskListItem> = {}): WireTaskListItem {
  const status = over.status ?? 'todo';
  return {
    id: 't-12',
    number: 12,
    title: 'Fix login layout',
    priority: 'high',
    dueDate: '2026-10-05',
    assignee: { id: 'u-nico', name: 'Nico' },
    project: { id: 'p-atlas', name: 'Atlas Project', status: 'active' },
    phase: null,
    labels: [],
    checklist: { done: 0, total: 0 },
    status,
    primary: PRIMARY_OF[status],
    can: CAPS_OF[status],
    ...over,
  };
}

/** One page of the list endpoint. */
export const wirePage = (
  items: WireTaskListItem[] = [wireItem()],
  over: Partial<WireTaskPage> = {},
): WireTaskPage => ({ items, nextCursor: null, caps: { createTask: true }, ...over });

/** One task detail. */
export function wireDetail(over: Partial<WireTaskDetail> = {}): WireTaskDetail {
  const { checklist, ...rest } = over;
  return {
    ...wireItem(rest as Partial<WireTaskListItem>),
    description: 'Make the form fit on a phone.',
    startDate: null,
    kind: { id: 'k-bug', name: 'Bug', baseKind: 'issue' },
    creator: { id: 'u-nico', name: 'Nico' },
    reviewer: null,
    needsReview: false,
    reopenCount: 0,
    cancel: null,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: '2026-10-01T02:30:00.000Z',
    updatedAt: '2026-10-06T07:15:00.000Z',
    checklist: checklist ?? { done: 0, total: 0, items: [] },
    ...(rest as Partial<WireTaskDetail>),
  };
}

/** Counts with every group at zero, plus whatever the test sets. */
export function wireCounts(
  over: {
    mine?: Partial<WireTaskCounts['mine']>;
    byStatus?: Partial<WireTaskCounts['byStatus']>;
  } = {},
): WireTaskCounts {
  return {
    mine: { overdue: 0, today: 0, tomorrow: 0, week: 0, later: 0, none: 0, ...over.mine },
    byStatus: { todo: 0, in_progress: 0, in_review: 0, done: 0, canceled: 0, ...over.byStatus },
  };
}

/** One activity row of the timeline. */
export const wireActivity = (
  action: string,
  over: Partial<Extract<WireTimelineEntry, { kind: 'activity' }>> = {},
): WireTimelineEntry => ({
  kind: 'activity',
  id: `a-${action}`,
  at: '2026-10-06T07:15:00.000Z',
  author: { id: 'u-nico', name: 'Nico' },
  action,
  payload: null,
  ...over,
});

/** One comment row of the timeline. */
export const wireComment = (
  body: string,
  over: Partial<Extract<WireTimelineEntry, { kind: 'comment' }>> = {},
): WireTimelineEntry => ({
  kind: 'comment',
  id: 'c-1',
  at: '2026-10-06T08:00:00.000Z',
  author: { id: 'u-rina', name: 'Rina' },
  body,
  editedAt: null,
  ...over,
});

export const wireTimeline = (
  items: WireTimelineEntry[] = [],
  nextCursor: string | null = null,
): WireTimelinePage => ({ items, nextCursor });
