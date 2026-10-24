// Settings for the screens (prototype settings.main.jsx / settings.profile.jsx / settings.leave.jsx): my account line,
// what an Admin sees on top, the profile form and the leave sheet per role. Phase 2 reads and saves through the API.
import { me, type PersonInfo } from './people';
import type { Role } from './sample';

export type SettingsData = {
  me: PersonInfo;
  /** "Project Manager · Product division". */
  line: string;
  /** Admin sets leave directly; the others request it. */
  leaveAction: string;
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
    leaveAction: admin ? 'Set leave' : 'Request leave',
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

export type LeaveData = {
  title: string;
  hint: string;
  save: string;
  notice: string;
  /** Sample dates (ISO) and note the sheet opens with. */
  from: string;
  to: string;
  note: string;
};

/** Leave sheet copy per role; the Create sheet reads its titles. */
export const LEAVE: Record<Role, Pick<LeaveData, 'title' | 'hint' | 'save' | 'notice'>> = {
  member: {
    title: 'Request leave',
    hint: 'Request is sent to your project Manager or Admin.',
    save: 'Send request',
    notice: 'Leave request sent',
  },
  pm: {
    title: 'Request leave',
    hint: 'Request is sent to Admin.',
    save: 'Save',
    notice: 'Leave request sent',
  },
  admin: {
    title: 'Set leave',
    hint: 'Admin leave applies immediately, no approval.',
    save: 'Save leave',
    notice: 'Leave saved',
  },
};

/** Settings ③ Leave sheet for `role`. */
export const getLeave = (role: Role): LeaveData => ({
  ...LEAVE[role],
  from: '2026-10-12',
  to: '2026-10-14',
  note: 'Family leave',
});
