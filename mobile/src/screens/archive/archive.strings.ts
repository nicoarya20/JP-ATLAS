// Copy of the Archive screens. The prototype's line "Archived items stay here until someone
// restores them" is gone: the server keeps them for a retention window and then deletes them on a
// schedule, so every card says how long it has left (`server/trash/trash.item.ts`).

export const ARCHIVE = {
  title: 'Archive',
  intro: 'Deleted projects, tasks and events wait here, then go for good on their own.',
  filter: 'Archived item kind',
  includes: (what: string) => `Includes ${what}`,
  restore: 'Restore',
  restored: 'Restored',
  restoredProject: (tasks: number) => `Project restored with ${tasks} tasks`,
  restoredTask: (number: number) => `Task #${number} restored`,
  restoreFailed: (message: string) => `Could not restore it: ${message}`,
  deleteForever: 'Delete forever',
  more: 'Load more',
  moreLabel: (shown: number, total: number) => `Load more, ${shown} of ${total} shown`,
  noKind: 'No archived items of this kind.',
} as const;

export const ARCHIVE_EMPTY = {
  icon: 'Empty archive',
  title: 'Archive is empty',
  text: 'What you delete shows up here, and can be restored for a while.',
} as const;

export const DELETE_FOREVER = {
  title: 'Delete forever?',
  cancel: 'Cancel',
  action: 'Delete forever',
  done: 'Deleted forever',
  missing: 'This item is no longer in Archive.',
  /** Only an Admin gets `can.purge`; for anybody else the control is not drawn at all. */
  refused: 'Only an Admin can delete forever. Others can only restore.',
  failed: (message: string) => `Could not delete forever: ${message}`,
} as const;
