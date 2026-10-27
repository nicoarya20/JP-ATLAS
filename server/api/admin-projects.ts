/**
 * Admin cross-org project console (`/api/admin/projects`, P11 AD-11..AD-13): the list of every
 * live project and who manages it, plus handing a project to another Pengelola. The list reuses
 * `listProjects` with the Admin scope so it can never diverge from the product's own list (AD-11);
 * the manager handover is session only (`PM_KEY_DENY`) and audited as `PROJECT_MANAGER_SET` (AD-13).
 */
import { Elysia, t } from 'elysia';
import { PROJECT_STATUSES, type ProjectStatus } from '../pm/enums';
import { listProjects, PROJECT_SORTS, type ProjectSort } from '../project/project.query';
import { parsePaging } from './analytics-paging';
import { adminContext, callerOf } from './admin-context';

const SEARCH_MAX_LENGTH = 100;

/**
 * Lenient string query, like the other admin lists (`admin-users.query`): the values are normalised
 * in code, not by the schema, so a bad filter never answers 422 before the gate has decided 401/403.
 */
const ListQuery = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  status: t.Optional(t.String()),
  q: t.Optional(t.String()),
  sort: t.Optional(t.String()),
});

const STATUSES: readonly string[] = PROJECT_STATUSES;
const SORTS: readonly string[] = PROJECT_SORTS;
const toStatus = (v: string | undefined): ProjectStatus | undefined =>
  v && STATUSES.includes(v) ? (v as ProjectStatus) : undefined;
const toSort = (v: string | undefined): ProjectSort | undefined =>
  v && SORTS.includes(v) ? (v as ProjectSort) : undefined;

export const adminProjectsApi = new Elysia({ prefix: '/projects' })
  .use(adminContext)
  /**
   * Every live project the Admin may manage: `{ items, total, page, limit }`. Scope is forced to
   * `all` (the Admin level already allows it) and the Pengelola name comes from the query's lead
   * join, so the page never fires one request per project (CLAUDE.md §13, R6).
   */
  .get(
    '/',
    async (ctx) => {
      const { query } = ctx;
      const { principal } = callerOf(ctx);
      const { page, limit, offset } = parsePaging(query);
      const { items, total } = await listProjects(principal, {
        scope: 'all',
        status: toStatus(query.status),
        q: query.q?.trim().slice(0, SEARCH_MAX_LENGTH) || undefined,
        sort: toSort(query.sort),
        limit,
        offset,
        now: new Date(),
      });
      return { items, total, page, limit };
    },
    { query: ListQuery },
  );

export type AdminProjectsApi = typeof adminProjectsApi;
