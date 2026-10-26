// Copy of the Inbox screens. Mobile's own words are English (K5); the sentence and the button copy of
// a card come from the server in Indonesian and are rendered as they came, never translated here.
import type { UpdateGroupKey } from '@/data/inbox';

export const INBOX = {
  title: 'Inbox',
  respondTab: (n: number) => `Needs your response (${n})`,
  updatesTab: 'Latest updates',
  // Not in the prototype: the tab row's own name for screen readers.
  tabs: 'Inbox sections',
  /** A card nobody is behind: a reminder or a change the system made. */
  system: 'From Simple PM',
  /** Only the first page of a lane is loaded in this wave, so the list says so instead of ending silently. */
  moreRespond: 'Only the newest cards are loaded.',
  moreUpdates: 'Only the newest updates are loaded.',
} as const;

export const INBOX_EMPTY = {
  title: 'All caught up',
  text: 'Nothing needs your response right now.',
  action: 'View latest updates',
} as const;

/** Day headings of "Latest updates"; the bucket itself is the server's (K2). */
export const UPDATE_DAY: Record<UpdateGroupKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  older: 'Older',
};

export const UPDATES = {
  empty: 'No updates yet',
  emptyText: 'News about your projects shows up here.',
  markAll: 'Mark all as read',
  marked: 'All marked as read',
  markFailed: 'Could not mark them read. Try again.',
  readFailed: 'Could not mark it read. Try again.',
  // Not in the prototype, whose link stays active: why it is off once nothing is unread (UX §5).
  allRead: 'Everything here is read',
  view: 'View',
  unread: 'Unread',
} as const;
