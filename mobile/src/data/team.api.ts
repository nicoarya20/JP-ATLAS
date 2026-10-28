/**
 * `/api/app/team`: the people I share projects with, and one of them (map
 * `phase2-map-home-inbox-team.md` §3, pattern `phase2-pola-data.md`).
 *
 * Privacy is the server's, by **absent keys** (`server/team/team.dto.ts`): `load`, `alsoElsewhere`,
 * `tasks`, `accountRole`, `person.phone` and `summary.active/overdue` are missing for a caller who
 * may not see them. The types keep them optional and nothing here fills them in.
 *
 * Paging works like the Inbox (`inbox.api.ts`), by offset: the resource holds every page loaded so
 * far; `load()` either appends the next page (`more`) or reloads page one at the size on screen
 * (24 to 50). The query (search, sort) lives here too: changing it reloads from page one, and a
 * load that finds the query changed while it was out asks again, so typing never lands an
 * answer for words that are no longer in the box.
 */
import { apiGet } from '@/api/client';
import { sessionStore } from '@/session/session.state';

import { type Resource, type ResourceState, resource } from './resource';

export type ProjectRoleWire = 'manager' | 'member' | 'viewer';
export type TaskStatusWire = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
export type AccountRoleWire = 'member' | 'project_manager' | 'admin' | 'super-admin';

export type TeamProjectWire = { id: string; name: string; role: ProjectRoleWire };
export type TeamLoadWire = { active: number; overdue: number; alsoElsewhere?: true };
/** A recorded leave under way, or null: "nothing to show", never "available". */
export type TeamAvailabilityWire = { kind: 'on_leave'; until: string } | null;

export type TeamPersonWire = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
  isSelf: boolean;
  projects: TeamProjectWire[];
  load?: TeamLoadWire;
  availability: TeamAvailabilityWire;
};

export type TeamSummaryWire = {
  people: number;
  projects: number;
  active?: number;
  overdue?: number;
};
export type TeamListWire = { summary: TeamSummaryWire; people: TeamPersonWire[]; total: number };

export type TeamTaskWire = {
  number: number;
  title: string;
  status: TaskStatusWire;
  dueDate: string | null;
  projectId: string;
};

export type TeamPersonDetailWire = {
  person: {
    id: string;
    name: string;
    jobTitle: string | null;
    department: string | null;
    email: string;
    phone?: string;
  };
  accountRole?: AccountRoleWire;
  projects: TeamProjectWire[];
  tasks?: TeamTaskWire[];
  availability: TeamAvailabilityWire;
  tasksVisible: boolean;
  load?: TeamLoadWire;
  alsoElsewhere?: true;
};

export type TeamSort = 'name' | 'active' | 'overdue';
export type TeamQuery = { q: string; sort: TeamSort };

/** The pages loaded so far, the query they answer, and the summary of the request for page one. */
export type TeamListData = TeamListWire & {
  query: TeamQuery;
  /** True once a page was appended: `summary.active/overdue` then describe page one only. */
  appended: boolean;
};

export const TEAM_PAGE = 24;
/** The server clamps `limit` to 50; a refresh never asks for more in one request. */
export const TEAM_PAGE_MAX = 50;
/** The server refuses a longer search (`TEAM_SEARCH_MAX`). */
export const TEAM_SEARCH_MAX = 100;

const DEFAULT_QUERY: TeamQuery = { q: '', sort: 'name' };
let query: TeamQuery = DEFAULT_QUERY;
let more = false;

const listUrl = (qy: TeamQuery, limit: number, offset: number) => {
  const params = [`limit=${limit}`, `offset=${offset}`];
  const q = qy.q.trim().slice(0, TEAM_SEARCH_MAX);
  if (q) params.push(`q=${encodeURIComponent(q)}`);
  if (qy.sort !== 'name') params.push(`sort=${qy.sort}`);
  return `/api/app/team?${params.join('&')}`;
};

/** Page one, at the size on screen for the same query, asked again while the query keeps changing. */
async function firstPage(had: TeamListData | null): Promise<TeamListData> {
  for (;;) {
    const asOf = query;
    const shown = had?.query === asOf ? had.people.length : 0;
    const limit = Math.min(TEAM_PAGE_MAX, Math.max(TEAM_PAGE, shown));
    const page = await apiGet<TeamListWire>(listUrl(asOf, limit, 0));
    if (asOf === query) return { ...page, query: asOf, appended: false };
  }
}

async function loadTeam(): Promise<TeamListData> {
  const asked = more;
  more = false;
  const had = teamResource.current();
  const asOf = query;
  if (asked && had?.query === asOf && had.people.length < had.total) {
    const next = await apiGet<TeamListWire>(listUrl(asOf, TEAM_PAGE, had.people.length));
    // A page for a query that changed while it was out belongs to the old list: start over.
    if (asOf === query)
      return { ...had, people: [...had.people, ...next.people], total: next.total, appended: true };
  }
  return firstPage(had);
}

export const teamResource: Resource<TeamListData> = resource<TeamListData>('team', loadTeam);

/** What the list is asking for now. */
export const getTeamQuery = (): TeamQuery => query;

/** Change the search or the sort and reload from page one. */
export function setTeamQuery(next: Partial<TeamQuery>): Promise<ResourceState<TeamListData>> {
  query = { ...query, ...next };
  return teamResource.reload();
}

/** The next page, appended; nothing while a request is out or when every person is on screen. */
export function loadMoreTeam(): Promise<ResourceState<TeamListData>> {
  const state = teamResource.peek();
  const data = state.data;
  if (state.phase === 'loading' || !data || data.people.length >= data.total)
    return Promise.resolve(state);
  more = true;
  return teamResource.reload();
}

/** Back to the default search and sort. test-only */
export function resetTeamQuery(): void {
  query = DEFAULT_QUERY;
  more = false;
}

// The next account starts with an empty search, like it starts with no data (`forgetAllResources`).
sessionStore.subscribe(() => {
  if (sessionStore.get().status === 'signed-out') resetTeamQuery();
});

// One resource per person opened, kept for the session; each is in resource()'s own registry, so
// sign out forgets them like every other.
const people = new Map<string, Resource<TeamPersonDetailWire>>();

/** `GET /api/app/team/:userId`. */
export function teamPersonResource(userId: string): Resource<TeamPersonDetailWire> {
  const known = people.get(userId);
  if (known) return known;
  const made = resource<TeamPersonDetailWire>(`team:${userId}`, () =>
    apiGet<TeamPersonDetailWire>(`/api/app/team/${encodeURIComponent(userId)}`),
  );
  people.set(userId, made);
  return made;
}
