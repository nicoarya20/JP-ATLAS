/**
 * Users (Admin) writes. **Deliberately `/api/admin`, not `/api/app`** — see `users.admin.api.ts`. Approve, reject,
 * change role, deactivate (ban) and reactivate (unban); every one is a T2 dialog on screen. Deleting an account
 * (`DELETE /api/admin/users/:id`, Super-admin only) is not offered on the phone (`phase2-gap-disembunyikan.md`).
 *
 * Each write reports a failure to the session and re-throws it, so the screen can show the server's own message (a
 * 403 included); only an accepted write marks reads stale: both lists, the counts, the Inbox (a sign-up is a card
 * there) and Team (who is on it, with which role).
 */
import { apiPost } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { inboxActionResource, inboxCountResource } from './inbox.api';
import { type Resource, write } from './resource';
import type { AccountRoleWire } from './team.api';
import { teamResource } from './team.api';
import { usersListOf, usersStatsResource } from './users.admin.api';

async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

const targets = (): Resource<unknown>[] => [
  usersListOf('approval').resource as Resource<unknown>,
  usersListOf('roles').resource as Resource<unknown>,
  usersStatsResource as Resource<unknown>,
  inboxActionResource as Resource<unknown>,
  inboxCountResource as Resource<unknown>,
  teamResource as Resource<unknown>,
];

const post = (id: string, action: string, body: unknown) =>
  write(
    () =>
      send(() =>
        apiPost<{ ok: true }>(`/api/admin/users/${encodeURIComponent(id)}/${action}`, body),
      ),
    targets(),
  );

/** Let a sign-up in, starting as `role`. */
export const approveUser = (id: string, role: AccountRoleWire) => post(id, 'approve', { role });

/** Turn a sign-up down; the person sees `reason` when they try to sign in. */
export const rejectUser = (id: string, reason: string) =>
  post(id, 'reject', { reason: reason.trim() });

/** Give an approved account another role (effective at their next sign-in). */
export const setUserRole = (id: string, role: AccountRoleWire) => post(id, 'role', { role });

/** Deactivate: a permanent ban that also ends every live session. */
export const deactivateUser = (id: string) => post(id, 'ban', {});

/** Lift a deactivation. */
export const reactivateUser = (id: string) => post(id, 'unban', {});
