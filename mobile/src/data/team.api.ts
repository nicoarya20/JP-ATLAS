/**
 * The Team reads of `/api/app/team`: the list (`?q&sort&limit&offset`) and one person
 * (`/:userId`). Request and wire shapes only — turning them into what the screens draw is
 * `team.ts` and `team.person.ts`.
 *
 * Two things about this endpoint shape the whole module:
 *
 * 1. **Privacy is an absent key, not a zero** (`server/team/team.dto.ts`): `load`,
 *    `alsoElsewhere`, `tasks`, `accountRole`, `person.phone` and `summary.active/overdue` are left
 *    out of the body for a caller who may not see them — never `null`, never `0`. So every optional
 *    field below is optional on purpose, and the mapping branches on whether the key is there. A
 *    `?? 0` anywhere in this module would turn "you may not know" into "nobody has any".
 * 2. **There is no `can{}` here.** The Team is read-only, so the absent keys above *are* the
 *    permission contract. The one role branch the screens are allowed is copy (which heading goes
 *    over the projects, which closing note) and it comes from `whoami.role`, not from guessing.
 *
 * The list is paged by offset, and a resource is held per query-as-shown rather than per page: a
 * screen whose filter changes would otherwise change how many `use()` hooks it calls, which React
 * does not allow (the same reason the Tasks lists are built that way).
 */
import { apiGet } from '@/api';

import { type OffsetPaged, offsetPaged } from './offset-pages';
import { type Resource, resource } from './resource';

/** `server/team/team.query.ts`: the page the server sends when no limit is asked for. */
export const TEAM_LIMIT = 24;
/** `server/team/team.load.query.ts`: a person's detail lists at most this many open tasks. */
export const PERSON_TASKS_MAX = 20;
/** `server/team/team.query.ts`: longer search text is cut by the server, so it is cut here. */
export const TEAM_SEARCH_MAX = 100;

/** `server/team/team.dto.ts`. `active`/`overdue` need the right to see other people's numbers. */
export const TEAM_SORTS = ['name', 'active', 'overdue'] as const;
export type TeamSortWire = (typeof TEAM_SORTS)[number];

/** `server/pm/enums.ts`. */
export type ProjectMemberRoleWire = 'manager' | 'member' | 'viewer';

/** `server/leave/leave.dto.ts`: a recorded leave under way, or `null` for "nothing to show". */
export type LeaveStatusWire = { kind: 'on_leave'; until: string };

export type TeamProjectRefWire = { id: string; name: string; role: ProjectMemberRoleWire };

/** `alsoElsewhere` carries no number on purpose: the viewer may not know how much work lies outside. */
export type TeamLoadWire = { active: number; overdue: number; alsoElsewhere?: true };

export type TeamPersonWire = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
  isSelf: boolean;
  projects: TeamProjectRefWire[];
  load?: TeamLoadWire;
  availability: LeaveStatusWire | null;
};

/**
 * `people` and `projects` describe the whole filtered team; `active`/`overdue` sum the load of the
 * people **on one page**, and are absent for a caller who may see nobody else's numbers.
 */
export type TeamSummaryWire = {
  people: number;
  projects: number;
  active?: number;
  overdue?: number;
};

export type TeamListWire = { summary: TeamSummaryWire; people: TeamPersonWire[]; total: number };

export type TeamPersonProfileWire = {
  id: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  email: string;
  /** Reaches only the person themselves and an Admin (Q8). */
  phone?: string;
};

export type TeamTaskRefWire = {
  number: number;
  title: string;
  status: string;
  /** `YYYY-MM-DD` or null. */
  dueDate: string | null;
  projectId: string;
};

export type TeamPersonDetailWire = {
  person: TeamPersonProfileWire;
  /** Absent unless the viewer is an Admin or Super-admin. */
  accountRole?: string;
  projects: TeamProjectRefWire[];
  tasks?: TeamTaskRefWire[];
  availability: LeaveStatusWire | null;
  /** False when the viewer may see the person but not their work; `tasks` and `load` are then absent. */
  tasksVisible: boolean;
  load?: TeamLoadWire;
  alsoElsewhere?: true;
};

/** The list as the screen asks for it. */
export type TeamQuery = { q: string; sort: TeamSortWire };

export const DEFAULT_TEAM_QUERY: TeamQuery = { q: '', sort: 'name' };

/** One query string per query-as-shown; also the resource name, so two are never confused. */
export const teamQueryKey = (query: TeamQuery): string =>
  `team:${query.sort}:${query.q.trim().slice(0, TEAM_SEARCH_MAX)}`;

function teamUrl(query: TeamQuery, offset: number, limit: number): string {
  const params = new URLSearchParams({
    sort: query.sort,
    limit: String(limit),
    offset: String(offset),
  });
  const q = query.q.trim().slice(0, TEAM_SEARCH_MAX);
  if (q) params.set('q', q);
  return `/api/app/team?${params.toString()}`;
}

export type TeamListResource = OffsetPaged<TeamPersonWire, TeamSummaryWire>;

const lists = new Map<string, TeamListResource>();

/**
 * The people matching `query`, paged. One resource per query-as-shown, kept so a screen that
 * re-renders with the same query reads the rows it already has instead of starting again.
 *
 * `sort=active|overdue` can be refused with **422 `SORT_NOT_ALLOWED`** for a caller with no right
 * to anyone else's numbers; that arrives as the resource's error, with the server's own sentence,
 * which is why the screen offers the name order next to it rather than silently falling back.
 */
export function teamList(query: TeamQuery): TeamListResource {
  const key = teamQueryKey(query);
  const held = lists.get(key);
  if (held) return held;
  const made = offsetPaged<TeamPersonWire, TeamSummaryWire>(
    key,
    TEAM_LIMIT,
    async (offset, limit) => {
      const body = await apiGet<TeamListWire>(teamUrl(query, offset, limit));
      return { rows: body.people, total: body.total, extra: body.summary };
    },
  );
  lists.set(key, made);
  return made;
}

const people = new Map<string, Resource<TeamPersonDetailWire>>();

/**
 * One person by their account id. Someone the caller shares no project with answers **404**, not
 * 403: the caller may not learn that the account exists, so the screen shows "not found" for both.
 */
export function teamPerson(userId: string): Resource<TeamPersonDetailWire> {
  const held = people.get(userId);
  if (held) return held;
  const made = resource<TeamPersonDetailWire>(`team.person:${userId}`, () =>
    apiGet<TeamPersonDetailWire>(`/api/app/team/${encodeURIComponent(userId)}`),
  );
  people.set(userId, made);
  return made;
}

/** Drop the held resources. The stores themselves are cleared by `forgetAllResources`. test-only */
export function resetTeamApi(): void {
  lists.clear();
  people.clear();
}
