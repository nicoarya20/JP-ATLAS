/**
 * Task detail as the screen shows it, built from `GET /api/app/tasks/:ref` (map
 * `phase2-map-tasks.md` §2c). Nothing about permission is decided here: each button, menu item,
 * tick box and the comment box follows the task's `can{}` (E-6: `true` = enabled, a code = shown
 * disabled with its reason from `caps.messages.ts`, absent = hidden) and the main button is the
 * server's `primary`. Hidden for now: the review steps (S4, T-1), tags (T-8), evidence (T-9) and
 * Move to Archive (it needs the Trash, gap §1). Days are compared with the server's today (K1);
 * instants are read in the team's zone (K2).
 */
import { capReason } from './caps.messages';
import { today } from './clock';
import { daysBetween, monthDay } from './dates';
import { instantDate } from './instant';
import type { TaskStatus } from './sample';
import type { TaskDetailWire } from './tasks.detail.wire';
import { daysLate } from './tasks.shared';
import {
  type CapValueWire,
  PRIORITY_LABEL,
  type PrimaryActionWire,
  STATUS_LABEL,
  type TaskCancelCategoryWire,
  type TaskCapKeyWire,
} from './tasks.wire';

/** The steps the detail's buttons take; Cancel is in the ⋯ menu. */
export type DetailActionKey = 'start' | 'unstart' | 'complete' | 'reopen' | 'uncancel';

/** One button: `off` is why it is disabled (E-6), null when it can be pressed. */
export type DetailAction = {
  key: DetailActionKey;
  label: string;
  primary: boolean;
  off: string | null;
};

/** A control the server shows (`true` or a code); the reason it is off, or null when enabled. */
export type Allowed = { off: string | null };

export type DetailFact =
  | { key: 'assignee'; label: 'Assignee'; name: string | null }
  | { key: 'due'; label: 'Due date'; value: string; note: string }
  | {
      key: 'priority' | 'type' | 'phase' | 'review' | 'reviewer' | 'createdBy';
      label: 'Priority' | 'Type' | 'Phase' | 'Needs review' | 'Reviewer' | 'Created by';
      value: string;
    };

export type TaskDetailView = {
  id: string;
  no: number;
  title: string;
  status: TaskStatus;
  /** "#12 · Atlas Project · Bug · Development". */
  meta: string;
  /** Under the title: "Overdue 2 days", "Today", "Due Oct 9", "Done Oct 3". */
  due: string;
  /** In the order they show; empty on a canceled task (its note has Restore). */
  actions: DetailAction[];
  /** No step, no edit and no menu: the viewer may look but not change it. */
  viewOnly: boolean;
  /** A canceled task: why, and Restore when the server offers it. */
  canceled: { text: string; restore: DetailAction | null } | null;
  /** ⋯ › Edit task (`can.update`); null when hidden. */
  edit: Allowed | null;
  /** ⋯ › Cancel task; null when hidden. */
  cancel: Allowed | null;
  facts: DetailFact[];
  description: string | null;
  steps: {
    title: string;
    items: { id: string; text: string; done: boolean }[];
    /** Ticking and adding steps (`can.update`); null when hidden. */
    edit: Allowed | null;
  };
  /** The comment box (`can.comment`); null when hidden. */
  comment: Allowed | null;
};

export const DETAIL_TEXT = {
  unassigned: 'Unassigned',
  noDue: 'No due date',
  yes: 'Yes',
  canceled: (why: string) => `Canceled: ${why}`,
} as const;

/** The Cancel sheet's reasons, in the prototype's words, each with the category the server takes. */
export const CANCEL_REASONS: readonly (readonly [TaskCancelCategoryWire, string])[] = [
  ['duplicate', 'Duplicate / already exists'],
  ['not_needed', 'No longer needed'],
  ['out_of_scope', 'Outside the project scope'],
  ['created_by_mistake', 'Created by mistake'],
  ['other', 'Other'],
];

export const cancelLabel = (c: TaskCancelCategoryWire): string =>
  CANCEL_REASONS.find(([k]) => k === c)?.[1] ?? c;

/** The words of each workflow button, on the detail and on a project's task cards. */
export const STEP_LABEL: Record<DetailActionKey, string> = {
  start: 'Start working',
  unstart: 'Stop working',
  complete: 'Mark done',
  reopen: 'Reopen',
  uncancel: 'Restore',
};
// The order the buttons read in; the server's `primary` is drawn lime wherever it falls.
const ORDER: readonly DetailActionKey[] = ['start', 'complete', 'unstart', 'reopen'];

const allowed = (value: CapValueWire | undefined): Allowed | null =>
  value === undefined ? null : { off: capReason(value) };

function action(
  key: DetailActionKey,
  can: TaskDetailWire['can'],
  primary: PrimaryActionWire | null,
): DetailAction | null {
  const a = allowed(can[key as TaskCapKeyWire]);
  return a && { key, label: STEP_LABEL[key], primary: primary === key, off: a.off };
}

const isOpen = (t: TaskDetailWire) => t.status !== 'done' && t.status !== 'canceled';

/** The line under the title. */
function dueLine(t: TaskDetailWire): string {
  if (t.status === 'done' && t.completedAt) return `Done ${monthDay(instantDate(t.completedAt))}`;
  if (t.status === 'canceled' && t.canceledAt)
    return `Canceled ${monthDay(instantDate(t.canceledAt))}`;
  if (!t.dueDate) return DETAIL_TEXT.noDue;
  if (!isOpen(t)) return `Due ${monthDay(t.dueDate)}`;
  const d = daysBetween(today(), t.dueDate);
  if (d < 0) return `Overdue ${-d} ${d === -1 ? 'day' : 'days'}`;
  if (d === 0) return 'Today';
  return d === 1 ? 'Tomorrow' : `Due ${monthDay(t.dueDate)}`;
}

/** "(2 days late)", "(today)", "(tomorrow)" after the due date, for an open task. */
function dueNote(t: TaskDetailWire): string {
  if (!t.dueDate || !isOpen(t)) return '';
  const d = daysBetween(today(), t.dueDate);
  if (d < 0) return `(${daysLate(-d)})`;
  if (d === 0) return '(today)';
  return d === 1 ? '(tomorrow)' : '';
}

function factsOf(t: TaskDetailWire): DetailFact[] {
  const facts: DetailFact[] = [
    { key: 'assignee', label: 'Assignee', name: t.assignee?.name ?? null },
    {
      key: 'due',
      label: 'Due date',
      value: t.dueDate ? monthDay(t.dueDate) : DETAIL_TEXT.noDue,
      note: dueNote(t),
    },
    { key: 'priority', label: 'Priority', value: PRIORITY_LABEL[t.priority] },
    { key: 'type', label: 'Type', value: t.kind.name },
  ];
  if (t.phase) facts.push({ key: 'phase', label: 'Phase', value: t.phase.name });
  // Read only until review ships (T-1): shown only on a task that already has it.
  if (t.needsReview) {
    facts.push({ key: 'review', label: 'Needs review', value: DETAIL_TEXT.yes });
    if (t.reviewer) facts.push({ key: 'reviewer', label: 'Reviewer', value: t.reviewer.name });
  }
  const on = monthDay(instantDate(t.createdAt));
  if (t.creator)
    facts.push({ key: 'createdBy', label: 'Created by', value: `${t.creator.name} · ${on}` });
  return facts;
}

function canceledOf(t: TaskDetailWire): TaskDetailView['canceled'] {
  if (t.status !== 'canceled') return null;
  const c = t.cancel;
  const why = c
    ? c.note
      ? `${cancelLabel(c.category)} — ${c.note}`
      : cancelLabel(c.category)
    : '';
  return {
    text: why ? DETAIL_TEXT.canceled(why) : 'This task was canceled.',
    restore: action('uncancel', t.can, t.primary),
  };
}

/** Everything the detail of `t` shows to whoever asked for it. */
export function buildTaskDetail(t: TaskDetailWire): TaskDetailView {
  const canceled = canceledOf(t);
  const actions = canceled ? [] : ORDER.flatMap((key) => action(key, t.can, t.primary) ?? []);
  const cancel = allowed(t.can.cancel);
  const edit = allowed(t.can.update);
  const done = t.checklist.items.filter((i) => i.isDone).length;
  return {
    id: t.id,
    no: t.number,
    title: t.title,
    status: STATUS_LABEL[t.status],
    meta: [`#${t.number}`, t.project.name, t.kind.name, t.phase?.name]
      .filter((x): x is string => !!x)
      .join(' · '),
    due: dueLine(t),
    actions,
    viewOnly: !actions.length && !canceled?.restore && !cancel && !edit,
    canceled,
    edit,
    cancel,
    facts: factsOf(t),
    description: t.description?.trim() || null,
    steps: {
      title: t.checklist.items.length ? `Steps ${done}/${t.checklist.items.length}` : 'Steps',
      items: [...t.checklist.items]
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ id: i.id, text: i.text, done: i.isDone })),
      edit,
    },
    comment: allowed(t.can.comment),
  };
}
