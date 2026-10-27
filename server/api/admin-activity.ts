/**
 * Admin activity reading (`GET /api/admin/activity`, P11 AD-18): the whitelisted, email-masked view
 * of the audit trail for Admin + Super-admin. Read-only by design — the trail is never written or
 * edited from here, so there is no POST/DELETE and no `audit()` call.
 *
 * Nested in `adminApi` and gated by `adminContext` on its own, so the route is Admin + Super-admin
 * whatever order a parent mounts it in. API keys are refused earlier (`requiredScope` returns null
 * for this prefix): this is a console-only human read, like the CSV export beside it.
 *
 * Super-admin actors are shown, not hidden. The whitelist — not the actor's role — is the boundary:
 * if a super-admin approved an account or deleted a project, hiding that row would leave the admin's
 * "who did this?" unanswered, which is the one thing this page exists to answer. Email masking plus
 * the narrowed columns already keep the exposure minimal (see `audit.admin`).
 */
import { Elysia } from 'elysia';
import { AdminActivityQuery, listAdminActivity } from './admin-activity.query';
import { adminContext } from './admin-context';

export const adminActivityApi = new Elysia().use(adminContext).get(
  '/activity',
  ({ query }) => listAdminActivity(query),
  { query: AdminActivityQuery },
);
