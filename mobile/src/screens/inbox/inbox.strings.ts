// Copy of the Inbox screens, verbatim from the prototype (inbox.parts.jsx, inbox.respond.jsx, inbox.updates.jsx).

export const INBOX = {
  title: 'Inbox',
  respondTab: (n: number) => `Needs your response (${n})`,
  updatesTab: 'Latest updates',
  // Not in the prototype: the tab row's own name for screen readers.
  tabs: 'Inbox sections',
  ai: 'AI-assisted',
} as const;

export const INBOX_EMPTY = {
  title: 'All caught up',
  text: 'Nothing needs your response right now.',
  action: 'View latest updates',
} as const;

export const UPDATES = {
  markAll: 'Mark all as read',
  marked: 'All marked as read',
  // Not in the prototype, whose link stays active: why it is off once nothing is unread (UX §5).
  allRead: 'Everything here is read',
  view: 'View',
  unread: 'Unread',
} as const;
