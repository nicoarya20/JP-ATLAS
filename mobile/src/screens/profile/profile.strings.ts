// Copy of the Profile screens. The prototype's note bubble, presence dot and single mute switch are
// gone: the server keeps no note and no presence, and it keeps two notification switches rather
// than one — see mobile/docs/phase2-gap-disembunyikan.md.

export const PROFILE = {
  editProfile: 'Edit profile',
  myTasks: 'My tasks',
  myCalendar: 'My calendar',
  inbox: 'Inbox',
  notifications: 'Notifications',
  eventReminder: 'Event reminders',
  eventReminderSub: 'Before an event you are invited to starts',
  inboxNews: 'Inbox news',
  inboxNewsSub: 'Updates on your projects and tasks',
  alwaysOn: 'Cards that need your answer always arrive; only these two kinds can be turned off.',
  saveFailed: (message: string) => `Could not save that: ${message}`,
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
  truncated: 'This week has more events than were loaded; some may be missing.',
} as const;
