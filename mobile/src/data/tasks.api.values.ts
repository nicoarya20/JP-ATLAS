/**
 * The dictionary between the server's values and the screens' words, both ways.
 *
 * The server speaks in enums (`in_progress`, `low`, `out_of_scope`) and this app has always shown
 * words (`In progress`, `Low`, `Outside the project scope`). Keeping the two in one file means a
 * screen never pattern-matches a server string and a request never carries a label: everything
 * crossing that line is one lookup, and a value the server adds that this app does not know about
 * fails loudly here rather than rendering as a blank chip.
 *
 * Nothing here decides anything. What a viewer may do is `can{}`'s answer (`tasks.api.map.ts`),
 * what day it is is the clock's (`clock.ts`). Only types are imported from the modules that will
 * import this one back, so there is no cycle to reason about at load time.
 */

import type {
  WireCancelCategory,
  WirePrimaryAction,
  WirePriority,
  WireScheduleGroup,
  WireTaskCapKey,
  WireTaskStatus,
} from './tasks.api.types';
import type { BoardStatus } from './tasks.columns';
import type { TaskActionKey } from './tasks.detail';
import { GROUPS } from './tasks.groups';
import { SORT_DUE, STATUSES } from './tasks.query';
import type { TaskPriority, TaskStatus } from './tasks.shared';

/** Thrown for a value neither side knows: a server that grew a case this app has not learnt. */
const unknownValue = (what: string, value: unknown) =>
  new Error(`Unknown ${what} from the server: ${JSON.stringify(value)}`);

const STATUS_WORD: Record<WireTaskStatus, TaskStatus> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
  canceled: 'Canceled',
};

const STATUS_WIRE = Object.fromEntries(
  Object.entries(STATUS_WORD).map(([wire, word]) => [word, wire]),
) as Record<TaskStatus, WireTaskStatus>;

/** `in_progress` → `In progress`. */
export function statusWord(status: WireTaskStatus): TaskStatus {
  const word = STATUS_WORD[status];
  if (!word) throw unknownValue('task status', status);
  return word;
}

/** `In progress` → `in_progress`, for a request. */
export const statusWire = (status: TaskStatus): WireTaskStatus => STATUS_WIRE[status];

const PRIORITY_WORD: Record<WirePriority, TaskPriority> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const PRIORITY_WIRE = Object.fromEntries(
  Object.entries(PRIORITY_WORD).map(([wire, word]) => [word, wire]),
) as Record<TaskPriority, WirePriority>;

export function priorityWord(priority: WirePriority): TaskPriority {
  const word = PRIORITY_WORD[priority];
  if (!word) throw unknownValue('task priority', priority);
  return word;
}

export const priorityWire = (priority: TaskPriority): WirePriority => PRIORITY_WIRE[priority];

/**
 * Cancel categories in the order the sheet's five radio texts are in (`CANCEL_REASONS` in
 * `tasks.actions.ts`, `TASK_CANCEL_CATEGORIES` on the server). The sheet sends a category and a
 * note as two fields — never the one joined sentence the prototype logged, which the server has no
 * column for.
 */
export const CANCEL_CATEGORIES: readonly WireCancelCategory[] = [
  'duplicate',
  'not_needed',
  'out_of_scope',
  'created_by_mistake',
  'other',
];

/** The category a radio index picks, or null when nothing valid is picked. */
export const cancelCategoryOf = (pick: number): WireCancelCategory | null =>
  CANCEL_CATEGORIES[pick] ?? null;

/** The radio index a category the server sent back stands for; -1 when it is one we do not know. */
export const cancelPickOf = (category: WireCancelCategory): number =>
  CANCEL_CATEGORIES.indexOf(category);

/**
 * The schedule groups My tasks asks for, in the order it shows them, with the title of each.
 *
 * `none` is a group of its own because the server has one: a task with no due date belongs to no
 * dated group, and folding it into "Later" would be this app inventing a day for it. The two closed
 * groups (`Done`, `Canceled`) are not schedule groups at all — they are asked for by status.
 */
export const SCHEDULE_GROUPS: readonly { group: WireScheduleGroup; title: string }[] = [
  { group: 'overdue', title: GROUPS[0] },
  { group: 'today', title: GROUPS[1] },
  { group: 'tomorrow', title: GROUPS[2] },
  { group: 'week', title: GROUPS[3] },
  { group: 'later', title: GROUPS[4] },
  { group: 'none', title: 'No due date' },
];

/** The two groups asked for by status rather than by due date, after the dated ones. */
export const CLOSED_GROUPS: readonly { status: WireTaskStatus; title: string }[] = [
  { status: 'done', title: GROUPS[5] },
  { status: 'canceled', title: GROUPS[6] },
];

/** The three open statuses "All active" means; an empty `status` would include Done and Canceled. */
export const ACTIVE_STATUSES: readonly WireTaskStatus[] = ['todo', 'in_progress', 'in_review'];

/**
 * The statuses a Status filter index asks the server for. Index 0 ("All active") is the three open
 * ones spelled out, because an empty `status` means *every* status on the server.
 */
export function statusesOf(index: number): readonly WireTaskStatus[] {
  if (index === 0) return ACTIVE_STATUSES;
  const word = STATUSES[index];
  if (!word) throw new Error(`No status filter #${index}`);
  return [statusWire(word as TaskStatus)];
}

/** Sorts the server offers, by the filter sheet's index; "Title (A–Z)" has none (A16, hidden). */
const SORT_WIRE: readonly (string | null)[] = ['due', 'priority', 'updated', null];

/** The `sort=` a filter index asks for, falling back to the default when that sort is not offered. */
export const sortWire = (index: number): string => SORT_WIRE[index] ?? SORT_WIRE[SORT_DUE] ?? 'due';

/** Whether a sort index is one the server can do; the filter must not offer the others (A16). */
export const sortSupported = (index: number): boolean => SORT_WIRE[index] != null;

/** The detail button a server-picked `primary` is: the same six steps, in this app's words. */
const PRIMARY_ACTION: Record<WirePrimaryAction, TaskActionKey> = {
  start: 'start',
  complete: 'markDone',
  requestReview: 'requestReview',
  approve: 'approve',
  reopen: 'reopen',
  uncancel: 'restore',
};

export function primaryActionKey(primary: WirePrimaryAction): TaskActionKey {
  const key = PRIMARY_ACTION[primary];
  if (!key) throw unknownValue('primary action', primary);
  return key;
}

/** The `can{}` key each detail button obeys, and the step it posts to. */
const ACTION_STEP: Record<TaskActionKey, { cap: WireTaskCapKey; path: string }> = {
  start: { cap: 'start', path: 'start' },
  markDone: { cap: 'complete', path: 'complete' },
  requestReview: { cap: 'requestReview', path: 'request-review' },
  reopen: { cap: 'reopen', path: 'reopen' },
  approve: { cap: 'approve', path: 'approve' },
  restore: { cap: 'uncancel', path: 'uncancel' },
};

/** The capability a detail button needs and the path it posts to. */
export const actionStep = (key: TaskActionKey) => ACTION_STEP[key];

/** The path of a step named by its capability key (`complete` → `complete`, `requestReview` → `request-review`). */
const STEP_OF_CAP: Partial<Record<WireTaskCapKey, string>> = {
  start: 'start',
  unstart: 'unstart',
  complete: 'complete',
  requestReview: 'request-review',
  approve: 'approve',
  reopen: 'reopen',
  uncancel: 'uncancel',
};

/**
 * The capability a move to a board column needs, by the status the card is in now.
 *
 * The board shows statuses, but the server takes steps, and only the twelve transitions of
 * `TASK_TRANSITIONS` exist. So a side of the move menu is offered when that card's `can{}` carries
 * the key for the step — which is why a side can be available on one card and not on the next, and
 * why nothing here needs to know the viewer's role.
 */
const MOVE_CAP: Record<TaskStatus, Partial<Record<BoardStatus, WireTaskCapKey>>> = {
  'To do': { 'In progress': 'start', Done: 'complete' },
  'In progress': { 'To do': 'unstart', 'In review': 'requestReview', Done: 'complete' },
  'In review': { Done: 'approve' },
  Done: { 'In progress': 'reopen' },
  Canceled: { 'To do': 'uncancel' },
};

/** The `can{}` key a move from `from` to `to` needs, or null when there is no such transition. */
export const moveCapKey = (from: TaskStatus, to: BoardStatus): WireTaskCapKey | null =>
  MOVE_CAP[from]?.[to] ?? null;

/** The path a move from `from` to `to` posts to, or null when there is no such transition. */
export function moveStep(from: TaskStatus, to: BoardStatus): string | null {
  const cap = moveCapKey(from, to);
  return cap ? (STEP_OF_CAP[cap] ?? null) : null;
}
