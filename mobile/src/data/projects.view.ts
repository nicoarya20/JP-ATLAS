/**
 * Project detail ⑧ from the server (`projects.api.ts`, `projects.overview.api.ts`): the header every tab
 * shares and the Overview. The Phases and Members tabs are in `projects.view.tabs.ts`. Each read is its own
 * resource, so a part that has not arrived is null and the screen shows it loading on its own.
 */
import { today } from './clock';
import { daysBetween, monthDay } from './dates';
import { instantDate } from './instant';
import { projectActivityResource, projectPlanResource, projectResource } from './projects.api';
import { daysLeftLabel, longDate } from './projects.dates';
import { NO_DEADLINE, NO_LEAD, NO_TASKS } from './projects.list';
import { type AttentionReason, projectAttentionResource } from './projects.overview.api';
import { CLOSING, STATUS_LABEL } from './projects.query';
import type {
  PhaseStatusWire,
  ProjectCapsWire,
  ProjectConditionWire,
  ProjectRoleWire,
} from './projects.wire';

const PCT = 100;

/** Header of the detail, the same on every tab. */
export type ProjectHead = {
  id: string;
  name: string;
  status: string;
  condition: ProjectConditionWire | null;
  /** The server's reason (or the manager's own words when set by hand), or "No tasks yet". */
  reason: string | null;
  /** "Set by hand by Nico Pratama" while a manual condition is in force. */
  manual: string | null;
  lead: string;
  /** "Oct 31, 2026", or "No deadline". */
  due: string;
  /** "Extended ×2" once the deadline moved. */
  extended: string | null;
  can: ProjectCapsWire;
  myRole: ProjectRoleWire | null;
  /** Tasks a move to the Trash takes along (`taskCounts.live`). */
  live: number;
  /** Extend deadline is offered: the viewer may edit, and the project is open and has a deadline to move. */
  canExtend: boolean;
};

/** The header of project id, or null before its detail arrives. */
export function getProjectHead(id: string): ProjectHead | null {
  const p = projectResource(id).current();
  if (!p) return null;
  const override = p.conditionOverride;
  return {
    id: p.id,
    name: p.name,
    status: STATUS_LABEL[p.status],
    condition: p.condition?.level ?? null,
    reason: p.condition?.reason ?? (p.progress.total === 0 ? NO_TASKS : null),
    manual: override ? `Set by hand${override.setByName ? ` by ${override.setByName}` : ''}` : null,
    lead: p.lead?.name ?? NO_LEAD,
    due: p.dueDate ? longDate(p.dueDate) : NO_DEADLINE,
    extended: p.extensionCount > 0 ? `Extended ×${p.extensionCount}` : null,
    can: p.can,
    myRole: p.myRole,
    live: p.taskCounts.live,
    canExtend: p.can.update === true && !!p.dueDate && !CLOSING.includes(p.status),
  };
}

export const PHASE_LABEL: Record<PhaseStatusWire, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

/** "in 5 days", "today", "3 days ago". */
export function fromToday(iso: string): string {
  const d = daysBetween(today(), iso);
  if (d === 0) return 'today';
  const n = Math.abs(d);
  const days = `${n} day${n === 1 ? '' : 's'}`;
  return d > 0 ? `in ${days}` : `${days} ago`;
}

/** Share done, 0–100; null when there is nothing to count. */
export const share = (done: number, total: number): number | null =>
  total > 0 ? Math.round((done / total) * PCT) : null;

function timeLine(start: string | null, due: string | null): string {
  if (!due) return start ? `Start ${monthDay(start)} · ${NO_DEADLINE}` : NO_DEADLINE;
  const left = daysLeftLabel(today(), due);
  return start
    ? `Start ${monthDay(start)} · due ${monthDay(due)} · ${left}`
    : `Due ${monthDay(due)} · ${left}`;
}

function elapsed(start: string | null, due: string | null): number | null {
  if (!start || !due) return null;
  const span = daysBetween(start, due);
  if (span <= 0) return null;
  return Math.min(PCT, Math.max(0, Math.round((daysBetween(start, today()) / span) * PCT)));
}

/** Progress and time of project id, or null before its detail arrives. */
export function getProjectProgress(id: string) {
  const p = projectResource(id).current();
  if (!p) return null;
  const pct = p.progress.percent;
  return {
    progress: pct ?? 0,
    percent: pct === null ? '–' : `${pct}%`,
    elapsed: elapsed(p.startDate, p.dueDate),
    timeLine: timeLine(p.startDate, p.dueDate),
  };
}

/** The phase steps, the current phase and the next milestone, or null before the plan arrives. */
export function getProjectSteps(id: string) {
  const plan = projectPlanResource(id).current();
  if (!plan) return null;
  const now = plan.currentPhase;
  const nowPct = now ? share(now.doneCount, now.taskCount) : null;
  const next = plan.nextMilestone;
  return {
    steps: plan.phases.map((ph) => ({ id: ph.id, name: ph.name, state: ph.status })),
    now: now ? `Now: ${now.name}${nowPct === null ? '' : ` · ${nowPct}%`}` : null,
    milestone: next
      ? {
          name: `◆ Next milestone: ${next.title}`,
          line: `${longDate(next.dueDate)} · ${fromToday(next.dueDate)}`,
        }
      : null,
  };
}

export type AttentionRow = {
  id: string;
  no: number;
  title: string;
  sub: string;
  reason: AttentionReason;
};

export const UNASSIGNED = 'Unassigned';

/** Tasks needing attention, or null before they arrive. */
export function getProjectAttention(id: string): AttentionRow[] | null {
  const rows = projectAttentionResource(id).current();
  if (!rows) return null;
  return rows.map(({ task, reason }) => ({
    id: task.id,
    no: task.number,
    title: `#${task.number} ${task.title}`,
    sub: [task.assignee?.name ?? UNASSIGNED, task.dueDate && `Due ${monthDay(task.dueDate)}`]
      .filter(Boolean)
      .join(' · '),
    reason,
  }));
}

/** Recent activity (the server's sentences), or null before it arrives. */
export function getProjectActivity(id: string) {
  const a = projectActivityResource(id).current();
  if (!a) return null;
  return a.items.map((x) => ({ id: x.id, text: x.text, on: monthDay(instantDate(x.createdAt)) }));
}
