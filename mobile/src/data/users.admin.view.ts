/**
 * The Users screen's rows, from `/api/admin/users` and whoami. The list sends no per-row permission, so whether a row
 * may be changed mirrors the server's own policy (`server/access/user.policy.ts`: not yourself, never a Super-admin,
 * an Admin only by a Super-admin); the server still decides, and its refusal is shown as it came.
 */
import { monthDay } from './dates';
import { dayAndClock } from './events.time';
import type { AccountRoleWire } from './team.api';
import { ACCOUNT_ROLE } from './team.person';
import { type AdminUserWire, GRANTABLE, roleOf } from './users.admin.wire';
import type { WhoamiWire } from './whoami.api';

export type SignUpCard = {
  id: string;
  full: string;
  email: string;
  /** When they asked to join: "Oct 6 · 9:41 AM". */
  asked: string;
};

export type RoleOption = { value: AccountRoleWire; label: string };

export type AccountRow = {
  id: string;
  full: string;
  email: string;
  role: AccountRoleWire;
  roleLabel: string;
  you: boolean;
  /** Deactivated (banned): offered Reactivate instead of the role picker. */
  deactivated: boolean;
  /** Role picker, Deactivate and Reactivate are offered. */
  editable: boolean;
  /** The roles the picker offers, the current one included. */
  options: RoleOption[];
};

export function signUpCard(u: AdminUserWire): SignUpCard {
  const at = dayAndClock(u.createdAt);
  return { id: u.id, full: u.name, email: u.email, asked: `${monthDay(at.date)} · ${at.clock}` };
}

const option = (value: AccountRoleWire): RoleOption => ({ value, label: ACCOUNT_ROLE[value] });

export function accountRow(u: AdminUserWire, me: WhoamiWire | null): AccountRow {
  const role = roleOf(u.role);
  const superAdmin = me?.role === 'super-admin';
  const grantable: AccountRoleWire[] = superAdmin ? [...GRANTABLE, 'admin'] : [...GRANTABLE];
  const you = u.id === me?.userId;
  return {
    id: u.id,
    full: u.name,
    email: u.email,
    role,
    roleLabel: ACCOUNT_ROLE[role],
    you,
    deactivated: u.banned === true,
    editable: !you && grantable.includes(role),
    options: [...new Set<AccountRoleWire>([...grantable, role])].map(option),
  };
}
