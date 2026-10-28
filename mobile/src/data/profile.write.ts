/**
 * My profile's writes: `PATCH /api/app/profile` (Edit profile) and `PUT /api/app/profile/notifications` (the two
 * switches). Each reports a failure to the session and re-throws it, so the screen can show the server's message
 * (a refused field included); only an accepted write marks reads stale.
 */
import { apiJson, apiPatch } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import {
  type NotificationPrefsWire,
  notificationsResource,
  type ProfilePatchWire,
  type ProfileWire,
  profileResource,
} from './profile.api';
import { type Resource, write } from './resource';
import { teamResource } from './team.api';

async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}

/** Save the Edit profile form. Team shows job title and division, so it is read again too. */
export const saveProfile = (patch: ProfilePatchWire): Promise<ProfileWire> =>
  write(
    () => send(() => apiPatch<ProfileWire>('/api/app/profile', patch)),
    [profileResource as Resource<unknown>, teamResource as Resource<unknown>],
  );

/** Flip one or both notification switches; the answer is both, as the server now has them. */
export const saveNotifications = (
  patch: Partial<NotificationPrefsWire>,
): Promise<NotificationPrefsWire> =>
  write(
    () =>
      send(() =>
        apiJson<NotificationPrefsWire>('/api/app/profile/notifications', {
          method: 'PUT',
          body: patch,
        }),
      ),
    [notificationsResource as Resource<unknown>],
  );
