/**
 * Users (Admin) reads. **This module deliberately calls `/api/admin`, not `/api/app`**: the server has no account
 * route under `/api/app`, and the coordinator chose (28 Oct 2026, decision (a)) to wire the Admin screen to the
 * admin console's own API instead of waiting for one. Its gate is `adminContext` (Admin and Super-admin), so the More
 * tile and the screen show only when `whoami.caps.dashboard` says so, never from a guessed role; a 403 the server
 * still answers is shown as it came.
 *
 * Two lists, one per tab (`approval=pending`, oldest first; `approval=approved`, by name), each paged by `page` +
 * `limit` like the Trash (`trash.api.ts`) with a server-side search; and the headline counts (`/users/stats`).
 */
import { apiGet } from '@/api/client';
import { sessionStore } from '@/session/session.state';

import { type Resource, type ResourceState, resource } from './resource';
import type { AdminUserStatsWire, AdminUsersPageWire, AdminUserWire } from './users.admin.wire';

export type UsersTab = 'approval' | 'roles';

export const USERS_PAGE = 25;
/** The server clamps `limit` to 100 (`MAX_PAGE_SIZE`). */
export const USERS_PAGE_MAX = 100;
/** Longest search sent; the server has no limit of its own, this only keeps the URL sane. */
export const USERS_SEARCH_MAX = 100;

export type UsersListData = { users: AdminUserWire[]; total: number; search: string };

export type UsersList = {
  resource: Resource<UsersListData>;
  getSearch: () => string;
  /** Search by name, email or id and reload from page one. */
  setSearch: (q: string) => Promise<ResourceState<UsersListData>>;
  /** The next page, appended; nothing while a request is out or when every row is on screen. */
  loadMore: () => Promise<ResourceState<UsersListData>>;
  /** Back to no search. test-only */
  reset: () => void;
};

const QUERY: Record<UsersTab, string> = {
  approval: 'approval=pending&sort=oldest',
  roles: 'approval=approved&sort=name',
};

/** The page that starts right after the `shown` rows: page n of 25, or page 2 of `shown` after a resized refresh. */
const nextAt = (shown: number) =>
  shown % USERS_PAGE === 0
    ? { n: shown / USERS_PAGE + 1, limit: USERS_PAGE }
    : { n: 2, limit: shown };

function usersList(tab: UsersTab): UsersList {
  let search = '';
  let more = false;
  const page = (q: string, n: number, limit: number) => {
    const s = q.trim().slice(0, USERS_SEARCH_MAX);
    const find = s ? `&search=${encodeURIComponent(s)}` : '';
    return apiGet<AdminUsersPageWire>(
      `/api/admin/users?${QUERY[tab]}&page=${n}&limit=${limit}${find}`,
    );
  };
  const shape = (answer: AdminUsersPageWire, q: string): UsersListData => ({
    users: answer.users,
    total: answer.total,
    search: q,
  });
  // Page one, at the size on screen for the same search, asked again while the search keeps changing.
  const firstPage = async (had: UsersListData | null): Promise<UsersListData> => {
    for (;;) {
      const asOf = search;
      const shown = had?.search === asOf ? had.users.length : 0;
      const answer = await page(asOf, 1, Math.min(USERS_PAGE_MAX, Math.max(USERS_PAGE, shown)));
      if (asOf === search) return shape(answer, asOf);
    }
  };
  const load = async (): Promise<UsersListData> => {
    const asked = more;
    more = false;
    const had = res.current();
    const asOf = search;
    const shown = had?.users.length ?? 0;
    if (asked && had?.search === asOf && shown < had.total && shown <= USERS_PAGE_MAX) {
      const at = nextAt(shown);
      const next = await page(asOf, at.n, at.limit);
      if (asOf === search) {
        // The server pages by offset: a row that moved up a page while this one was out is not shown twice.
        const seen = new Set(had.users.map((u) => u.id));
        return {
          ...shape(next, asOf),
          users: [...had.users, ...next.users.filter((u) => !seen.has(u.id))],
        };
      }
    }
    return firstPage(had);
  };
  const res: Resource<UsersListData> = resource<UsersListData>(`admin-users:${tab}`, load);
  const reset = () => {
    search = '';
    more = false;
  };
  // The next account starts with an empty search, like it starts with no data (`forgetAllResources`).
  sessionStore.subscribe(() => {
    if (sessionStore.get().status === 'signed-out') reset();
  });
  return {
    resource: res,
    getSearch: () => search,
    setSearch: (q) => {
      search = q;
      return res.reload();
    },
    loadMore: () => {
      const state = res.peek();
      const data = state.data;
      if (state.phase === 'loading' || !data || data.users.length >= data.total)
        return Promise.resolve(state);
      more = true;
      return res.reload();
    },
    reset,
  };
}

const LISTS: Record<UsersTab, UsersList> = {
  approval: usersList('approval'),
  roles: usersList('roles'),
};

/** The list behind a tab. */
export const usersListOf = (tab: UsersTab): UsersList => LISTS[tab];

/** `GET /api/admin/users/stats`: the headline counts, `pending` among them. */
export const usersStatsResource = resource<AdminUserStatsWire>('admin-users:stats', () =>
  apiGet<AdminUserStatsWire>('/api/admin/users/stats'),
);

/** Sign-ups waiting for a decision, in a component; null while the count is not in (no badge, not 0). */
export const useUsersPending = (): number | null => usersStatsResource.use().data?.pending ?? null;
