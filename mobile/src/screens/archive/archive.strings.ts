// Copy of the Archive screens, verbatim from the prototype (archive.list.jsx, archive.delete.jsx).

export const ARCHIVE = {
  title: 'Archive',
  intro: 'Archived items stay here until someone restores them.',
  filter: 'Archived item kind',
  includes: (what: string) => `Includes ${what}`,
  restore: 'Restore',
  restored: 'Restored',
  deleteForever: 'Delete forever',
  noKind: 'No archived items of this kind.',
} as const;

export const ARCHIVE_EMPTY = {
  icon: 'Empty archive',
  title: 'Archive is empty',
  text: 'What you archive shows up here.',
} as const;

export const DELETE_FOREVER = {
  title: 'Delete forever?',
  note: 'Only an Admin can delete forever. Others can only restore.',
  cancel: 'Cancel',
  action: 'Delete forever',
  done: 'Deleted forever',
  missing: 'This item is no longer in Archive.',
  failed: (message: string) => `Could not delete forever: ${message}`,
} as const;
