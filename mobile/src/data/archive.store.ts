// Archive shared by Tasks, Projects and Events (prototype D.archive): their stores add an entry when an item moves to
// Archive and remove it on Undo / Restore; the Archive screen lists the entries. Restoring the item itself stays with
// the module that owns it.
import { ARCHIVE } from './sample/archive';
import { createStore, useStore } from './store';

export type ArchiveKind = 'PROJECT' | 'TASK' | 'EVENT';

/** The archived item in its own module: task number, project id or event id. */
export type ArchiveRef = number | string;

export type ArchiveEntry = {
  /** Unique and URL-safe (`archive/[key]/delete`): `entryKey(kind, ref)` for items archived in the app. */
  key: string;
  kind: ArchiveKind;
  /** As listed: "#12 Fix SSO login", a project or an event name. */
  title: string;
  /** Project name, "Project" for a project, or "No project". */
  where: string;
  /** First name of who archived it. */
  by: string;
  /** ISO date it was archived. */
  date: string;
  /** What an archived project takes along ("8 tasks and 2 events"). */
  includes?: string;
  /** Source item; absent for the sample entries, which no list holds. */
  ref?: ArchiveRef;
};

/** Key of the entry for item `ref` of `kind` ("task-12", "project-atlas", "event-review"). */
export const entryKey = (kind: ArchiveKind, ref: ArchiveRef) => `${kind.toLowerCase()}-${ref}`;

const archive = createStore<readonly ArchiveEntry[]>(ARCHIVE);

/** List an archived item, newest first; its key comes from `kind` + `ref`. Returns the new entry. */
export function addEntry(
  entry: Omit<ArchiveEntry, 'key' | 'ref'> & { ref: ArchiveRef },
): ArchiveEntry {
  const key = entryKey(entry.kind, entry.ref);
  if (archive.get().some((e) => e.key === key)) {
    throw new Error(`Cannot archive ${key}: it is already in Archive`);
  }
  const added = { ...entry, key };
  archive.set((entries) => [added, ...entries]);
  return added;
}

/** Take the entry `key` out of Archive (Undo / Restore). Returns the removed entry. */
export function removeEntry(key: string): ArchiveEntry {
  const found = archive.get().find((e) => e.key === key);
  if (!found) throw new Error(`Cannot remove ${key} from Archive: no such entry`);
  archive.set((entries) => entries.filter((e) => e !== found));
  return found;
}

/** Every archived entry, newest first. */
export const listEntries = () => archive.get();

/** The entry `key`, if it is in Archive. */
export const findEntry = (key: string) => archive.get().find((e) => e.key === key);

/** Archive entries in a component, re-rendered when they change. */
export const useArchiveEntries = () => useStore(archive);

/** Back to the sample entries. test-only */
export const resetArchive = () => archive.reset();
