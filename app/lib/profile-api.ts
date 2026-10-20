/** Client helpers for the settings page (/app/settings): own login history + session/account display helpers. */

import { parseUserAgent } from '@server/middleware/visitor-ua';
import type { TextSize } from '@server/pm/enums';
import type { LoginRow } from './login-logs-api';
import { deviceLabel, deviceSummary } from './visits-format';

/** Own profile as returned by GET/PATCH /api/app/profile (`name`/`email` are read-only there). */
export type MyProfile = {
  userId: string;
  name: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  textSize: TextSize;
};
export type MyProfilePatch = Partial<
  Pick<MyProfile, 'displayName' | 'phone' | 'jobTitle' | 'department' | 'textSize'>
>;

const PROFILE_URL = '/api/app/profile';

/** Saves profile fields; the server also refreshes the `mk-text-size` cookie when `textSize` is sent. */
export async function patchMyProfile(patch: MyProfilePatch): Promise<MyProfile> {
  const res = await fetch(PROFILE_URL, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Gagal menyimpan profil (${res.status}). Coba lagi.`);
  }
  return res.json();
}

/** The two Pengaturan › Pemberitahuan switches as GET/PUT /api/app/profile/notifications return them. */
export type NotificationPrefs = { eventReminder: boolean; inboxNews: boolean };

const NOTIFICATIONS_URL = `${PROFILE_URL}/notifications`;

/** Saves the given switches (the rest stay as they are) and returns both as the server now has them. */
export async function putNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const res = await fetch(NOTIFICATIONS_URL, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Gagal menyimpan pemberitahuan (${res.status}). Coba lagi.`);
  }
  return res.json();
}

/** GET /api/app/profile/delete-check: the active projects only the caller manages (they block the deletion). */
export type DeleteCheck = {
  canDelete: boolean;
  projects: { id: string; name: string }[];
  total: number;
};

export async function fetchDeleteCheck(): Promise<DeleteCheck> {
  const res = await fetch(`${PROFILE_URL}/delete-check`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Gagal memeriksa akun (${res.status}). Coba lagi.`);
  }
  return res.json();
}

/** True when the typed email matches (ignoring case and surrounding spaces) and a password is given if one is needed. */
export function canConfirmDelete(input: {
  typed: string;
  email: string;
  needsPassword: boolean;
  password: string;
}): boolean {
  const matches = input.typed.trim().toLowerCase() === input.email.toLowerCase();
  return matches && (!input.needsPassword || input.password.length > 0);
}

export type MyLogins = { rows: LoginRow[]; total: number };

export async function fetchMyLogins(limit = 10): Promise<MyLogins> {
  const res = await fetch(`/api/me/logins?limit=${limit}`);
  if (!res.ok) throw new Error(`Gagal memuat riwayat login (${res.status})`);
  return res.json();
}

/** Shape returned by authClient.listSessions(). */
export type DeviceSession = {
  id: string;
  token: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  expiresAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Shape returned by authClient.listAccounts(). */
export type LinkedAccount = {
  id: string;
  providerId: string;
  accountId?: string;
  createdAt?: string | Date;
};

/** "Chrome 125 · macOS 14 · Desktop" from a raw session user agent. */
export function describeSession(userAgent: string | null | undefined): {
  summary: string;
  device: string;
} {
  const p = parseUserAgent(userAgent ?? '');
  return { summary: deviceSummary(p), device: deviceLabel(p.deviceType) };
}

export function isCurrentSession(
  s: Pick<DeviceSession, 'token'>,
  currentToken: string | null | undefined,
): boolean {
  return Boolean(currentToken) && s.token === currentToken;
}

export function hasPasswordAccount(accounts: LinkedAccount[]): boolean {
  return accounts.some((a) => a.providerId === 'credential');
}

/** Provider display name. */
export function providerLabel(id: string): string {
  if (id === 'credential') return 'Email & password';
  return id.charAt(0).toUpperCase() + id.slice(1);
}
