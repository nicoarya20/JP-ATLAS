/**
 * A task card as the lists and the board show it, and how a `GET /api/app/tasks` row becomes one
 * (map `phase2-map-tasks.md` §2a).
 *
 * Nothing about permission is decided here: which statuses a card may move to comes from the row's
 * `can{}` (the client rule `mayChange` is gone), and a greyed-out move says why in
 * the server's terms through `caps.messages.ts`. Dates are calendar days compared with the server's
 * "today" (K1); the type is not on list rows (T-3), so a server card has none.
 */
import { capMessage } from './caps.messages';
import { today } from './clock';
import { daysBetween, monthDay } from './dates';
import type { BoardStatus } from './tasks.columns';
import { daysLate, type TaskPriority, type TaskStatus } from './tasks.shared';
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  type TaskCapsWire,
  type TaskLabelWire,
  type TaskListItemWire,
  type TaskStatusWire,
} from './tasks.wire';

export type TaskCard = {
  no: number;
  /** The server's id (Trash and writes need it). */
  id: string;
  title: string;
  project: string;
  /** Task type; null for a server row, whose list item does not carry it (T-3). */
  type: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  people: { name: string; full: string }[];
  /** "Nico Pratama +1", or "Unassigned". */
  whoLabel: string;
  /** Badges beyond the status ("Reopened · Blocked"), or the sample's own note; may be empty. */
  note: string;
  /** "Oct 5", or '' for a task without a due date. */
  due: string;
  /** Lists: past due. Board: past due and not Done. */
  late: boolean;
  lateOnBoard: boolean;
  /** "2 days late" when past due, shown with the red date so lateness is not told by colour alone. */
  lateBy: string | null;
  /** "2/3", or null without steps. */
  steps: string | null;
  /** Statuses the board may move it to now. */
  moves: readonly BoardStatus[];
  /** Why holding it moves nothing (a notice), or null when it has a move. */
  denied: string | null;
  /** The step a card's own button takes (a project's Tasks tab), or null: the card then only opens. */
  step: CardStep | null;
};

/**
 * Steps a card's button may take: the server's `primary` when `can{}` allows it now. Reopen needs a
 * reason (its sheet is on the detail) and the review steps wait for S4 (T-1), so those cards open.
 */
export type CardStep = 'start' | 'complete' | 'uncancel';
const CARD_STEPS: readonly string[] = ['start', 'complete', 'uncancel'] satisfies CardStep[];

/** The step of a row's button, or null. */
export const cardStep = (t: Pick<TaskListItemWire, 'primary' | 'can'>): CardStep | null =>
  t.primary && CARD_STEPS.includes(t.primary) && t.can[t.primary as CardStep] === true
    ? (t.primary as CardStep)
    : null;

/** The workflow step a board move takes; a pair not listed has no single step (reopen needs a reason). */
export type MoveAction = 'start' | 'unstart' | 'complete';

const MOVE_ACTION: Partial<Record<TaskStatusWire, Partial<Record<BoardStatus, MoveAction>>>> = {
  todo: { 'In progress': 'start', Done: 'complete' },
  in_progress: { 'To do': 'unstart', Done: 'complete' },
};

/** The step that moves a task from `from` to `to` on the board, or null. */
export const moveActionOf = (from: TaskStatusWire, to: BoardStatus): MoveAction | null =>
  MOVE_ACTION[from]?.[to] ?? null;

export const CARD_TEXT = {
  unassigned: 'Unassigned',
  noMove: "You can't move this task.",
  reopenFirst: 'Open the task to reopen it with a reason.',
  label: {
    blocked: 'Blocked',
    stale: 'No update lately',
    reopened: 'Reopened',
  } as Partial<Record<TaskLabelWire, string>>,
} as const;

/** Where `can{}` lets the board move a task in `status`, and why not when it lets it nowhere. */
export function boardMoves(
  status: TaskStatusWire,
  can: TaskCapsWire,
): Pick<TaskCard, 'moves' | 'denied'> {
  const pairs = Object.entries(MOVE_ACTION[status] ?? {}) as [BoardStatus, MoveAction][];
  const moves = pairs.filter(([, action]) => can[action] === true).map(([to]) => to);
  if (moves.length) return { moves, denied: null };
  const code = pairs
    .map(([, action]) => can[action])
    .find((v): v is string => typeof v === 'string');
  if (code) return { moves, denied: capMessage(code) };
  return {
    moves,
    denied: status === 'done' && can.reopen === true ? CARD_TEXT.reopenFirst : CARD_TEXT.noMove,
  };
}

const isOpenWire = (s: TaskStatusWire) => s !== 'done' && s !== 'canceled';

/** The words of the badges a card shows; `overdue` is told by the date, review waits for S4 (T-1). */
const labelsText = (labels: readonly TaskLabelWire[]) =>
  labels.flatMap((l) => CARD_TEXT.label[l] ?? []).join(' · ');

/** A card from one row of `GET /api/app/tasks`. */
export function apiCard(t: TaskListItemWire): TaskCard {
  const days = t.dueDate ? daysBetween(today(), t.dueDate) : 0;
  const late = isOpenWire(t.status) && t.dueDate !== null && days < 0;
  const who = t.assignee;
  return {
    no: t.number,
    id: t.id,
    title: t.title,
    project: t.project.name,
    type: null,
    priority: PRIORITY_LABEL[t.priority],
    status: STATUS_LABEL[t.status],
    people: who ? [{ name: who.name.split(' ')[0], full: who.name }] : [],
    whoLabel: who?.name ?? CARD_TEXT.unassigned,
    note: labelsText(t.labels),
    due: t.dueDate ? monthDay(t.dueDate) : '',
    late,
    lateOnBoard: late,
    lateBy: late ? daysLate(-days) : null,
    steps: t.checklist.total ? `${t.checklist.done}/${t.checklist.total}` : null,
    ...boardMoves(t.status, t.can),
    step: cardStep(t),
  };
}
