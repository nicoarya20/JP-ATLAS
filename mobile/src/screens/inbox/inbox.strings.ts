// Copy of the Inbox screens. The tab names and empty states are the prototype's (inbox.parts.jsx, inbox.respond.jsx,
// inbox.updates.jsx); what a card says is the server's sentence, shown as it came (K5).

export const INBOX = {
  title: 'Inbox',
  /** With the server's count; without a number while the count is not in, never a count of the cards on hand. */
  respondTab: (n: number | null) =>
    n === null ? 'Needs your response' : `Needs your response (${n})`,
  updatesTab: 'Latest updates',
  // Not in the prototype: the tab row's own name for screen readers.
  tabs: 'Inbox sections',
  system: 'Simple PM',
  loadMore: 'Load more',
  readFailed: (why: string) => `Could not mark it as read: ${why}`,
} as const;

export const INBOX_EMPTY = {
  title: 'All caught up',
  text: 'Nothing needs your response right now.',
  action: 'View latest updates',
} as const;

export const UPDATES_EMPTY = {
  title: 'No updates yet',
  text: 'News about your tasks, projects and events will show up here.',
} as const;

export const UPDATES = {
  markAll: 'Mark all as read',
  marked: (n: number) => (n === 1 ? '1 update marked as read' : `${n} updates marked as read`),
  // Not in the prototype, whose link stays active: why it is off once nothing is unread (UX §5).
  allRead: 'Everything here is read',
  markRead: 'Mark as read',
  unread: 'Unread',
} as const;
