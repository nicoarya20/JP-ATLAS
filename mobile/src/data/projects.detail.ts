// Project detail tabs ⑧–⑪ (prototype projects.detail.jsx / projects.tabs.jsx): Overview, Tasks, Phases and Members of
// one project. Only Atlas has phases, milestones and a deadline history in the sample; other projects show their
// list data and say what they have none of.
import { daysBetween, monthDay } from './dates';
import { me, person } from './people';
import { daysLeftLabel, longDate, rangeLabel } from './projects.dates';
import { findProject, getProjectsState, type ProjectItem } from './projects.store';
import { type Role, TODAY } from './sample';
import { type PhaseState, PROJECT_DETAIL, type ProjectRole } from './sample/projects.extra';
import { getTasksList, type TaskCard, taskCard } from './tasks';
import { isOpen } from './tasks.shared';
import { getTasksState, type TasksState } from './tasks.state';

const PCT = 100;

function projectOrThrow(id: string, what: string): ProjectItem {
  const p = findProject(id);
  if (!p) throw new Error(`Cannot read the ${what} of project "${id}": no such project`);
  return p;
}

/** Why a task needs attention, in the order the Overview lists them. */
export type AttentionReason = 'Overdue' | 'Awaiting review' | 'Due today';

export type AttentionRow = { no: number; title: string; sub: string; reason: AttentionReason };

function reasonOf(t: TaskCard & { dueIso: string }): AttentionReason | null {
  const d = daysBetween(TODAY, t.dueIso);
  if (d < 0) return 'Overdue';
  if (t.status === 'In review') return 'Awaiting review';
  return d === 0 ? 'Due today' : null;
}

const ORDER: readonly AttentionReason[] = ['Overdue', 'Awaiting review', 'Due today'];

/** Open tasks of the project that are overdue, awaiting review or due today (the prototype's #12, #17 and #14). */
function attention(s: TasksState, role: Role, name: string): AttentionRow[] {
  const rows = s.tasks
    .filter((t) => t.project === name && isOpen(t))
    .flatMap((t) => {
      const c = taskCard(s, role, t);
      const reason = reasonOf({ ...c, dueIso: t.due });
      return reason
        ? [{ no: t.no, title: `#${t.no} ${t.title}`, sub: `${t.who} · ${c.note}`, reason }]
        : [];
    });
  return ORDER.flatMap((r) => rows.filter((x) => x.reason === r));
}

/** ⑧ Overview of project id for `role`. */
export function getProjectOverview(role: Role, id: string, s: TasksState = getTasksState()) {
  const p = projectOrThrow(id, 'overview');
  const d = PROJECT_DETAIL[id];
  const left = daysLeftLabel(TODAY, p.due);
  const span = p.started ? daysBetween(p.started, p.due) : 0;
  const elapsed =
    p.started && span > 0
      ? Math.min(PCT, Math.max(0, Math.round((daysBetween(p.started, TODAY) / span) * PCT)))
      : null;
  const now = d?.phases.find((ph) => ph.state === 'In progress');
  const next = d?.phases.find((ph) => ph.milestone && !ph.milestone.reached)?.milestone;
  return {
    progress: p.progress,
    elapsed,
    timeLine: p.started
      ? `Start ${monthDay(p.started)} · due ${monthDay(p.due)} · ${left}`
      : `Due ${monthDay(p.due)} · ${left}`,
    steps: d?.phases.map((ph) => ({ name: ph.name, state: ph.state })) ?? [],
    now: now && d ? `Now: ${now.name} · ${d.phasePct}%` : null,
    milestone: next
      ? {
          name: `◆ Next milestone: ${next.name}`,
          line: `${longDate(next.date)} · in ${daysBetween(TODAY, next.date)} days`,
        }
      : null,
    attention: attention(s, role, p.name),
    activity: (getProjectsState().activity[id] ?? []).map((a) => ({
      text: a.text,
      on: monthDay(a.on),
    })),
  };
}

/** Per-task action of the project's Tasks tab (Manager / Admin), by status; a Member, or a closed task, gets View. */
export type TaskAction =
  | { kind: 'notice'; label: string; notice: string }
  | { kind: 'open'; label: string };

const ACTIONS: Partial<Record<TaskCard['status'], TaskAction>> = {
  'To do': { kind: 'notice', label: 'Start working', notice: 'Task started' },
  'In progress': { kind: 'notice', label: 'Request review', notice: 'Sent for review' },
  'In review': { kind: 'open', label: 'Review' },
};
const VIEW: TaskAction = { kind: 'open', label: 'View' };

/** ⑨ Tasks of project id as a list (with each card's action) or a board, with the project scope's query. */
export function getProjectTasks(
  role: Role,
  id: string,
  view: 'list' | 'board',
  search: string,
  s: TasksState = getTasksState(),
) {
  const list = getTasksList(role, { scope: `project:${id}`, view, search }, s);
  const canEdit = role !== 'member';
  const cards =
    list.view === 'board'
      ? list.columns.flatMap((c) => c.cards)
      : list.groups.flatMap((g) => g.tasks);
  return {
    view: list.view,
    filtered: list.filtered,
    cards,
    /** List cards with their action; the board takes `cards` alone. */
    rows:
      list.view === 'list'
        ? cards.map((card) => ({ card, action: (canEdit && ACTIONS[card.status]) || VIEW }))
        : [],
    count: `${cards.length} ${cards.length === 1 ? 'task' : 'tasks'}`,
  };
}

/** Button of a phase card for a Manager / Admin: complete the one in progress, start the next one. */
const PHASE_BUTTON: Partial<
  Record<PhaseState, { label: string; notice: string; primary: boolean }>
> = {
  'In progress': { label: 'Complete phase', notice: 'Phase completed', primary: true },
  'Not started': { label: 'Start phase', notice: 'Phase started', primary: false },
};

/** ⑩ Phases of project id; canEdit adds the phase buttons (only on the phase right after the current one). */
export function getProjectPhases(id: string, canEdit: boolean) {
  projectOrThrow(id, 'phases');
  const d = PROJECT_DETAIL[id];
  const phases = d?.phases ?? [];
  const nextUp = phases.findIndex((ph) => ph.state === 'Not started');
  const h = d?.deadlineHistory;
  return {
    count: `${phases.length} phases`,
    cards: phases.map((ph, i) => {
      const done = ph.state === 'Done';
      const pct = done ? PCT : ph.state === 'In progress' ? (d?.phasePct ?? 0) : 0;
      const m = ph.milestone;
      const button = PHASE_BUTTON[ph.state];
      return {
        name: ph.name,
        mark: done ? '✓' : String(i + 1),
        range: rangeLabel(ph.start, ph.end),
        state: ph.state,
        now: ph.state === 'In progress',
        pct,
        milestone: m
          ? {
              name: `◆ ${m.name}`,
              line: m.reached ? `Reached ${monthDay(m.date)}` : `${monthDay(m.date)} · Waiting`,
            }
          : null,
        button: canEdit && button && (button.primary || i === nextUp) ? button : null,
      };
    }),
    history: h
      ? {
          original: `Original deadline: ${longDate(h.from)}`,
          change: `${monthDay(h.from)} → ${monthDay(h.to)}`,
          reason: h.reason,
          by: `${h.note} · by ${h.by} · ${longDate(h.on)}`,
        }
      : null,
  };
}

/** Project roles a member can have. */
export const PROJECT_ROLES_LIST: readonly ProjectRole[] = ['Manager', 'Member', 'Viewer'];

/** ⑪ Members of project id for `role`. */
export function getProjectMembers(role: Role, id: string) {
  const p = projectOrThrow(id, 'members');
  const myName = me(role).name;
  const managers = p.members.filter((n) => p.roles[n] === 'Manager');
  return {
    name: p.name,
    count: `${p.members.length} members`,
    cards: p.members.map((n) => {
      const info = person(n);
      return {
        name: n,
        full: info?.full ?? n,
        sub: info ? `${info.title} · ${info.division}` : '',
        role: p.roles[n] ?? 'Member',
        you: n === myName,
        lead: n === p.lead,
      };
    }),
    /** "<lead> is the only Manager…", while the Lead is the one Manager. */
    onlyManager: managers.length === 1 && managers[0] === p.lead ? p.lead : null,
  };
}
