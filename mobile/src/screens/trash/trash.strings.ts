// Copy of the Trash screens (prototype archive.list.jsx / archive.delete.jsx, renamed: the server keeps deleted items
// for a while, then deletes them for good — map `phase2-map-profile-archive.md` GAP A-1).

export const TRASH = {
  title: 'Trash',
  intro:
    'Deleted projects, tasks and events wait here for a while. Restore them before their time runs out.',
  filter: 'Kind of deleted item',
  restore: 'Restore',
  deleteForever: 'Delete forever',
  noKind: 'No deleted items of this kind.',
  loadMore: 'Load more',
} as const;

export const TRASH_EMPTY = {
  icon: 'Empty trash',
  title: 'Trash is empty',
  text: 'What you delete shows up here for a while, so you can bring it back.',
} as const;

export const DELETE_FOREVER = {
  title: 'Delete forever?',
  cancel: 'Cancel',
  action: 'Delete forever',
  done: 'Deleted forever',
  missing: 'This item is no longer in the Trash.',
} as const;
