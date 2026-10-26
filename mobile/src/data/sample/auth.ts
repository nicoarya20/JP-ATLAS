// Sign-in sample of the prototype (auth.login.jsx, auth.pending.jsx): Budi signs up; his personal Gmail is rejected.

/** Where an account in the Google picker leads: the office one waits for approval, the Gmail one was rejected. */
export type AuthAccount = { email: string; to: 'pending' | 'denied' };

export const AUTH_NAME = 'Budi Santoso';

export const AUTH_ACCOUNTS: readonly AuthAccount[] = [
  { email: 'budi@kantor.id', to: 'pending' },
  { email: 'budi.santoso@gmail.com', to: 'denied' },
];

/** What the Admin wrote when rejecting the Gmail account. */
export const DENIED_REASON =
  'Please sign in with your office email (@kantor.id), not a personal Gmail account. — Ayu';

/** The profile form while awaiting approval: what Google filled in. */
export const PENDING_PROFILE = {
  full: 'Budi Santoso',
  email: 'budi@kantor.id',
  nickname: 'Budi',
} as const;
