/**
 * Admin Beranda route (`GET /api/admin/overview`, P11 AD-14): the whole dashboard in one read-only
 * call, workspace-wide. Nested in `adminApi` through `adminContext`, so only an Admin or Super-admin
 * reaches it; every section is a `Widget { ok }` and fails softly on its own (see `overview.service`).
 */
import { Elysia } from 'elysia';
import { getOverview } from '../admin/overview/overview.service';
import { adminContext } from './admin-context';

export const adminOverviewApi = new Elysia()
  .use(adminContext)
  /** Pending approvals, members by role, projects by status, overdue tasks, agenda and recent role changes. */
  .get('/overview', () => getOverview());
