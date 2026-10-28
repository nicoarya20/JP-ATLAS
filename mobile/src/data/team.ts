/**
 * The Team list as the screens show it, read from `teamResource` (`team.api.ts`). Every line is
 * built from what the server sent; a key it left out (the privacy contract) means the line is not
 * there, not that it is zero. One person is `team.person.ts`.
 */
import { monthDay } from './dates';
import {
  type ProjectRoleWire,
  type TeamAvailabilityWire,
  type TeamListData,
  type TeamPersonWire,
  type TeamProjectWire,
  type TeamSort,
  teamResource,
} from './team.api';

export const PROJECT_ROLE: Record<ProjectRoleWire, string> = {
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

export type TeamLoad = { active: number; overdue: number };

export type TeamRow = {
  /** The account id; the person route takes it. */
  id: string;
  full: string;
  you: boolean;
  jobTitle: string | null;
  /** "Manager · Atlas Project, Internal Tools", or each project with its role when they differ. */
  role: string;
  /** "Also on other projects": open work outside what the viewer may count, without naming it. */
  extra?: string;
  /** Absent where the viewer may not see the person's numbers. */
  load?: TeamLoad;
  /** "On leave until Oct 14"; absent when there is nothing to show (never "Available"). */
  leave?: string;
};

export type TeamData = {
  /** "5 people · 2 projects", plus the task numbers when they cover the whole list. */
  summary: string;
  people: TeamRow[];
  total: number;
  more: boolean;
  /** The load sorts are offered only to a viewer who may see other people's numbers. */
  sorts: readonly TeamSort[];
  /** Why counts are missing, when the server left them out. */
  note?: string;
};

export const TEAM_NOTE =
  'Task counts per person are visible only to that person, the project Manager and Admin.';
export const ALSO_ELSEWHERE = 'Also on other projects';
export const NO_PROJECT = 'No shared project';

/** "On leave until Oct 14", or undefined when the server says there is nothing to show. */
export const leaveText = (a: TeamAvailabilityWire): string | undefined =>
  a ? `On leave until ${monthDay(a.until)}` : undefined;

/** One role for all of them reads "Manager · A, B"; mixed roles read "A (Manager), B (Member)". */
export function roleLine(projects: readonly TeamProjectWire[]): string {
  if (!projects.length) return NO_PROJECT;
  const roles = new Set(projects.map((p) => p.role));
  const [only] = [...roles];
  if (roles.size === 1 && only)
    return `${PROJECT_ROLE[only]} · ${projects.map((p) => p.name).join(', ')}`;
  return projects.map((p) => `${p.name} (${PROJECT_ROLE[p.role]})`).join(', ');
}

export function toRow(p: TeamPersonWire): TeamRow {
  return {
    id: p.id,
    full: p.name,
    you: p.isSelf,
    jobTitle: p.jobTitle,
    role: roleLine(p.projects),
    extra: p.load?.alsoElsewhere ? ALSO_ELSEWHERE : undefined,
    load: p.load ? { active: p.load.active, overdue: p.load.overdue } : undefined,
    leave: leaveText(p.availability),
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * `people` and `projects` describe the whole filtered team. `active`/`overdue` sum one page only,
 * so they are shown only while that page is the whole list (gap G2-TPA3).
 */
export function summaryLine(d: TeamListData): string {
  const { people, projects, active, overdue } = d.summary;
  const parts = [plural(people, 'person', 'people'), plural(projects, 'project', 'projects')];
  const whole = !d.appended && d.people.length >= d.total;
  if (whole && active !== undefined && overdue !== undefined)
    parts.push(plural(active, 'active task', 'active tasks'), `${overdue} overdue`);
  return parts.join(' · ');
}

/** The Team list as loaded so far, or null before its first answer. */
export function getTeam(): TeamData | null {
  const d = teamResource.current();
  if (!d) return null;
  const counts = d.summary.active !== undefined;
  return {
    summary: summaryLine(d),
    people: d.people.map(toRow),
    total: d.total,
    more: d.people.length < d.total,
    sorts: counts ? ['name', 'active', 'overdue'] : ['name'],
    note: counts ? undefined : TEAM_NOTE,
  };
}
