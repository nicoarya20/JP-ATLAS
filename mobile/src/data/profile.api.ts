/**
 * My own profile (map `phase2-map-profile-archive.md` §1–2): `GET /api/app/profile` and the two notification
 * switches `GET /api/app/profile/notifications`. The photo is not in `ProfileView` (GAP P-6): it is the session's
 * `user.image`, and changing it is deferred (GAP P-5, needs an image picker). `textSize` and `phone` are on the wire
 * but not used (B-18, P-4).
 */
import { apiGet } from '@/api/client';

import { resource } from './resource';

export type ProfileWire = {
  userId: string;
  /** The account name (Google); what `displayName` falls back to. */
  name: string;
  email: string;
  displayName: string | null;
  nickname: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  textSize: string;
};

/** The fields the Edit profile form sends; blank clears one (the server stores null). */
export type ProfilePatchWire = Partial<
  Pick<ProfileWire, 'displayName' | 'nickname' | 'jobTitle' | 'department'>
>;

export type NotificationPrefsWire = { eventReminder: boolean; inboxNews: boolean };

/** The server's own limits (`server/profile/profile.rules.ts`), so the form never sends what it refuses. */
export const PROFILE_MAX = { name: 80, nickname: 30, title: 80, department: 80 } as const;

export const profileResource = resource<ProfileWire>('profile', () =>
  apiGet<ProfileWire>('/api/app/profile'),
);

export const notificationsResource = resource<NotificationPrefsWire>('profile:notifications', () =>
  apiGet<NotificationPrefsWire>('/api/app/profile/notifications'),
);
