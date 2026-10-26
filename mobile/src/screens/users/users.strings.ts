// Copy of the Users screens (Admin), verbatim from the prototype (users.approve.jsx, users.roles.jsx, users.parts.jsx);
// the confirmation dialogs (docs/phase1-screens.more.md §5) and the buttons name the person and the role.

export const USERS = {
  title: 'Users',
  tabs: ['Approval', 'Roles'],
  // Not in the prototype: the tab row's own name for screen readers.
  tabsLabel: 'Users sections',
  search: 'Search name or email…',
  noMatch: 'No one matches this search.',
} as const;

export const APPROVAL = {
  intro: 'New users sign in with Google and wait for your decision. Only Admins can approve.',
  position: (job: string, division: string) => `Position: ${job} · Division: ${division}`,
  startingRole: 'Starting role',
  reject: 'Reject',
  reasonFirst: 'Write a reason first',
  approve: 'Approve',
  approved: (role: string) => `User approved as ${role}`,
  noProfile: 'Profile not filled in. Only name, email and photo from Google.',
  reason: 'Reason for rejecting (required)',
  reasonHint: 'The reason is shown to the user when they try to sign in.',
  cancel: 'Cancel',
  canceled: 'Rejection canceled',
  rejectUser: 'Reject user',
  rejected: 'User rejected',
  /** Buttons name the person, so a screen reader can tell the cards' buttons apart. */
  approveWho: (name: string) => `Approve ${name}`,
  rejectWho: (name: string) => `Reject ${name}`,
  cancelWho: (name: string) => `Cancel rejecting ${name}`,
  // Not in the prototype, which always shows its two sample sign-ups.
  empty: {
    title: 'No one is waiting for approval.',
    text: 'New sign-ins with Google show up here for an Admin to approve.',
  },
  infoTitle: 'After approval',
  info: [
    'Approved users become Members right away; their next sign-in goes straight to Home.',
    'The Project Manager role is given in the Roles tab.',
  ],
} as const;

export const ROLES = {
  intro: 'Give or remove the Project Manager role, or deactivate a user.',
  you: '(You)',
  active: 'Active',
  role: 'Account role',
  deactivate: 'Deactivate',
  deactivated: 'User deactivated',
  changed: (role: string) => `Role changed to ${role}`,
  infoTitle: 'Rules',
  info: [
    "The last Admin can't be demoted or deactivated.",
    'Role changes take effect at the next sign-in.',
    "Project Managers see all projects and edit only the projects they manage. A Member appointed as a project's Manager can still manage that project.",
  ],
} as const;

/** T2 dialogs: who it is about and the role it lands on. */
export const CONFIRM = {
  approve: (name: string, role: string) => ({
    title: `Approve ${name}?`,
    message: `${name} joins as ${role} and can sign in to Home.`,
    label: 'Approve',
  }),
  reject: (name: string, email: string) => ({
    title: `Reject ${name}?`,
    message: `${email} can't sign in. ${name} sees your reason.`,
    label: 'Reject user',
  }),
  role: (name: string, from: string, to: string) => ({
    title: `Change ${name}'s role?`,
    message: `${name} goes from ${from} to ${to}. Role changes take effect at the next sign-in.`,
    label: 'Change role',
  }),
  deactivate: (name: string, role: string) => ({
    title: `Deactivate ${name}?`,
    message: `${name} (${role}) can no longer sign in.`,
    label: 'Deactivate',
  }),
} as const;
