// Archive for the screens (prototype archive.list.jsx / archive.delete.jsx): the archived entries with their chips, and
// Delete forever, which drops the item from the module that holds it. Phase 2 reads and deletes through the API here.
import { type ArchiveEntry, type ArchiveKind, findEntry, removeEntry } from './archive.store';
import { monthDay } from './dates';
import { forgetArchivedEvent } from './events.store';
import { forgetArchivedProject } from './projects.store';
import type { Role } from './sample';
import { forgetArchivedTask } from './tasks.store';

/** Chip filter: everything, or one kind. */
export type ArchiveFilter = 'ALL' | ArchiveKind;

export const ARCHIVE_FILTERS: readonly (readonly [ArchiveFilter, string])[] = [
  ['ALL', 'All'],
  ['PROJECT', 'Projects'],
  ['TASK', 'Tasks'],
  ['EVENT', 'Events'],
];

const KIND_NAME: Record<ArchiveKind, string> = { PROJECT: 'Project', TASK: 'Task', EVENT: 'Event' };

export type ArchiveCard = {
  key: string;
  kind: ArchiveKind;
  title: string;
  /** "<where> · Archived by <by> · Oct 6". */
  meta: string;
  includes?: string;
};

export type ArchiveData = {
  /** "All 5", "Projects 2"…, in ARCHIVE_FILTERS order. */
  chips: string[];
  /** "5 items" for the shown filter. */
  count: string;
  cards: ArchiveCard[];
  /** Only an Admin deletes forever. */
  canDelete: boolean;
};

const card = (e: ArchiveEntry): ArchiveCard => ({
  key: e.key,
  kind: e.kind,
  title: e.title,
  meta: `${e.where} · Archived by ${e.by} · ${monthDay(e.date)}`,
  includes: e.includes,
});

/** Archive ① for `role`, narrowed to `filter`. */
export function getArchive(
  role: Role,
  entries: readonly ArchiveEntry[],
  filter: ArchiveFilter = 'ALL',
): ArchiveData {
  const shown = entries.filter((e) => filter === 'ALL' || e.kind === filter);
  return {
    chips: ARCHIVE_FILTERS.map(
      ([k, label]) =>
        `${label} ${k === 'ALL' ? entries.length : entries.filter((e) => e.kind === k).length}`,
    ),
    count: `${shown.length} items`,
    cards: shown.map(card),
    canDelete: role === 'admin',
  };
}

export type ArchiveDeleteData = { kind: string; title: string; sub: string; message: string };

/** Archive ④ Delete forever? for entry `key`; null when it is no longer in Archive. */
export function getArchiveDelete(key: string): ArchiveDeleteData | null {
  const e = findEntry(key);
  if (!e) return null;
  const kind = KIND_NAME[e.kind];
  const withWhat = e.includes ? ` with ${e.includes}` : '';
  return {
    kind,
    title: e.title,
    sub: `${kind} · ${e.title}`,
    message: `${kind} “${e.title}”${withWhat} will be gone for good. This cannot be undone.`,
  };
}

/** Delete entry `key` forever: the module holding the item forgets it, then the entry leaves Archive. */
export function deleteForever(key: string): void {
  const e = findEntry(key);
  if (!e) throw new Error(`Cannot delete ${key} forever: it is not in Archive`);
  if (e.kind === 'TASK') forgetArchivedTask(key);
  if (e.kind === 'EVENT') forgetArchivedEvent(key);
  if (e.kind === 'PROJECT') forgetArchivedProject(key);
  removeEntry(key);
}
