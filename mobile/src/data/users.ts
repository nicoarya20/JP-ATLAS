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
import { createStore, useStore } from './store';

export type UsersTab = 'approval' | 'roles';

/** Roles an Admin can give in the Approval and Roles tabs. */
export const GRANTABLE_ROLES: readonly AccountRole[] = ['Member', 'Project Manager'];

/** A sign-up waiting for a decision; `draft` opens it in reject mode with that reason (Budi in the sample). */
export type ApprovalItem = PendingUser & { draft?: string };

export type ApprovalData = {
  chips: string[];
  waiting: string;
  /** Sign-ups no Admin has decided on yet, oldest first. */
  people: ApprovalItem[];
};

export type Decision = 'approved' | 'rejected';

export type RoleRow = { person: PersonInfo; you: boolean };

export type RolesData = { chips: string[]; count: string; people: RoleRow[] };

const C = USER_COUNTS;

/** Reasons the sample's Admin already started writing, by sign-up key (prototype: Budi is being rejected). */
const REJECT_DRAFTS: Readonly<Record<string, string>> = { budi: REJECT_REASON_DRAFT };

// Decisions taken this session, by sign-up key: once one Admin decides, the sign-up leaves the list for every Admin.
const decisions = createStore<Readonly<Record<string, Decision>>>({});

/** Approve or reject sign-up `key` (Phase 2: the API call). */
export function decide(key: string, decision: Decision) {
  if (!PENDING_USERS.some((u) => u.key === key))
    throw new Error(`Cannot decide on sign-up ${key}: it is not waiting for approval`);
  decisions.set((s) => ({ ...s, [key]: decision }));
}

/** The decisions in a component, so the Approval tab redraws when one is taken. */
export const useDecisions = () => useStore(decisions);

/** No decisions taken: the sample's two sign-ups wait again. test-only */
export const resetDecisions = () => decisions.reset();

/** Users ① Approval: who still waits, and the counts with this session's decisions added. */
export function getApproval(
  decided: Readonly<Record<string, Decision>> = decisions.get(),
): ApprovalData {
  const people = PENDING_USERS.filter((u) => !decided[u.key]).map((u) => {
    const draft = REJECT_DRAFTS[u.key];
    return draft === undefined ? u : { ...u, draft };
  });
  const taken = Object.values(decided);
  const count = (d: Decision) => taken.filter((t) => t === d).length;
  return {
    chips: [
      `Pending ${people.length}`,
      `Approved ${C.approved + count('approved')}`,
      `Rejected ${C.rejected + count('rejected')}`,
      `Deactivated ${C.disabled}`,
    ],
    waiting: `${people.length} waiting`,
    people,
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
