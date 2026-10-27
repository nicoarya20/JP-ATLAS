// Team ① for the screens: who the server says is on my team, with the task numbers I am allowed to
// see. One person is team.person.ts; the requests and the wire shapes are team.api.ts.
import { monthDay } from './dates';
import type { Slices } from './offset-pages';
import type { Role } from './sample';
import {
  type LeaveStatusWire,
  type ProjectMemberRoleWire,
  type TeamLoadWire,
  type TeamPersonWire,
  type TeamProjectRefWire,
  type TeamQuery,
  type TeamSummaryWire,
  TEAM_LIMIT,
  teamList,
} from './team.api';

export type { TeamQuery, TeamSortWire } from './team.api';

/** Open-task numbers of one person, as the server counted them. */
export type Load = { active: number; overdue: number };

export type TeamRow = {
  /** The account id; also the route param of Team ②. */
  key: string;
  full: string;
  you: boolean;
  /** "UI Designer · Atlas (Member)" — the job title and the projects, both from the server. */
  role: string;
  /** A recorded leave ("On leave until Oct 14"), or empty: the server sends nothing else. */
  status: string;
  /** They also have open tasks on projects the viewer does not share. No number: it is not theirs to know. */
  extra?: string;
  /** Absent where the viewer may not see someone's task numbers (an absent key, not a zero). */
  load?: Load;
};

export type TeamData = {
  /** "12 people · 3 projects", plus the load of the people shown when they are all of them. */
  summary: string;
  people: TeamRow[];
  /** How many people match on the server, however many are on hand. */
  total: number;
  /** There are matching people this app has not asked for yet. */
  hasMore: boolean;
  /** A closing note for this role; absent for a Project Manager, who needs none. */
  note?: string;
};

const PROJECT_ROLE: Record<ProjectMemberRoleWire, string> = {
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

/** Notes per role (GAP A-18): the role comes from `whoami`, and decides copy only, never access. */
const NOTE: Partial<Record<Role, string>> = {
  admin: 'Approving new users and changing roles happens in More › Users.',
  member:
    'Task counts per person are visible only to that person, the project Manager and Admin.',
};

/** "Atlas (Manager)": a project and the person's role in it, as the server sent both. */
export const projectLabel = (p: TeamProjectRefWire): string =>
  `${p.name} (${PROJECT_ROLE[p.role] ?? p.role})`;

/** "Atlas (Manager), Internal Tools (Member)", or nothing when the viewer shares no project with them. */
export const projectsLine = (projects: readonly TeamProjectRefWire[]): string =>
  projects.map(projectLabel).join(', ');

/**
 * What the server says about someone's leave, or `''`.
 *
 * `availability: null` means "nothing to show" and is **not** a synonym for "available"
 * (`server/team/team.dto.ts`), so no row ever claims someone is available: the Admin-only leave
 * note is deliberately never sent, and inventing a green "Available" from a missing key would be
 * this app asserting something the server refused to say.
 */
export const availabilityText = (availability: LeaveStatusWire | null): string =>
  availability ? `On leave until ${monthDay(availability.until)}` : '';

const loadOf = (load: TeamLoadWire | undefined): Load | undefined =>
  load ? { active: load.active, overdue: load.overdue } : undefined;

/** One wire person as a row. */
export function teamRow(p: TeamPersonWire): TeamRow {
  const projects = projectsLine(p.projects);
  return {
    key: p.id,
    full: p.name,
    you: p.isSelf,
    role: [p.jobTitle, projects].filter(Boolean).join(' · '),
    status: availabilityText(p.availability),
    extra: p.load?.alsoElsewhere
      ? 'Also has open tasks on projects you do not share'
      : undefined,
    load: loadOf(p.load),
  };
}

/**
 * The summary line.
 *
 * `summary.active`/`overdue` cover **one page** of people, not the whole team
 * (`server/team/team.dto.ts`), so they are only put on screen when that page is the whole team.
 * Once "Load more" has been pressed the numbers on hand describe the last slice alone, and a line
 * that summed them would be quietly wrong — so it says less instead.
 */
export function summaryLine(summary: TeamSummaryWire, shown: number, total: number): string {
  const parts = [`${summary.people} people`, `${summary.projects} projects`];
  const whole = shown === total && total <= TEAM_LIMIT;
  if (whole && summary.active !== undefined) {
    parts.push(`${summary.active} active tasks`, `${summary.overdue ?? 0} overdue`);
  }
  return parts.join(' · ');
}

/** Team ① from the store: null until the list has answered, so the screen shows it is loading. */
export function getTeam(query: TeamQuery, role: Role | null): TeamData | null {
  return teamOf(teamList(query).current(), role);
}

/** The mapping on its own, so a test can hand it a page without a store. */
export function teamOf(
  data: Slices<TeamPersonWire, TeamSummaryWire> | null,
  role: Role | null,
): TeamData | null {
  if (!data) return null;
  const people = data.rows.map(teamRow);
  return {
    summary: summaryLine(data.extra, data.rows.length, data.total),
    people,
    total: data.total,
    hasMore: data.rows.length < data.total,
    note: role ? NOTE[role] : undefined,
  };
}
