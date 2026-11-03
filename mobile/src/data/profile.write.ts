/**
 * My profile's writes: `PATCH /api/app/profile` (Edit profile), `POST /api/app/avatar` (its photo) and
 * `PUT /api/app/profile/notifications` (the two switches). Each reports a failure to the session and re-throws it, so
 * the screen can show the server's message (a refused field included); only an accepted write marks reads stale.
 */
import { apiJson, apiPatch } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError, setSessionImage } from '@/session/session.state';

import {
  type NotificationPrefsWire,
  notificationsResource,
  type ProfilePatchWire,
  type ProfileWire,
  profileResource,
} from './profile.api';
import type { PickedPhoto } from './profile.photo';
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

/** A photo upload gets longer than a JSON write: phones often send it over a slow network. */
export const PHOTO_UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Upload my new profile photo; the server's URL for it becomes the session's photo, so every avatar redraws. Team
 * carries each member's photo, so it is read again too.
 */
export async function uploadPhoto(photo: PickedPhoto): Promise<string | null> {
  const form = new FormData();
  // React Native's FormData sends a file from its uri; the DOM typing has no such part, hence the cast.
  form.append('file', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  const { image } = await write(
    () =>
      send(() =>
        apiJson<{ image: string | null }>('/api/app/avatar', {
          method: 'POST',
          rawBody: form,
          timeoutMs: PHOTO_UPLOAD_TIMEOUT_MS,
        }),
      ),
    [teamResource as Resource<unknown>],
  );
  setSessionImage(image);
  return image;
}

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
