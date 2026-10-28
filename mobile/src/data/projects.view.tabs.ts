/**
 * Project detail ⑩ Phases and ⑪ Members from the server (`projects.api.ts`). Phase and milestone dates may be
 * missing; the extension `reason` is what the manager wrote, shown as it came (K5).
 */
import { sessionStore } from '@/session/session.state';

import { monthDay } from './dates';
import { instantDate } from './instant';
import {
  projectExtensionsResource,
  projectMembersResource,
  projectPlanResource,
  projectResource,
} from './projects.api';
import { longDate, rangeLabel } from './projects.dates';
import { PHASE_LABEL, share } from './projects.view';
import type {
  ExtensionReasonWire,
  MilestoneWire,
  PhaseStatusWire,
  ProjectRoleWire,
} from './projects.wire';
import { PROJECT_ROLE } from './team';

export const NO_DATES = 'No dates';

/** "Sep 1–24", "From Sep 1", "Until Sep 24" or "No dates". */
export function phaseRange(start: string | null, end: string | null): string {
  if (start && end) return rangeLabel(start, end);
  if (start) return `From ${monthDay(start)}`;
  return end ? `Until ${monthDay(end)}` : NO_DATES;
}

const milestoneRow = (m: MilestoneWire) => ({
  id: m.id,
  name: `◆ ${m.title}`,
  line: m.reachedAt
    ? `Reached ${monthDay(instantDate(m.reachedAt))}`
    : `${monthDay(m.dueDate)} · Waiting`,
});

export type PhaseCard = {
  id: string;
  name: string;
  /** ✓ once done, else its number. */
  mark: string;
  range: string;
  status: PhaseStatusWire;
  state: string;
  now: boolean;
  /** Tasks of the phase done, 0–100; null when it has none. */
  pct: number | null;
  milestones: ReturnType<typeof milestoneRow>[];
};

/** The extension categories in the app's words (the manager's own reason is shown beside them). */
export const EXTENSION_REASON: Record<ExtensionReasonWire, string> = {
  scope_change: 'Scope changed',
  dependency: 'Waiting on others',
  resource: 'Short-staffed',
  other: 'Other',
};

/** The Phases tab of project id, or null before the plan arrives. */
export function getProjectPhases(id: string) {
  const plan = projectPlanResource(id).current();
  if (!plan) return null;
  const phaseIds = new Set(plan.phases.map((p) => p.id));
  const cards: PhaseCard[] = plan.phases.map((ph, i) => ({
    id: ph.id,
    name: ph.name,
    mark: ph.status === 'done' ? '✓' : String(i + 1),
    range: phaseRange(ph.startDate, ph.endDate),
    status: ph.status,
    state: PHASE_LABEL[ph.status],
    now: ph.status === 'in_progress',
    pct: share(ph.doneCount, ph.taskCount),
    milestones: plan.milestones.filter((m) => m.phaseId === ph.id).map(milestoneRow),
  }));
  return {
    count: `${cards.length} phase${cards.length === 1 ? '' : 's'}`,
    cards,
    /** Milestones of no phase (or of one the plan no longer has). */
    loose: plan.milestones.filter((m) => !m.phaseId || !phaseIds.has(m.phaseId)).map(milestoneRow),
  };
}

/** The deadline history of project id, or null before it arrives (or when the deadline never moved). */
export function getDeadlineHistory(id: string) {
  const x = projectExtensionsResource(id).current();
  const p = projectResource(id).current();
  if (!x?.items.length) return null;
  const first = p?.originalDueDate ?? x.items[x.items.length - 1]?.oldDueDate;
  return {
    original: first ? `Original deadline: ${longDate(first)}` : null,
    rows: x.items.map((e) => ({
      id: e.id,
      change: `${monthDay(e.oldDueDate)} → ${monthDay(e.newDueDate)}`,
      category: EXTENSION_REASON[e.reasonCategory],
      reason: e.reason,
      by: [e.extendedByName && `by ${e.extendedByName}`, longDate(instantDate(e.createdAt))]
        .filter(Boolean)
        .join(' · '),
    })),
    /** "Showing the last 5 of 7 extensions." when not all are listed. */
    more: x.count > x.items.length ? `Showing the last ${x.items.length} of ${x.count}.` : null,
  };
}

export type MemberCard = {
  userId: string;
  full: string;
  /** Job title, when they have one. */
  sub: string;
  role: ProjectRoleWire;
  roleLabel: string;
  you: boolean;
  lead: boolean;
};

/** The Members tab of project id, or null before the members arrive. */
export function getProjectMembers(id: string) {
  const m = projectMembersResource(id).current();
  if (!m) return null;
  const me = sessionStore.get().user?.id;
  const cards: MemberCard[] = m.items.map((x) => ({
    userId: x.userId,
    full: x.name,
    sub: x.jobTitle ?? '',
    role: x.role,
    roleLabel: PROJECT_ROLE[x.role],
    you: x.userId === me,
    lead: x.isLead,
  }));
  const managers = cards.filter((c) => c.role === 'manager');
  const only = managers.length === 1 ? managers[0] : undefined;
  return {
    count: `${cards.length} member${cards.length === 1 ? '' : 's'}`,
    cards,
    /** The one manager's name while there is only one: they can't step down or leave. */
    onlyManager: only ? only.full : null,
  };
}
