/**
 * My own profile on the server: `GET /api/app/profile` for the fields the modal shows, and
 * `GET/PUT /api/app/profile/notifications` for the two switches that really exist.
 *
 * Two notes about this endpoint family:
 *
 * - **Both are session-only** (`PM_KEY_DENY`, `server/api-keys/scopes.pm.ts`), so the profile
 *   screen works through the Better Auth session and never through an API key. Nothing to do here:
 *   that is the only way this app talks to the server anyway.
 * - **There is one switch on the phone and two on the server.** The server's notification
 *   preferences are `eventReminder` and `inboxNews`, and a card in the *action* lane cannot be
 *   silenced at all (`server/notification/notification.catalog.ts`) — somebody has to answer it.
 *   So the single "Mute notifications" switch of the prototype is replaced by the two the server
 *   keeps, which is what the web shows too (GAP A-23).
 */
import { apiGet, apiJson } from '@/api';

import { resource, write } from './resource';

/** `ProfileView` in `server/profile/profile.service.ts`. `name` and `email` are the account's own. */
export type ProfileWire = {
  userId: string;
  name: string;
  email: string;
  displayName: string | null;
  nickname: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  /** Three steps the web scales its text by; the phone does not follow it yet (B-18). */
  textSize: string;
};

/** The only two switches that exist (`server/api/app-profile.notifications.ts`). */
export type NotificationPrefsWire = { eventReminder: boolean; inboxNews: boolean };

export const profileResource = resource<ProfileWire>('profile', () =>
  apiGet<ProfileWire>('/api/app/profile'),
);

export const notificationPrefsResource = resource<NotificationPrefsWire>(
  'profile.notifications',
  () => apiGet<NotificationPrefsWire>('/api/app/profile/notifications'),
);

/** Ask for the profile once; safe from every screen, every mount. */
export const ensureProfile = (): Promise<unknown> => profileResource.ensure();

/** Ask for the notification switches once. */
export const ensureNotificationPrefs = (): Promise<unknown> => notificationPrefsResource.ensure();

/**
 * Flips one notification switch. The body carries only what changed — the route takes both keys as
 * optional — and the switches are marked stale afterwards so the screen shows what the server
 * stored rather than what the finger asked for.
 */
export const saveNotificationPrefs = (
  patch: Partial<NotificationPrefsWire>,
): Promise<NotificationPrefsWire> =>
  write(
    () =>
      apiJson<NotificationPrefsWire>('/api/app/profile/notifications', {
        method: 'PUT',
        body: patch,
      }),
    [notificationPrefsResource],
  );
