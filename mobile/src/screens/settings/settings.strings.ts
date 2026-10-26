// Copy of the Settings screens, verbatim from the prototype (settings.main.jsx, settings.profile.jsx, settings.leave.jsx).
// The leave copy per role lives with its data (LEAVE in src/data/settings.ts), which the Create sheet also reads.

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
  availability: 'Availability',
  leave: 'Leave',
  leaveHint: 'Not on leave. Teammates see you as Available.',
  signOut: 'Sign out',
} as const;

export const TEAM_SETTINGS = {
  label: 'Team settings (Admin only)',
  ai: 'AI features',
  aiHint: 'Voice recording, note photos, and picking meeting outcomes',
  retention: 'Recording retention',
  retentionHint: 'Raw recordings are deleted automatically after meeting outcomes are confirmed',
  retentionOptions: ['7 days', '30 days', '90 days'],
  reminder: 'Default event reminder',
  reminderHint: 'Used for new events unless the creator changes it',
  reminderOptions: ['30 min', '1 day', '1 day & 30 min'],
  leaveApproval: 'Leave needs approval',
  leaveApprovalHint:
    'Leave requests must be approved by the project Manager or Admin first. If off, leave applies immediately.',
  roles: 'Roles and permissions',
  rolesHint: 'See who can do what (read-only)',
  // The prototype draws "View" with a chevron icon; the name says what it opens.
  rolesView: 'View',
  rolesViewLabel: 'View roles and permissions',
  rolesNotice: 'Roles and permissions — not in the prototype yet',
} as const;

export const PROFILE_EDIT = {
  title: 'Edit profile',
  changePhoto: 'Change photo',
  changePhotoNotice: 'Change photo — not in the prototype yet',
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

export const LEAVE_SHEET = {
  from: 'From date',
  to: 'To date',
  note: 'Note (optional)',
  cancel: 'Cancel',
} as const;
