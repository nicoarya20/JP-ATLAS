// Task DTOs as `/api/app/tasks*` sends them, for the Tasks suites. Built from the server's shapes
// (server/task/task.dto.ts), with the sample's own day (TEST_CLOCK) as "today", so a fixture's due
// date can be read as "two days overdue" the way the prototype's rows were.
import type {
  WireCaps,
  WireTaskCounts,
  WireTaskDetail,
  WireTaskListItem,
  WireTaskPage,
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

/** One list row; every field has a default, so a test names only what it is about. */
export function wireItem(over: Partial<WireTaskListItem> = {}): WireTaskListItem {
  return {
    id: 't-12',
    number: 12,
    title: 'Fix login layout',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-10-05',
    assignee: { id: 'u-nico', name: 'Nico' },
    project: { id: 'p-atlas', name: 'Atlas Project', status: 'active' },
    phase: null,
    labels: [],
    checklist: { done: 0, total: 0 },
    primary: 'start',
    can: CAN_ALL,
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
export function wireCounts(over: Partial<WireTaskCounts> = {}): WireTaskCounts {
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
