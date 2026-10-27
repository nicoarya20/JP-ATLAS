// Settings for the screens (prototype settings.main.jsx / settings.profile.jsx): my account line, what an Admin sees
// on top and the profile form. Phase 2 reads and saves through the API.
import { me, type PersonInfo } from './people';
import type { Role } from './sample';

export type SettingsData = {
  me: PersonInfo;
  /** "Project Manager · Product division". */
  line: string;
  /** Team settings (Admin only). */
  team: boolean;
  /** Closing footnote. */
  footer: string;
};

/** Settings ① for `role`. */
export function getSettings(role: Role): SettingsData {
  const p = me(role);
  const admin = role === 'admin';
  return {
    me: p,
    line: `${p.title} · ${p.division} division`,
    team: admin,
    footer: `Project settings live inside each project.${admin ? ' Account roles are managed in Users (Admin).' : ''}`,
  };
}

/** Settings ② Edit profile: what the form starts with; Role and Email are read-only. */
export function getProfileEdit(role: Role) {
  const p = me(role);
  return {
    full: p.full,
    nickname: p.name,
    title: p.title,
    division: p.division,
    role: p.role,
    email: p.email,
  };
}
