import type { TaskStatus } from './sample';
import type { TaskItem } from './tasks.shared';

/*
 * Kanban status set (prototype tasks.columns.js): the board's columns in workflow order, and the side of the move menu
 * each status sits on. The sides are fixed, so a status is always the same slide: To do up, In progress right,
 * In review down, Done left. Icons (CircleDashed, CircleDot, Circle, CircleCheck) belong to the board component.
 */

export type BoardStatus = Exclude<TaskStatus, 'Canceled'>;
export type MenuSide = 'up' | 'right' | 'down' | 'left';
/** Colour tone of a column (badge, radial option). */
export type BoardTone = 'todo' | 'progress' | 'review' | 'done';

export type BoardColumn = { status: BoardStatus; tone: BoardTone; side: MenuSide };

export const COLUMNS: readonly BoardColumn[] = [
  { status: 'To do', tone: 'todo', side: 'up' },
  { status: 'In progress', tone: 'progress', side: 'right' },
  { status: 'In review', tone: 'review', side: 'down' },
  { status: 'Done', tone: 'done', side: 'left' },
];

/** Status that sits on each side of the move menu. */
export const STATUS_OF_SIDE = Object.fromEntries(COLUMNS.map((c) => [c.side, c.status])) as Record<
  MenuSide,
  BoardStatus
>;

/** Side of the move menu each status sits on. */
export const SIDE_OF_STATUS = Object.fromEntries(COLUMNS.map((c) => [c.status, c.side])) as Record<
  BoardStatus,
  MenuSide
>;

/** The board's columns with their tasks, in the order given (Canceled tasks have no column). */
export const boardColumns = (tasks: readonly TaskItem[]) =>
  COLUMNS.map((c) => ({ ...c, tasks: tasks.filter((t) => t.status === c.status) }));

/**
 * Task numbers a hold on card `no` moves: the whole selection, held one first, when it is one of more than one picked
 * cards; otherwise just that card.
 */
export const holdGroup = (no: number, picked: readonly number[]) =>
  picked.includes(no) && picked.length > 1 ? [no, ...picked.filter((n) => n !== no)] : [no];

/** Status a group shares (marked Now in the menu), or null for a mixed group. */
export function sharedStatus(tasks: readonly Pick<TaskItem, 'status'>[]): TaskStatus | null {
  const all = new Set(tasks.map((t) => t.status));
  return all.size === 1 ? [...all][0] : null;
}

/** "1 task", "3 tasks". */
export const tasksCount = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

/** Notice after a move: "Moved to Done" for one card, "Moved 2 tasks to Done" for a group (counting those that moved). */
export const movedNotice = (group: boolean, moved: number, status: TaskStatus) =>
  group ? `Moved ${tasksCount(moved)} to ${status}` : `Moved to ${status}`;

/** Live region text while selecting: "2 selected, hold one to move them" / "Tap tasks to select them". */
export const selectionHint = (picked: number) =>
  picked ? `${picked} selected, hold one to move them` : 'Tap tasks to select them';
