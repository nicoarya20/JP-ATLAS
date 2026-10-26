import { monthDay } from './dates';
import { person } from './people';
import type { Role } from './sample';
import {
  assignees,
  type DetailVariant,
  detailVariant,
  dueLabel,
  dueNote,
  fullName,
  mayArchive,
  mayChange,
  stepsTitle,
  type TaskInfo,
  type TaskItem,
  type TaskProof,
  type TaskStep,
} from './tasks.shared';
import { findTask, type TasksState, taskInfo } from './tasks.state';
import { viewer as signedIn, type Viewer } from './viewer';

/*
 * Task detail in one call (prototype tasks.detail.jsx, tasks.detail.screens.jsx): which variant, which actions and
 * menu items the viewer gets, the facts, the sections and the history. Copy is the prototype's, verbatim.
 */

export type TaskActionKey =
  | 'start'
  | 'markDone'
  | 'requestReview'
  | 'reopen'
  | 'approve'
  | 'restore';
export type TaskMenuKey = 'edit' | 'cancel' | 'archive';

/** One button of the detail; `primary` = the lime main action. Return is a separate flag (it opens a sheet). */
export type TaskAction = { key: TaskActionKey; label: string; primary: boolean };

export type TaskFact =
  | { key: 'assignee'; label: 'Assignee'; people: { name: string; full: string }[] }
  | { key: 'due'; label: 'Due date'; value: string; note: string }
  | { key: 'tags'; label: 'Tag'; tags: string[] }
  | {
      key: 'priority' | 'type' | 'review' | 'reviewer' | 'createdBy';
      label: 'Priority' | 'Type' | 'Needs review' | 'Reviewer' | 'Created by';
      value: string;
    };

/** In place of the actions: archived, canceled (with Restore when allowed), not the viewer's, or waiting on review. */
export type TaskStateNote =
  | { kind: 'archived'; text: string }
  | { kind: 'canceled'; text: string; restore: boolean }
  | { kind: 'notYours'; text: string }
  | { kind: 'waiting'; text: string };

export type TaskSection<T> = { title: string; items: T[] };

export type TaskDetailView = {
  task: TaskItem;
  variant: DetailVariant;
  /** "#12 · Atlas Project · Bug · Development". */
  meta: string;
  due: string;
  mayChange: boolean;
  mayArchive: boolean;
  /** Return sheet (Managers and Admins, In review). */
  canReturn: boolean;
  /** ⋯ items; empty = no menu (archived, or nothing allowed). */
  menu: TaskMenuKey[];
  actions: TaskAction[];
  /** "Approve → automatically Done" under Approve / Return. */
  approveHint: string | null;
  stateNote: TaskStateNote | null;
  /** Review request banner: title and "Requested Oct 7". */
  banner: { title: string; sub: string } | null;
  /** "The lead is the assignee…" note on In progress. */
  leadNote: string | null;
  facts: TaskFact[];
  /** Steps section; `empty` / `addStep` only on the To do variant. */
  steps: (TaskSection<TaskStep> & { empty: string | null; addStep: boolean }) | null;
  evidence: (TaskSection<TaskProof> & { attach: boolean }) | null;
  description: string;
  hasDescription: boolean;
  history: { text: string; when: string; who: string | null }[];
};

const ACTION_LABEL: Record<TaskActionKey, string> = {
  start: 'Start working',
  markDone: 'Mark done',
  requestReview: 'Request review',
  reopen: 'Reopen',
  approve: 'Approve',
  restore: 'Restore',
};
const act = (key: TaskActionKey, primary = false): TaskAction => ({
  key,
  label: ACTION_LABEL[key],
  primary,
});

const firstName = (s: string | undefined) => s?.split(' ')[0];

/** Buttons per variant (Canceled tasks show Restore in their note instead). */
function actionsOf(v: DetailVariant, t: TaskItem, x: TaskInfo, viewer: Viewer): TaskAction[] {
  if (v === 'todo') return [act('start', true), ...(x.reviewer ? [] : [act('markDone')])];
  if (v === 'progress') {
    if (t.status === 'Done') return [act('reopen')];
    return [x.reviewer ? act('requestReview', true) : act('markDone', true)];
  }
  return viewer.sample.role === 'Member' ? [] : [act('approve', true)];
}

function factsOf(s: TasksState, v: DetailVariant, t: TaskItem, x: TaskInfo, viewer: Viewer) {
  const off =
    viewer.sample.role === 'Member' ? 'Off · you may turn it on' : 'Off · Mark done directly';
  const review =
    v === 'review'
      ? 'Yes · locked while in review'
      : v === 'progress'
        ? x.reviewer && `Yes · turned on by ${x.by}`
        : s.info[t.no] && (x.reviewer ? 'Yes · Request review before Done' : off);
  const facts: TaskFact[] = [
    {
      key: 'assignee',
      label: 'Assignee',
      people: assignees(t).map((name) => ({ name, full: fullName(name) })),
    },
    { key: 'due', label: 'Due date', value: monthDay(t.due), note: dueNote(t) },
    { key: 'priority', label: 'Priority', value: t.priority },
    { key: 'type', label: 'Type', value: t.type },
  ];
  if (review) facts.push({ key: 'review', label: 'Needs review', value: review });
  if (x.reviewer) facts.push({ key: 'reviewer', label: 'Reviewer', value: x.reviewer });
  facts.push(
    { key: 'tags', label: 'Tag', tags: t.tags },
    { key: 'createdBy', label: 'Created by', value: x.on ? `${x.by} · ${monthDay(x.on)}` : x.by },
  );
  return facts;
}

function stateNoteOf(s: TasksState, t: TaskItem, x: TaskInfo, viewer: Viewer, mine: boolean) {
  if (s.archived.includes(t))
    return { kind: 'archived', text: 'This task is in Archive.' } as const;
  if (t.status === 'Canceled') {
    const c = x.canceled;
    const text = c ? `Canceled by ${c.by}: ${c.reason}` : 'This task was canceled.';
    return { kind: 'canceled', text, restore: mine } as const;
  }
  if (!mine) {
    const text = `Only ${assignees(t).join(', ')}, the project Manager or an Admin can change this task.`;
    return { kind: 'notYours', text } as const;
  }
  if (t.status === 'In review' && viewer.sample.role === 'Member') {
    const text =
      "Waiting for a Manager or Admin. You'll be notified when it's approved or returned.";
    return { kind: 'waiting', text } as const;
  }
  return null;
}

/** "Dodi asked you to review this task" from the viewer's side; null without a request or reviewer. */
function bannerOf(x: TaskInfo, viewer: Viewer) {
  const by = firstName(x.reviewer);
  if (!x.asked || !by) return null;
  const asker = x.asked.by;
  const who =
    asker === viewer.name ? `You asked ${by}` : `${asker} asked ${by === viewer.name ? 'you' : by}`;
  return { title: `${who} to review this task`, sub: `Requested ${monthDay(x.asked.on)}` };
}

function stepsOf(v: DetailVariant, x: TaskInfo): TaskDetailView['steps'] {
  if (v === 'todo') {
    const empty = x.steps.length ? null : 'No steps yet.';
    return { title: stepsTitle(x.steps), items: x.steps, empty, addStep: true };
  }
  if (!x.steps.length) return null;
  const all = v === 'review' && x.steps.every((st) => st.done) ? ' ✓' : '';
  return { title: `${stepsTitle(x.steps)}${all}`, items: x.steps, empty: null, addStep: false };
}

function evidenceOf(v: DetailVariant, t: TaskItem, x: TaskInfo, viewer: Viewer) {
  if (v === 'todo' || !x.proof.length) return null;
  const n = x.proof.length;
  if (v === 'progress') return { title: `Evidence ${n}`, items: x.proof, attach: true };
  const from = t.who === viewer.name ? 'Your evidence' : `Evidence from ${t.who}`;
  return { title: `${from} ${n}`, items: x.proof, attach: false };
}

/** Everything the detail of task #no shows to `role`; null when there is no such task. */
export function buildTaskDetail(s: TasksState, role: Role, no: number): TaskDetailView | null {
  const t = findTask(s, no);
  if (!t) return null;
  const x = taskInfo(s, no);
  const viewer = signedIn(role);
  const v = detailVariant(t);
  const mine = mayChange(viewer, t);
  const archives = mayArchive(viewer, x);
  const archived = s.archived.includes(t);
  const canceled = t.status === 'Canceled';
  const stateNote = stateNoteOf(s, t, x, viewer, mine);
  const showActions = !stateNote;
  const menu: TaskMenuKey[] = archived
    ? []
    : [
        ...(mine && !canceled ? (['edit', 'cancel'] as const) : []),
        ...(archives ? (['archive'] as const) : []),
      ];
  const reviewing = showActions && v === 'review' && viewer.sample.role !== 'Member';
  return {
    task: t,
    variant: v,
    meta: `#${no} · ${t.project} · ${t.type}${x.phase ? ` · ${x.phase}` : ''}`,
    due: dueLabel(t),
    mayChange: mine,
    mayArchive: archives,
    canReturn: reviewing,
    menu,
    actions: showActions ? actionsOf(v, t, x, viewer) : [],
    approveHint: reviewing ? 'Approve → automatically Done' : null,
    stateNote,
    banner: v === 'review' ? bannerOf(x, viewer) : null,
    leadNote:
      v === 'progress' && x.reviewer === 'Admin'
        ? 'The lead is the assignee. Add a second manager so this project has a reviewer.'
        : null,
    facts: factsOf(s, v, t, x, viewer),
    steps: stepsOf(v, x),
    evidence: evidenceOf(v, t, x, viewer),
    description: x.desc || 'No description yet.',
    hasDescription: !!x.desc,
    history: x.history.map((h) => {
      const who = h.text.split(/[ :]/)[0];
      return { text: h.text, when: h.on ? monthDay(h.on) : '', who: person(who) ? who : null };
    }),
  };
}
