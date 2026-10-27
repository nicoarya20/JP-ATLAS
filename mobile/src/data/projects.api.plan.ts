/**
 * The Phases tab as the screen shows it: a card per phase with its range, status, progress and
 * milestones, then the deadline history.
 *
 * Both lists come back whole — phases and milestones are capped per project, and the history route
 * takes a `limit` and reports the real `total` beside it — so nothing here pages. What the history
 * does do is say when there is more than it is showing, instead of stopping quietly at the limit.
 *
 * Dates: a phase's range is two **dates** and may be missing on either side (GAP A-15), which the
 * prototype assumed away; `reachedAt` and an extension's `createdAt` are **instants** and go
 * through `instant.ts` in the team's zone (K2).
 */
import { today } from './clock';
import { monthDay } from './dates';
import { instantDate } from './instant';
import { type CapState, capOn, capState } from './projects.api.map';
import type {
  WireExtensionList,
  WireMilestone,
  WirePhase,
  WireProjectCaps,
  WireProjectPlan,
} from './projects.api.types';
import { extensionWord, phaseWord } from './projects.api.values';
import { longDate, rangeLabel } from './projects.dates';
import type { PhaseState } from './sample/projects.extra';

const PCT = 100;

/** A milestone of a phase card, or of the project when it belongs to no phase. */
export type MilestoneLine = { id: string; name: string; line: string; reached: boolean };

/** What a phase card's button does; `status` is what the server is asked to set. */
export type PhaseButton = {
  label: string;
  status: 'done' | 'in_progress';
  notice: string;
  primary: boolean;
};

export type PhaseCardView = {
  id: string;
  name: string;
  /** "✓" once done, else its place in the list. */
  mark: string;
  /** "Sep 25–Oct 20", or what is known of it when a side is missing. */
  range: string;
  state: PhaseState;
  now: boolean;
  /** Share of this phase's tasks that are done, or null when it has none. */
  pct: number | null;
  /** "3 of 5 tasks done", or "No tasks yet". */
  tasksLine: string;
  milestones: MilestoneLine[];
  /** The one step offered on this card, or null when the server allows no write. */
  button: PhaseButton | null;
};

export type DeadlineHistoryRow = {
  id: string;
  /** "Oct 15 → Oct 31". */
  change: string;
  /** The category, in this app's own English words (GAP A-14). */
  category: string;
  /** The manager's own note, as they wrote it. */
  note: string;
  /** "by Nico Pratama · Oct 15, 2026". */
  by: string;
};

export type DeadlineHistory = {
  /** "Original deadline: Sep 30, 2026", or null when the project never had one. */
  original: string | null;
  rows: DeadlineHistoryRow[];
  /** "2 more extensions are not shown.", when the history is longer than the page. */
  more: string | null;
};

export type PhasesView = {
  /** "4 phases", or null before the plan arrives. */
  count: string | null;
  cards: PhaseCardView[];
  /** Milestones that belong to no phase; the prototype had none and the server allows them. */
  loose: MilestoneLine[];
  /** How the "+ Phase" and "+ Milestone" controls must be drawn (`can.update`). */
  addPhase: CapState;
  history: DeadlineHistory | null;
};

/** "Reached Oct 12", or "Oct 20 · Waiting" / "Oct 12 · Overdue" against the server's today. */
function milestoneLine(m: WireMilestone, todayIso: string): MilestoneLine {
  const reached = m.reachedAt !== null;
  const when = reached
    ? `Reached ${monthDay(instantDate(m.reachedAt as string))}`
    : `${monthDay(m.dueDate)} · ${m.dueDate < todayIso ? 'Overdue' : 'Waiting'}`;
  return { id: m.id, name: `◆ ${m.title}`, line: when, reached };
}

/** The range of a phase, naming what is known when a side is missing rather than inventing it. */
function phaseRange(p: WirePhase): string {
  if (p.startDate && p.endDate) return rangeLabel(p.startDate, p.endDate);
  if (p.startDate) return `From ${monthDay(p.startDate)}`;
  if (p.endDate) return `Until ${monthDay(p.endDate)}`;
  return 'No dates set';
}

/**
 * The step a phase card offers: finish the phase that is running, or start the next one that has not
 * begun. "Next" is the first `not_started` phase in display order — offering Start on every one of
 * them would invite skipping ahead, which the prototype also avoided.
 */
function phaseButton(p: WirePhase, isNextUp: boolean, mayWrite: boolean): PhaseButton | null {
  if (!mayWrite) return null;
  if (p.status === 'in_progress') {
    return { label: 'Complete phase', status: 'done', notice: 'Phase completed', primary: true };
  }
  if (p.status === 'not_started' && isNextUp) {
    return { label: 'Start phase', status: 'in_progress', notice: 'Phase started', primary: false };
  }
  return null;
}

/** The deadline history, from the extensions page and the detail's original deadline. */
export function deadlineHistory(
  originalDueDate: string | null,
  list: WireExtensionList | null,
): DeadlineHistory | null {
  if (!list || list.items.length === 0) return null;
  const hidden = list.total - list.items.length;
  return {
    original: originalDueDate ? `Original deadline: ${longDate(originalDueDate)}` : null,
    rows: list.items.map((x) => ({
      id: x.id,
      change: `${monthDay(x.oldDueDate)} → ${monthDay(x.newDueDate)}`,
      category: extensionWord(x.reasonCategory),
      note: x.reason,
      by: `by ${x.extendedByName ?? 'a former account'} · ${longDate(instantDate(x.createdAt))}`,
    })),
    more:
      hidden > 0
        ? `${hidden} more extension${hidden === 1 ? '' : 's'} ${hidden === 1 ? 'is' : 'are'} not shown.`
        : null,
  };
}

/** The Phases tab of one project. */
export function phasesView(
  plan: WireProjectPlan | null,
  can: WireProjectCaps | undefined,
  originalDueDate: string | null,
  extensions: WireExtensionList | null,
): PhasesView {
  const phases = plan?.phases ?? [];
  const todayIso = today();
  const mayWrite = capOn(can, 'update');
  const nextUp = phases.findIndex((p) => p.status === 'not_started');
  const byPhase = new Map<string, WireMilestone[]>();
  const loose: WireMilestone[] = [];
  for (const m of plan?.milestones ?? []) {
    if (!m.phaseId) loose.push(m);
    else byPhase.set(m.phaseId, [...(byPhase.get(m.phaseId) ?? []), m]);
  }
  return {
    count: plan ? `${phases.length} phase${phases.length === 1 ? '' : 's'}` : null,
    cards: phases.map((p, i) => ({
      id: p.id,
      name: p.name,
      mark: p.status === 'done' ? '✓' : String(i + 1),
      range: phaseRange(p),
      state: phaseWord(p.status),
      now: p.status === 'in_progress',
      pct: p.taskCount > 0 ? Math.round((p.doneCount / p.taskCount) * PCT) : null,
      tasksLine:
        p.taskCount > 0 ? `${p.doneCount} of ${p.taskCount} tasks done` : 'No tasks in this phase',
      milestones: (byPhase.get(p.id) ?? []).map((m) => milestoneLine(m, todayIso)),
      button: phaseButton(p, i === nextUp, mayWrite),
    })),
    loose: loose.map((m) => milestoneLine(m, todayIso)),
    addPhase: capState(can, 'update'),
    history: deadlineHistory(originalDueDate, extensions),
  };
}
