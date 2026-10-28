/**
 * Projects ① from `GET /api/app/projects` (`projects.api.ts`): the cards and what the list says around them.
 * The words around the server's data are English; `condition.reason` is the server's sentence (K5).
 */
import { monthDay } from './dates';
import { projectsResource } from './projects.api';
import { isFiltered, STATUS_LABEL } from './projects.query';
import type { ProjectConditionWire, ProjectListItemWire } from './projects.wire';

export const NO_LEAD = 'No lead';
export const NO_DEADLINE = 'No deadline';
export const NO_TASKS = 'No tasks yet';

/** A project card of the list. */
export type ProjectCard = {
  id: string;
  name: string;
  /** "Active", "Done"… */
  status: string;
  /** Full name, or "No lead" when the Lead's account is gone. */
  lead: string;
  /** How the server judges an active project; null for the others. */
  condition: ProjectConditionWire | null;
  /** The server's reason for the condition, or "No tasks yet"; null when there is nothing to add. */
  note: string | null;
  /** 0–100 for the bar. */
  progress: number;
  /** "70%", or "–" before any task. */
  percent: string;
  /** "Oct 31", or "No deadline". */
  due: string;
};

/** none = no project at all for the viewer; noMatch = the filter or search leaves nothing. */
export type ProjectsEmpty = 'none' | 'noMatch' | null;

export type ProjectsList = {
  cards: ProjectCard[];
  total: number;
  /** More rows on the server than on screen. */
  more: boolean;
  empty: ProjectsEmpty;
  /** The dot on the filter icon. */
  filtered: boolean;
};

export function toCard(p: ProjectListItemWire): ProjectCard {
  const pct = p.progress.percent;
  return {
    id: p.id,
    name: p.name,
    status: STATUS_LABEL[p.status],
    lead: p.lead?.name ?? NO_LEAD,
    condition: p.condition?.level ?? null,
    note: p.condition?.reason ?? (p.progress.total === 0 ? NO_TASKS : null),
    progress: pct ?? 0,
    percent: pct === null ? '–' : `${pct}%`,
    due: p.dueDate ? monthDay(p.dueDate) : NO_DEADLINE,
  };
}

/** The list on hand, or null before the first answer. */
export function getProjectsList(): ProjectsList | null {
  const data = projectsResource.current();
  if (!data) return null;
  const narrowed = isFiltered(data.query) || !!data.query.q.trim();
  return {
    cards: data.items.map(toCard),
    total: data.total,
    more: data.items.length < data.total,
    empty: data.items.length ? null : narrowed ? 'noMatch' : 'none',
    filtered: isFiltered(data.query),
  };
}
