// Users awaiting an Admin (prototype sample.js `users`): Sari filled in her profile, Budi is being rejected.
import type { PEOPLE } from './people';

export type PendingUser = {
  key: string;
  full: string;
  email: string;
  /** When the request came in. */
  day: string;
  time: string;
  job?: string;
  division?: string;
};

export const PENDING_USERS: readonly PendingUser[] = [
  {
    key: 'sari',
    full: 'Sari Wulandari',
    email: 'sari@email.com',
    day: 'Oct 7',
    time: '2:02 PM',
    job: 'Finance Staff',
    division: 'Finance',
  },
  { key: 'budi', full: 'Budi Santoso', email: 'budi@kantor.id', day: 'Today', time: '8:15 AM' },
];

/** The reason the Admin is writing for Budi in the sample. */
export const REJECT_REASON_DRAFT =
  'Please sign in with your office email (@kantor.id). This account is not on the employee list yet.';

/** Approved accounts in the Roles tab, in the prototype's order. */
export const APPROVED_USERS: readonly (keyof typeof PEOPLE)[] = [
  'ayu',
  'nico',
  'lea',
  'rina',
  'dodi',
  'sri',
];
