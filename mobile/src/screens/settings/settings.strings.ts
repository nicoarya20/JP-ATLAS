// Copy of the Settings screens, verbatim from the prototype (settings.main.jsx, settings.profile.jsx).

export const SETTINGS = {
  title: 'Settings',
  account: 'My account',
  editProfile: 'Edit profile',
  notifications: 'Notifications',
  reminders: 'Event reminders',
  remindersHint: '1 day and 30 minutes before the event starts',
  inboxUpdates: 'Inbox updates',
  inboxUpdatesHint: 'Comments, task changes, and event invites',
  notificationsNote:
    "Requests that need your response always appear in Inbox and can't be turned off.",
  signOut: 'Sign out',
  footer: (admin: boolean) =>
    `Project settings live inside each project.${admin ? ' Account roles are managed in Users (Admin).' : ''}`,
} as const;

export const PROFILE_EDIT = {
  title: 'Edit profile',
  full: 'Full name',
  // Not in the prototype, which saves a blank name: the same check as the sign-up screen.
  fullMissing: 'Enter your full name.',
  nickname: 'Nickname (for greetings)',
  job: 'Job title',
  division: 'Division',
  role: 'Role',
  roleHint: 'Your role is set by an Admin.',
  email: 'Email',
  emailHint: "Email comes from your Google account and can't be changed.",
  cancel: 'Cancel',
  save: 'Save',
  saved: 'Profile saved',
} as const;
