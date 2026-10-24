// Users for the Admin screens (prototype users.approve.jsx / users.roles.jsx): sign-ups waiting for a decision and the
// approved accounts with their role. Phase 2 reads the API here.
import { type AccountRole, me, type PersonInfo, person } from './people';
import { USER_COUNTS } from './sample';
import {
  APPROVED_USERS,
  PENDING_USERS,
  type PendingUser,
  REJECT_REASON_DRAFT,
} from './sample/users';

export type UsersTab = 'approval' | 'roles';

/** Roles an Admin can give in the Approval and Roles tabs. */
export const GRANTABLE_ROLES: readonly AccountRole[] = ['Member', 'Project Manager'];

export type ApprovalData = {
  chips: string[];
  waiting: string;
  /** Sari: profile filled in, waiting for Approve / Reject. */
  pending: PendingUser;
  /** Budi: the Admin is writing a reason to reject him. */
  rejecting: PendingUser;
  reasonDraft: string;
};

export type RoleRow = { person: PersonInfo; you: boolean };

export type RolesData = { chips: string[]; count: string; people: RoleRow[] };

const C = USER_COUNTS;

/** Users ① Approval. */
export function getApproval(): ApprovalData {
  const [pending, rejecting] = PENDING_USERS;
  if (!pending || !rejecting)
    throw new Error('Users sample needs a pending and a rejecting sign-up');
  return {
    chips: [
      `Pending ${C.pending}`,
      `Approved ${C.approved}`,
      `Rejected ${C.rejected}`,
      `Deactivated ${C.disabled}`,
    ],
    waiting: `${C.pending} waiting`,
    pending,
    rejecting,
    reasonDraft: REJECT_REASON_DRAFT,
  };
}

/** Users ② Roles: every approved account; the signed-in Admin's own row is read-only. */
export function getRoles(): RolesData {
  const mine = me('admin').key;
  return {
    chips: [`Approved ${C.approved}`, `Deactivated ${C.disabled}`],
    count: `${C.approved} users`,
    people: APPROVED_USERS.map((key) => {
      const p = person(key);
      if (!p) throw new Error(`Approved user ${key} is not a sample person`);
      return { person: p, you: key === mine };
    }),
  };
}

/** Both tabs, for whichever the screen shows. */
export const getUsers = (tab: UsersTab) => (tab === 'approval' ? getApproval() : getRoles());
