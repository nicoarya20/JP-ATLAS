// Copy of the Profile screens, verbatim from the prototype (profile.main.jsx, profile.calendar.jsx);
// the clipboard messages follow docs/phase1-screens.more.md §8.

export const PROFILE = {
  editProfile: 'Edit profile',
  myTasks: 'My tasks',
  myCalendar: 'My calendar',
  inbox: 'Inbox',
  settings: 'Settings',
  help: 'Help & resources',
  helpNotice: 'Help & resources — not in the prototype yet',
  general: 'General info',
  email: 'Email',
  copyEmail: 'Copy email',
  copied: 'Email copied',
  copyFailed: (message: string) => `Could not copy the email: ${message}`,
  clipboardRefused: 'the clipboard refused it',
  signOut: 'Sign out',
} as const;

export const CALENDAR = {
  title: 'My calendar',
  previous: 'Previous week',
  next: 'Next week',
} as const;
