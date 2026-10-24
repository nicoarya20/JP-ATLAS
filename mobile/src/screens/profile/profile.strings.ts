// Copy of the Profile screens, verbatim from the prototype (profile.main.jsx, profile.note.jsx, profile.calendar.jsx);
// the clipboard messages follow docs/phase1-screens.more.md §8.

export const PROFILE = {
  online: 'Online',
  offline: 'Offline',
  editProfile: 'Edit profile',
  myTasks: 'My tasks',
  myCalendar: 'My calendar',
  inbox: 'Inbox',
  mute: 'Mute notifications',
  settings: 'Settings',
  help: 'Help & resources',
  helpNotice: 'Help & resources — not in the prototype yet',
  general: 'General info',
  showOnline: 'Show me as online',
  seenAs: (online: boolean) => `Teammates see you as ${online ? 'Online' : 'Offline'}`,
  email: 'Email',
  copyEmail: 'Copy email',
  copied: 'Email copied',
  copyFailed: (message: string) => `Could not copy the email: ${message}`,
  clipboardRefused: 'the clipboard refused it',
  signOut: 'Sign out',
} as const;

export const NOTE = {
  add: '+ Add a note',
  addLabel: 'Add a note',
  editLabel: (note: string) => `Note: ${note}. Edit note`,
  placeholder: "What's on your mind?",
  input: 'Note',
} as const;

export const CALENDAR = {
  title: 'My calendar',
  week: 'Week',
  previous: 'Previous week',
  next: 'Next week',
} as const;
