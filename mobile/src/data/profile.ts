// Profile ① for the screens (prototype profile.main.jsx): my name, hero line, photo and the Inbox count, from the
// server (`GET /api/app/profile` + whoami's role + the session's photo). My calendar is `profile.calendar.ts`.
import { type SessionUser, sessionStore } from '@/session/session.state';

import { useInboxActionCount } from './inbox.api';
import { type ProfileWire, profileResource } from './profile.api';
import { useStore } from './store';
import { ACCOUNT_ROLE } from './team.person';
import { roleOf } from './users.admin.wire';
import { type WhoamiWire, whoamiResource } from './whoami.api';

export type ProfileData = {
  /** `displayName`, else the account name; the session's name until the profile is in. */
  full: string;
  email: string;
  /** "Project Manager · Product", plus " · Admin" for an Admin; parts the profile leaves empty are left out. */
  line: string;
  /** The account photo from the session (ProfileView has none, GAP P-6); null draws the initials. */
  image: string | null;
  /** Open cards in Inbox › Needs your response, from `GET /inbox/count`; null while it is not in (no badge). */
  inbox: number | null;
};

const ADMIN_ROLES = new Set(['admin', 'super-admin']);

/** The hero line from the profile's job and division, and the account role for an Admin (or when nothing else). */
function lineOf(p: ProfileWire | null, who: WhoamiWire | null): string {
  const role = who ? ACCOUNT_ROLE[roleOf(who.role)] : null;
  const parts = [p?.jobTitle, p?.department].filter((x): x is string => !!x);
  if (role && (ADMIN_ROLES.has(who?.role ?? '') || !parts.length)) parts.push(role);
  return parts.join(' · ');
}

/** Profile ① from what the server sent so far. */
export function profileData(
  p: ProfileWire | null,
  who: WhoamiWire | null,
  user: SessionUser | null,
  inbox: number | null,
): ProfileData {
  return {
    full: p?.displayName ?? p?.name ?? user?.name ?? '',
    email: p?.email ?? user?.email ?? '',
    line: lineOf(p, who),
    image: user?.image ?? null,
    inbox,
  };
}

/** Profile ① in a component, redrawn as the profile, whoami, the session and the Inbox count come in. */
export function useProfileData(): ProfileData {
  const p = profileResource.use().data;
  const who = whoamiResource.use().data;
  const user = useStore(sessionStore, (s) => s.user);
  return profileData(p, who, user, useInboxActionCount());
}
