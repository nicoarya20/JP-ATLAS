/**
 * The server's task rows as the cards show them, and the one way this app reads `can{}`.
 *
 * Two rules live here, both from the module's brief:
 *
 * - **Permissions are the server's.** `can{}` has three states — `true` shown enabled, a deny code
 *   shown disabled, the key absent hidden — and `capState` is the only place that reads them. No
 *   rule of this app's own may decide what a viewer may do (the old `mayChange`/`mayArchive`/
 *   `role === 'member'` tests are gone).
 * - **Nothing is invented.** A field the server has no column for is left out and listed in
 *   `docs/phase2-gap-disembunyikan.md`: a list row carries no kind (A3), no tags (A2) and one
 *   assignee rather than several (A1), so the card simply does not show those.
 *
 * Dates: `dueDate` is a date string, so the date helpers are right for it (K2). Instants never
 * appear on a list row; the detail has them and reads them through `instant.ts`.
 */
import { monthDay } from './dates';
import { person } from './people';
import type {
  WireCap,
  WireCaps,
  WirePrimaryAction,
  WireTaskCapKey,
  WireTaskListItem,
} from './tasks.api.types';
import { priorityWord, statusWord } from './tasks.api.values';
import {
  daysLate,
  dueIn,
  type TaskPriority,
  type TaskStatus,
  whenFromDue,
} from './tasks.shared';

/** What the server allows for one control: shown enabled, shown disabled, or not shown at all. */
export type CapState = 'on' | 'off' | 'hidden';

/**
 * How a control named by a `can{}` key must be drawn.
 *
 * The three states are the server's (`server/access/capabilities.ts`): `true` → enabled, a deny
 * code → disabled, key missing → hidden. This app adds nothing; in particular it does not decide
 * that a missing key means "disabled", which would show a control the server wanted hidden.
 */
export function capState(can: WireCaps | undefined, key: WireTaskCapKey): CapState {
  const value: WireCap | undefined = can?.[key];
  if (value === undefined) return 'hidden';
  return value === true ? 'on' : 'off';
}

/** Whether a control is both shown and usable. */
export const capOn = (can: WireCaps | undefined, key: WireTaskCapKey): boolean =>
  capState(can, key) === 'on';

/** Whether a control is shown at all (enabled or disabled). */
export const capShown = (can: WireCaps | undefined, key: WireTaskCapKey): boolean =>
  capState(can, key) !== 'hidden';

/**
 * Why a disabled control is disabled.
 *
 * The server decides *that* a control is disabled and keeps a sentence for it (`capMessage`), but
 * `can{}` carries only the code — the sentence is server-side code the web imports and this app
 * cannot. Writing an English sentence per code here would be a second source for the same message,
 * which K5 forbids, so one honest line of this app's own is shown instead. Reported as a gap in
 * `docs/phase2-gap-disembunyikan.md`.
 */
export const CAP_DISABLED_REASON = 'Not available for this task.';

/** A task card as the lists and the board show it, built from one `TaskListItem`. */
export type TaskCard = {
  /** The row's own id; the Trash routes take this, not the number (B1). */
  id: string;
  no: number;
  title: string;
  /** The project's name, for the line under the title. */
  project: string;
  /** The kind, when the row carries one: a list row does not (A3), so the card hides it. */
  type: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  /** The assignee, or nobody. One person: several needs a server table (A1). */
  people: { name: string; full: string }[];
  /** The assignee's name, or "Unassigned". */
  whoLabel: string;
  /** "2 days overdue", "Today", "Done", "Waiting for my review". */
  note: string;
  /** "Oct 5", or "" for a task with no due date. */
  due: string;
  /** Lists: past due. Board: past due and not Done. */
  late: boolean;
  lateOnBoard: boolean;
  /** "2 days late", shown with the red date so lateness is not told by colour alone. */
  lateBy: string | null;
  /** "2/3", or null without steps. */
  steps: string | null;
  /** The server's capabilities for this task; the only thing a control may branch on. */
  can: WireCaps;
  /** The one step the server highlights for this viewer, or null. */
  primary: WirePrimaryAction | null;
  /** `can.update` is there and usable: the card may be moved, edited or cancelled. */
  mayChange: boolean;
};

const UNASSIGNED = 'Unassigned';

/**
 * The card's note. Derived from the row (A4), not invented: an open task says how its due date
 * stands against the server's today, a closed one says it is closed, and a task waiting on the
 * viewer's review says so because the server labelled it that way.
 *
 * A list row has no `completedAt`, so a finished task says "Done" without a date — the date is in
 * the detail (B12) and guessing one here would be worse than leaving it out.
 */
function noteOf(item: WireTaskListItem): string {
  if (item.status === 'done') return 'Done';
  if (item.status === 'canceled') return 'Canceled';
  if (item.labels.includes('awaiting_my_review')) return 'Waiting for my review';
  if (item.status === 'in_review') return 'In review';
  if (!item.dueDate) return 'No due date';
  return whenFromDue(item.dueDate, true);
}

/**
 * The full name of the person the row names. The name is the server's (`PersonRef.name`); a sample
 * person is consulted only to expand a first name into the full one the cards have always shown.
 */
const fullNameOf = (name: string) => person(name)?.full ?? name;

/** One list row as a card. */
export function cardOf(item: WireTaskListItem): TaskCard {
  // Both of these use the server's own today (K1) and the same date arithmetic the server does, so
  // the red date and the "N days late" beside it can never disagree with each other or with it.
  const days = item.dueDate ? dueIn({ due: item.dueDate }) : null;
  const late = days !== null && days < 0;
  const status = statusWord(item.status);
  const who = item.assignee?.name ?? null;
  return {
    id: item.id,
    no: item.number,
    title: item.title,
    project: item.project.name,
    type: null,
    priority: priorityWord(item.priority),
    status,
    people: who ? [{ name: who, full: fullNameOf(who) }] : [],
    whoLabel: who ? fullNameOf(who) : UNASSIGNED,
    note: noteOf(item),
    due: item.dueDate ? monthDay(item.dueDate) : '',
    late,
    lateOnBoard: late && status !== 'Done',
    lateBy: late && days !== null ? daysLate(-days) : null,
    steps: item.checklist.total ? `${item.checklist.done}/${item.checklist.total}` : null,
    can: item.can,
    primary: item.primary,
    mayChange: capOn(item.can, 'update'),
  };
}
