// Copy of the sign-in screens, verbatim from the prototype (auth.login.jsx, auth.pending.jsx). "[App Name]" stays a
// placeholder, as in the prototype (docs/phase1-screens.more.md §2).

export const APP_NAME = '[App Name]';

export const BRAND = {
  logo: 'Logo',
  tagline: 'Manage team projects with ease',
  media: 'Illustration / image',
} as const;

export const SIGN_IN = {
  title: 'Sign in to your account',
  google: 'Sign in with Google',
  note: 'No account yet? Ask your admin for an invite.\nNew accounts need admin approval before they can be used.',
  footer: 'Help · Privacy Policy',
} as const;

/**
 * Email + password sign-in (Phase 2). The prototype shows only Google, which Expo Go cannot run
 * (see GoogleUnavailable in auth-parts.tsx), so this is what the screen actually signs in with.
 */
export const SIGN_IN_FORM = {
  email: 'Email',
  emailHint: 'The address an admin invited you with.',
  emailMissing: 'Enter your email address.',
  password: 'Password',
  passwordMissing: 'Enter your password.',
  submit: 'Sign in',
  retry: 'Try again',
  googleUnavailable:
    'Google sign-in needs a built app and does not work in Expo Go yet. Use your email and password.',
} as const;

/** The server could not be asked who is signed in (no network, or the wrong address). */
export const UNREACHABLE = {
  title: 'Cannot reach the server',
  retry: 'Try again',
} as const;

export const DENIED = {
  title: 'Access denied',
  reasonLabel: 'Reason from admin:',
  note: 'This account was rejected / deactivated by an admin. You can still sign in with another account.',
  noReason: 'No reason was given.',
  signOut: 'Sign out and use another account',
} as const;

export const PENDING = {
  signOut: 'Sign out',
  status: 'Your account is awaiting admin approval',
  pill: 'Pending',
  statusText: 'You can open Home once an admin approves you.',
  check: 'Check status',
  /** The status was read again and had not changed; said out loud so the tap is not silent. */
  stillPending: 'Still awaiting approval.',
  footer: 'No other menus until an admin approves your account.',
} as const;

/** Sign out confirmation (T2), the same on Settings, Profile and the pending screen. */
export const SIGN_OUT = {
  title: 'Sign out?',
  message: "You'll be signed out of this account.",
  confirm: 'Sign out',
  /** Our own line for a sign-out that never reached the server; its own message is shown instead. */
  failed: 'Could not sign out. Try again.',
} as const;
