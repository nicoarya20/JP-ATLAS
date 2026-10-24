// Copy of the Inbox screens, verbatim from the prototype (inbox.parts.jsx, inbox.respond.jsx, inbox.updates.jsx).

export const INBOX = {
  title: 'Inbox',
  respondTab: (n: number) => `Needs your response (${n})`,
  updatesTab: 'Latest updates',
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
  view: 'View',
  unread: 'Unread',
} as const;
