/**
 * The project Overview tab as the screen shows it: progress and time, the phase steps with the next
 * milestone, the tasks needing attention, and the recent activity.
 *
 * The tab is four reads, not one (the detail, the plan, three task queries and the activity feed),
 * so each part carries its **own** phase and error. A failed plan must not blank the activity below
 * it: one section says it could not load and offers Try again, and the rest of the page stays.
 * `src/data/home.api.ts` reached the same shape for the same reason.
 *
 * Every date here is the server's today (`today()` from the clock, K1) and every instant goes
 * through `instant.ts` in the team's zone (K2). Nothing is computed from the device's clock, so the
 * "3 days left" on this screen can never disagree with the overdue count the server sent beside it.
 */
import type { ApiError } from '@/api/errors';

import { today } from './clock';
import { daysBetween, monthDay } from './dates';
import { instantDate } from './instant';
import { ATTENTION_REASONS, type AttentionReason, projectAttention } from './projects.api.tasks';
import type { WireProjectDetail, WireProjectPlan } from './projects.api.types';
import { phaseWord } from './projects.api.values';
import { daysLeftLabel, longDate } from './projects.dates';
import type { ResourcePhase } from './resource';
import type { PhaseState } from './sample/projects.extra';
import type { WireTaskListItem } from './tasks.api.types';

const PCT = 100;

/** What every soft-failing section of the tab carries. */
export type SectionState = { phase: ResourcePhase; error: ApiError | null };

/** One task on the attention list. `due` is spoken by the row; the icon names the reason. */
export type AttentionRow = {
  id: string;
  no: number;
  title: string;
  sub: string;
  due: string;
  reason: AttentionReason;
};

export type OverviewProgress = {
  /** 0–100 for the bar; a project with no tasks draws an empty one. */
  progress: number;
  /** "7 of 10 tasks done", from `progress.done`/`total` the server sends (B-3). */
  tasksLine: string;
  /** Share of the project's own span already spent, or null without a start date. */
  elapsed: number | null;
  /** "Start Sep 1 · due Oct 31 · 24 days left". */
  timeLine: string;
};

export type OverviewPlan = SectionState & {
  steps: { name: string; state: PhaseState }[];
  /** "Now: Development · 60%", or null when no phase is running. */
  now: string | null;
  milestone: { name: string; line: string } | null;
};

export type OverviewActivity = SectionState & {
  items: { id: string; text: string; on: string }[];
  hasMore: boolean;
};

export type OverviewAttention = SectionState & { rows: AttentionRow[] };

/**
 * Progress and the time line, from the detail the header already loaded.
 *
 * `percent` null means "no tasks yet", which is not 0 % — the bar is empty either way, but the
 * sentence beside it has to say which. `elapsed` needs a start date, and the server sends `null`
 * for a project that has none, so the bar is simply not drawn then.
 */
export function overviewProgress(detail: WireProjectDetail): OverviewProgress {
  const { done, total, percent } = detail.progress;
  const start = detail.startDate;
  const due = detail.dueDate;
  const span = start && due ? daysBetween(start, due) : 0;
  const elapsed =
    start && span > 0
      ? Math.min(PCT, Math.max(0, Math.round((daysBetween(start, today()) / span) * PCT)))
      : null;
  const left = due ? daysLeftLabel(today(), due) : null;
  const timeLine = due
    ? start
      ? `Start ${monthDay(start)} · due ${monthDay(due)} · ${left}`
      : `Due ${monthDay(due)} · ${left}`
    : start
      ? `Start ${monthDay(start)} · no deadline`
      : 'No dates set';
  return {
    progress: percent ?? 0,
    tasksLine: total === 0 ? 'No tasks yet' : `${done} of ${total} tasks done`,
    elapsed,
    timeLine,
  };
}

/**
 * The phase steps, the running phase and the next milestone.
 *
 * The percentage beside the running phase is **redefined**: the prototype's "60%" was written by
 * hand and the server has no "phase percent", only each phase's `taskCount` and `doneCount`
 * (GAP A-11). So it is now the share of that phase's tasks that are done — a real number with a
 * stated meaning, which is worth more than a familiar one with none. A phase with no tasks shows no
 * percentage at all rather than 0 %, which would read as "nothing done" instead of "nothing to do".
 */
export function overviewPlan(plan: WireProjectPlan | null, state: SectionState): OverviewPlan {
  const current = plan?.currentPhase ?? null;
  const next = plan?.nextMilestone ?? null;
  const pct =
    current && current.taskCount > 0
      ? Math.round((current.doneCount / current.taskCount) * PCT)
      : null;
  return {
    ...state,
    steps: (plan?.phases ?? []).map((p) => ({ name: p.name, state: phaseWord(p.status) })),
    now: current ? `Now: ${current.name}${pct === null ? '' : ` · ${pct}%`}` : null,
    milestone: next
      ? {
          name: `◆ Next milestone: ${next.title}`,
          line: `${longDate(next.dueDate)} · ${daysLeftLabel(today(), next.dueDate)}`,
        }
      : null,
  };
}

/**
 * The activity feed. `text` is the sentence the server composed, in Indonesian, shown exactly as it
 * came: rebuilding it in English would need the raw `payload`, which is deliberately not on the
 * wire, and writing a second sentence beside the server's is what K5 forbids (GAP A-8).
 */
export function overviewActivity(
  page: { items: { id: string; text: string; createdAt: string }[] } | null,
  hasMore: boolean,
  state: SectionState,
): OverviewActivity {
  return {
    ...state,
    items: (page?.items ?? []).map((a) => ({
      id: a.id,
      text: a.text,
      on: monthDay(instantDate(a.createdAt)),
    })),
    hasMore,
  };
}

/** One attention row from a task the server put in that group. */
function rowOf(item: WireTaskListItem, reason: AttentionReason, todayIso: string): AttentionRow {
  const who = item.assignee?.name ?? 'Unassigned';
  const late = item.dueDate ? daysBetween(todayIso, item.dueDate) : null;
  const when =
    late === null
      ? 'No due date'
      : late < 0
        ? `${-late} day${late === -1 ? '' : 's'} overdue`
        : late === 0
          ? 'Due today'
          : `${late} day${late === 1 ? '' : 's'} left`;
  return {
    id: item.id,
    no: item.number,
    title: `#${item.number} ${item.title}`,
    sub: `${who} · ${when}`,
    due: item.dueDate ? monthDay(item.dueDate) : '',
    reason,
  };
}

/**
 * The attention rows of one project, read from the three task queries.
 *
 * The grouping is the server's: a task is overdue or due today because `due=overdue` / `due=today`
 * put it there, never because this app compared dates again (the two could disagree, and the
 * server's answer is the one the rest of the screen already shows). A task that is both overdue and
 * in review appears once, under the more urgent reason, in the order the section lists them.
 */
export function projectAttentionRows(id: string): OverviewAttention {
  const states = ATTENTION_REASONS.map((reason) => ({
    reason,
    state: projectAttention(id, reason).peek(),
  }));
  const seen = new Set<string>();
  const rows: AttentionRow[] = [];
  const todayIso = today();
  for (const { reason, state } of states) {
    for (const item of state.data?.items ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      rows.push(rowOf(item, reason, todayIso));
    }
  }
  // One failure is the section's failure: a partial alarm list is worse than one that says so.
  const failed = states.find((s) => s.state.phase === 'failed');
  const loading = states.some((s) => s.state.phase === 'loading' || s.state.phase === 'empty');
  return {
    phase: failed ? 'failed' : loading ? 'loading' : 'ready',
    error: failed?.state.error ?? null,
    rows,
  };
}
