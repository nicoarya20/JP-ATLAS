/**
 * One task as its detail screen shows it, from `GET /api/app/tasks/:ref` and its timeline.
 *
 * Read synchronously from the stores like every `get*()` in Fase 1 (`docs/phase2-pola-data.md` §0);
 * `ensureTaskDetailView()` is the one call that fills them. Two requests stand behind one screen —
 * the task and its timeline — because the server pages the timeline and keeps the authors of what
 * happened there rather than on the task (A7, A8).
 *
 * Three rules shape what comes out:
 *
 * - **Permissions are the server's.** Every control follows a `can{}` key through `capState`
 *   (`tasks.api.map.ts`); the old client-side rules (`mayChange`, `mayArchive`, "only the assignee
 *   or a Manager…") are gone, and so is the sentence that explained them.
 * - **Only routed steps are offered.** `requestReview`, `approve` and `return` have policy and
 *   capabilities on the server but no route until S4 (A6), so they are left out however `can{}`
 *   answers: a button that answers 404 is worse than no button.
 * - **Nothing is invented.** Tags (A2), attachments (A5), the review banner and the reviewer's role
 *   tag (A6) have no field to read, so they are not shown. Each is listed in
 *   `docs/phase2-gap-disembunyikan.md`.
 *
 * Dates: `dueDate` is a date string and stays with the date helpers; `createdAt`, `completedAt` and
 * `canceledAt` are instants and go through `instant.ts` in the team's zone (K2).
 */
import type { ApiError } from '@/api/errors';

import { monthDay } from './dates';
import { instantDate } from './instant';
import { person } from './people';
import type { ResourcePhase } from './resource';
import { taskDetail, taskTimeline } from './tasks.api';
import { CAP_DISABLED_REASON, capOn, capShown } from './tasks.api.map';
import { historyOf, type TaskHistoryLine, authorOfAction } from './tasks.api.timeline';
import type { WireCaps, WireTaskDetail, WireTimelineEntry } from './tasks.api.types';
import { actionStep, cancelWordOf, priorityWord, statusWord } from './tasks.api.values';
import type { TaskActionKey, TaskMenuKey } from './tasks.detail';
import {
  type DetailVariant,
  daysLate,
  detailVariant,
  dueIn,
  type TaskPriority,
  type TaskStatus,
  stepsTitle,
} from './tasks.shared';

/** One fact of the detail. No tag row: `tags` has no column and is refused with 422 (A2). */
export type TaskDetailFact =
  | { key: 'assignee'; label: 'Assignee'; people: { name: string; full: string }[] }
  | { key: 'due'; label: 'Due date'; value: string; note: string }
  | {
      key: 'priority' | 'type' | 'review' | 'reviewer' | 'createdBy';
      label: 'Priority' | 'Type' | 'Needs review' | 'Reviewer' | 'Created by';
      value: string;
    };

/** One checklist step; the id is what a tick is written with. */
export type TaskDetailStep = { id: string; text: string; done: boolean };

/**
 * One status button. `enabled` false = the server shows it but refuses it for now (a deny code), and
 * `hint` says so as plainly as this app can — the server keeps the real sentence and `can{}` carries
 * only the code (G1-T2).
 */
export type TaskDetailAction = {
  key: TaskActionKey;
  label: string;
  primary: boolean;
  enabled: boolean;
  hint?: string;
};

/** In place of the buttons: a canceled task says why, and offers Restore when the server allows it. */
export type TaskDetailStateNote = { kind: 'canceled'; text: string; restore: boolean };

/** The task itself, once it has arrived. */
export type TaskDetailTask = {
  /** The row's own id: what the Trash routes take, unlike every other route (B1). */
  id: string;
  no: number;
  title: string;
  status: TaskStatus;
  variant: DetailVariant;
  /** "#12 · Atlas Project · Bug · Development". */
  meta: string;
  /** "Overdue 2 days", "Today", "Due Oct 9", "Done Oct 5". */
  due: string;
  priority: TaskPriority;
  menu: TaskMenuKey[];
  actions: TaskDetailAction[];
  stateNote: TaskDetailStateNote | null;
  facts: TaskDetailFact[];
  steps: { title: string; items: TaskDetailStep[]; empty: string | null } | null;
  description: string;
  hasDescription: boolean;
  history: TaskHistoryLine[];
  /** The server has older timeline entries than the ones loaded. */
  hasMoreHistory: boolean;
  /** The comment box is offered (`can.comment`). */
  mayComment: boolean;
  /** The server's capabilities, for a control that needs one this view does not name. */
  can: WireCaps;
};

export type TaskDetailView = {
  phase: ResourcePhase;
  error: ApiError | null;
  /** The server has no such task — including one in the Trash, which answers 404 too (A14). */
  missing: boolean;
  task: TaskDetailTask | null;
};

const NO_DESCRIPTION = 'No description yet.';
const NO_STEPS = 'No steps yet.';

const ACTION_LABEL: Record<TaskActionKey, string> = {
  start: 'Start working',
  markDone: 'Mark done',
  requestReview: 'Request review',
  reopen: 'Reopen',
  approve: 'Approve',
  restore: 'Restore',
};

/**
 * The buttons the detail may show, in the order it shows them.
 *
 * The three review steps are not here: their routes answer 404 until S4 (A6). `restore` is not here
 * either — a canceled task offers it inside its note, where the reason is.
 */
const OFFERED: readonly TaskActionKey[] = ['start', 'markDone', 'reopen'];

/** The full name of the person the server named; the name itself for anyone outside the sample. */
const fullNameOf = (name: string) => person(name)?.full ?? name;

/** The top line under the title: how the due date stands today, or when the task was closed. */
function dueLineOf(d: WireTaskDetail): string {
  if (d.status === 'canceled')
    return d.canceledAt ? `Canceled ${monthDay(instantDate(d.canceledAt))}` : 'Canceled';
  if (d.status === 'done')
    return d.completedAt ? `Done ${monthDay(instantDate(d.completedAt))}` : 'Done';
  if (!d.dueDate) return 'No due date';
  const days = dueIn({ due: d.dueDate });
  if (days < 0) return `Overdue ${-days} days`;
  if (days === 0) return 'Today';
  return days === 1 ? 'Tomorrow' : `Due ${monthDay(d.dueDate)}`;
}

/** "(2 days late)", "(today)", "(tomorrow)" beside the due date, or nothing. */
function dueNoteOf(d: WireTaskDetail): string {
  if (!d.dueDate || d.status === 'done' || d.status === 'canceled') return '';
  const days = dueIn({ due: d.dueDate });
  if (days < 0) return `(${daysLate(-days)})`;
  if (days === 0) return '(today)';
  return days === 1 ? '(tomorrow)' : '';
}

/**
 * The facts, each from a field the server really sends.
 *
 * "Needs review" and "Reviewer" are shown as the plain fields they are. What A6 holds back is the
 * sentence the prototype wrapped them in ("Yes · turned on by Nico", "Nico (creator, Manager)") and
 * the actions behind them — the reviewer's project role is not in `PersonRef`, and inventing one
 * would be this app guessing at a permission.
 */
function factsOf(d: WireTaskDetail): TaskDetailFact[] {
  const who = d.assignee?.name;
  const facts: TaskDetailFact[] = [
    {
      key: 'assignee',
      label: 'Assignee',
      people: who ? [{ name: who, full: fullNameOf(who) }] : [],
    },
    {
      key: 'due',
      label: 'Due date',
      value: d.dueDate ? monthDay(d.dueDate) : '—',
      note: dueNoteOf(d),
    },
    { key: 'priority', label: 'Priority', value: priorityWord(d.priority) },
    { key: 'type', label: 'Type', value: d.kind.name },
    { key: 'review', label: 'Needs review', value: d.needsReview ? 'Yes' : 'No' },
  ];
  if (d.reviewer) facts.push({ key: 'reviewer', label: 'Reviewer', value: d.reviewer.name });
  const made = monthDay(instantDate(d.createdAt));
  facts.push({
    key: 'createdBy',
    label: 'Created by',
    value: d.creator ? `${d.creator.name} · ${made}` : made,
  });
  return facts;
}

/** The buttons for this task: offered when `can{}` shows the step, usable when it allows it. */
function actionsOf(d: WireTaskDetail): TaskDetailAction[] {
  const shown = OFFERED.filter((key) => capShown(d.can, actionStep(key).cap));
  // The server picks one step to highlight (`primary`); when the one it picked is a review step it
  // is not on screen at all, so the first button offered takes the highlight instead.
  const lead = shown.find((key) => actionStep(key).cap === d.primary) ?? shown[0];
  return shown.map((key) => {
    const enabled = capOn(d.can, actionStep(key).cap);
    return {
      key,
      label: ACTION_LABEL[key],
      primary: key === lead,
      enabled,
      ...(enabled ? {} : { hint: CAP_DISABLED_REASON }),
    };
  });
}

/**
 * Why a canceled task was canceled, and whether it may be brought back.
 *
 * The author comes from the timeline's `canceled` row, because `cancel` on the task carries only the
 * category and the note (A7). Without the timeline loaded the line still says the reason — it just
 * does not name anyone, rather than naming a guess.
 */
function stateNoteOf(
  d: WireTaskDetail,
  timeline: readonly WireTimelineEntry[],
): TaskDetailStateNote | null {
  if (d.status !== 'canceled') return null;
  const restore = capOn(d.can, 'uncancel');
  if (!d.cancel) return { kind: 'canceled', text: 'This task was canceled.', restore };
  const reason = [cancelWordOf(d.cancel.category), d.cancel.note?.trim()]
    .filter(Boolean)
    .join(': ');
  const by = authorOfAction(timeline, 'canceled');
  const who = by ? `Canceled by ${by}` : 'Canceled';
  return { kind: 'canceled', text: reason ? `${who}: ${reason}` : `${who}.`, restore };
}

function stepsOf(d: WireTaskDetail): TaskDetailTask['steps'] {
  const items = [...d.checklist.items]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ id: i.id, text: i.text, done: i.isDone }));
  // An open task shows the section even when it is empty, so adding the first step has a place to
  // appear; a closed one with no steps has nothing to say.
  if (!items.length && (d.status === 'done' || d.status === 'canceled')) return null;
  return {
    title: stepsTitle(items.map((i) => ({ text: i.text, done: i.done }))),
    items,
    empty: items.length ? null : NO_STEPS,
  };
}

/** The task as the screen shows it. */
export function detailTaskOf(
  d: WireTaskDetail,
  timeline: readonly WireTimelineEntry[],
  hasMoreHistory: boolean,
): TaskDetailTask {
  const status = statusWord(d.status);
  const stateNote = stateNoteOf(d, timeline);
  return {
    id: d.id,
    no: d.number,
    title: d.title,
    status,
    variant: detailVariant({ status }),
    meta: `#${d.number} · ${d.project.name} · ${d.kind.name}${d.phase ? ` · ${d.phase.name}` : ''}`,
    due: dueLineOf(d),
    priority: priorityWord(d.priority),
    menu: [
      ...(capShown(d.can, 'update') ? (['edit'] as const) : []),
      ...(capShown(d.can, 'cancel') ? (['cancel'] as const) : []),
      ...(capShown(d.can, 'trash') ? (['archive'] as const) : []),
    ],
    // A canceled task's note carries Restore instead of the status buttons, as the prototype did.
    actions: stateNote ? [] : actionsOf(d),
    stateNote,
    facts: factsOf(d),
    steps: stepsOf(d),
    description: d.description || NO_DESCRIPTION,
    hasDescription: !!d.description,
    history: historyOf(timeline),
    hasMoreHistory,
    mayComment: capOn(d.can, 'comment'),
    can: d.can,
  };
}

/** The label of a canceled task's Restore, so the note and the buttons use one word for it. */
export const RESTORE_LABEL = ACTION_LABEL.restore;

/** Whether a failure is the server saying there is no such task (or that it is in the Trash). */
const isMissing = (error: ApiError | null): boolean => error?.status === 404;

/** Everything the detail of task `ref` shows, read from the stores. */
export function getTaskDetailView(ref: string | number): TaskDetailView {
  const detail = taskDetail(ref).peek();
  const timeline = taskTimeline(ref).peek();
  const d = detail.data;
  return {
    phase: detail.phase,
    error: detail.error,
    missing: !d && isMissing(detail.error),
    task: d ? detailTaskOf(d, timeline.data?.items ?? [], timeline.data?.nextCursor != null) : null,
  };
}

/** Fetch the task and its timeline unless they are fresh (§1); safe from every mount. */
export async function ensureTaskDetailView(ref: string | number): Promise<void> {
  await Promise.all([taskDetail(ref).ensure(), taskTimeline(ref).ensure()]);
}

/** Fetch both again whatever is there: "Try again" after a failure. */
export async function reloadTaskDetailView(ref: string | number): Promise<void> {
  await Promise.all([taskDetail(ref).reload(), taskTimeline(ref).reload()]);
}

/** One more page of older timeline entries. */
export const moreTaskHistory = (ref: string | number): Promise<void> => taskTimeline(ref).more();

/** The detail in a component, re-rendering when the task or its timeline changes. */
export function useTaskDetailView(ref: string | number): TaskDetailView {
  taskDetail(ref).use();
  taskTimeline(ref).use();
  return getTaskDetailView(ref);
}
