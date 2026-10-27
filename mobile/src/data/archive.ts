// Archive for the screens: the server's Trash, mapped. The kind chips come from the server's
// `counts`, the filter is its `?kind`, and both dates on a card — when it was deleted and how long
// it can still be restored — are the server's own (`server/trash/trash.item.ts`).

import {
  type CapValue,
  purgeTrashItem,
  restoreTrashItem,
  type TrashCountsWire,
  type TrashFilter,
  type TrashItemWire,
  type TrashKind,
  trashList,
} from './archive.api';
import { monthDay } from './dates';
import { instantDate } from './instant';
import type { Slices } from './offset-pages';

export type { TrashFilter, TrashKind } from './archive.api';

/** Chip filter: everything, or one kind. */
export const ARCHIVE_FILTERS: readonly (readonly [TrashFilter, string])[] = [
  ['all', 'All'],
  ['project', 'Projects'],
  ['task', 'Tasks'],
  ['event', 'Events'],
];

const KIND_NAME: Record<TrashKind, string> = {
  project: 'Project',
  task: 'Task',
  event: 'Event',
};

/**
 * Deny codes a Trash capability can carry, with the server's own reason for each
 * (`server/access/decision.ts`). Only the codes marked `ui: 'disable'` are here: every other one
 * the policy returns is `ui: 'hide'`, which the server turns into an absent key before it leaves,
 * so an unknown code hides the control exactly as the server would. The sentences are Indonesian
 * and shown as they came (K5) — writing English copies of them would be a second source.
 */
export const TRASH_DENY_MESSAGES: Record<string, string> = {
  IMPERSONATING:
    'Aksi ini dinonaktifkan selama kamu menyamar sebagai pengguna lain. Akhiri penyamaran dulu.',
  PROJECT_IN_TRASH: 'Proyeknya ada di Sampah. Pulihkan proyeknya dulu.',
  EXPIRED: 'Masa pemulihannya sudah lewat, jadi data ini tidak bisa dipulihkan lagi.',
};

/** How a control backed by a capability is drawn. */
export type CapState = 'hidden' | 'enabled' | 'disabled';

/** The state of one capability value. An unrecognised code hides the control, as the server does. */
export function capState(cap: CapValue | undefined): CapState {
  if (cap === undefined) return 'hidden';
  if (cap === true) return 'enabled';
  return TRASH_DENY_MESSAGES[cap] ? 'disabled' : 'hidden';
}

/** The reason a capability is disabled, or null when it is enabled or hidden. */
export const capReason = (cap: CapValue | undefined): string | null =>
  typeof cap === 'string' ? (TRASH_DENY_MESSAGES[cap] ?? null) : null;

export type ArchiveCard = {
  /** Route-safe and unique: `<kind>-<id>`, the param of the Delete forever sheet. */
  key: string;
  kind: TrashKind;
  /** "PROJECT" over the title. */
  kindLabel: string;
  title: string;
  /** "Atlas · Deleted by Nico · Oct 6". */
  meta: string;
  /** What an archived project takes along ("8 tasks and 2 events"). */
  includes?: string;
  /** "12 days left to restore", or that the window has closed. */
  retention: string;
  restore: CapState;
  restoreReason: string | null;
  purge: CapState;
  purgeReason: string | null;
  /** The trashed project this row waits for, when the server named one. */
  blocked?: string;
};

export type ArchiveData = {
  /** "All 5", "Projects 2"…, in ARCHIVE_FILTERS order, from the server's `counts`. */
  chips: string[];
  /** "5 items" for the filter shown. */
  count: string;
  cards: ArchiveCard[];
  /** How many rows match the filter on the server. */
  total: number;
  /** There are matching rows this app has not asked for yet. */
  hasMore: boolean;
};

const titleOf = (item: TrashItemWire): string => {
  if (item.kind === 'project') return item.name;
  if (item.kind === 'task') return `#${item.number} ${item.title}`;
  return item.title;
};

/** The project a row belonged to; a project belonged to none, and a personal event to none either. */
const whereOf = (item: TrashItemWire): string => {
  if (item.kind === 'project') return KIND_NAME.project;
  return item.project?.name ?? 'No project';
};

/** "12 days left to restore" — the server counted the days, in the team's zone. */
export function retentionText(daysLeft: number, restorableUntil: string): string {
  if (daysLeft <= 0) return 'The restore window has passed; this is deleted automatically soon.';
  const until = monthDay(restorableUntil);
  return daysLeft === 1
    ? `1 day left to restore (until ${until})`
    : `${daysLeft} days left to restore (until ${until})`;
}

/** The key of a card, and the kind and id it is made of. */
export const cardKey = (kind: TrashKind, id: string): string => `${kind}-${id}`;

/** `cardKey` read back; null when the key names no kind this app knows. */
export function parseCardKey(key: string): { kind: TrashKind; id: string } | null {
  const cut = key.indexOf('-');
  if (cut <= 0) return null;
  const kind = key.slice(0, cut);
  const id = key.slice(cut + 1);
  if (!id) return null;
  return kind === 'project' || kind === 'task' || kind === 'event' ? { kind, id } : null;
}

/** One Trash row as a card. */
export function archiveCard(item: TrashItemWire): ArchiveCard {
  const by = item.deletedBy ? `Deleted by ${item.deletedBy.name}` : 'Deleted';
  // `deletedAt` is an instant, so it becomes a day in the team's zone first (K2): read as UTC, an
  // early-morning delete would be dated to the day before.
  const when = monthDay(instantDate(item.deletedAt));
  const blocked =
    (item.kind === 'task' || item.kind === 'event') && item.blockedBy
      ? item.blockedBy.visible
        ? `Waiting for the project "${item.blockedBy.name}" to be restored first.`
        : 'Waiting for its project to be restored first.'
      : undefined;
  return {
    key: cardKey(item.kind, item.id),
    kind: item.kind,
    kindLabel: KIND_NAME[item.kind].toUpperCase(),
    title: titleOf(item),
    meta: `${whereOf(item)} · ${by} · ${when}`,
    includes:
      item.kind === 'project'
        ? `${item.cascade.tasks} tasks and ${item.cascade.events} events`
        : undefined,
    retention: retentionText(item.daysLeft, item.restorableUntil),
    restore: capState(item.can.restore),
    restoreReason: capReason(item.can.restore),
    purge: capState(item.can.purge),
    purgeReason: capReason(item.can.purge),
    blocked,
  };
}

/** The chip labels, from the server's per-kind counts (which do not follow the filter). */
export const chipLabels = (counts: TrashCountsWire): string[] =>
  ARCHIVE_FILTERS.map(([kind, label]) => {
    const n = kind === 'all' ? counts.project + counts.task + counts.event : counts[kind];
    return `${label} ${n}`;
  });

/** Archive ① from the store, narrowed to `filter`: null until the list has answered. */
export function getArchive(filter: TrashFilter = 'all'): ArchiveData | null {
  return archiveOf(trashList(filter).current());
}

/** The mapping on its own, so a test can hand it a page without a store. */
export function archiveOf(data: Slices<TrashItemWire, TrashCountsWire> | null): ArchiveData | null {
  if (!data) return null;
  return {
    chips: chipLabels(data.extra),
    count: data.total === 1 ? '1 item' : `${data.total} items`,
    cards: data.rows.map(archiveCard),
    total: data.total,
    hasMore: data.rows.length < data.total,
  };
}

export type ArchiveDeleteData = {
  kind: string;
  title: string;
  sub: string;
  message: string;
  /** False when the server did not give this caller `can.purge`; the sheet then offers nothing. */
  allowed: boolean;
  /** The reason it is refused, when the server gave one. */
  reason: string | null;
};

/**
 * Archive ④ Delete forever? for card `key`; null when the row is in no loaded Trash list — it was
 * restored or purged while the sheet was open, or the list was never loaded.
 */
export function getArchiveDelete(key: string): ArchiveDeleteData | null {
  const parsed = parseCardKey(key);
  if (!parsed) return null;
  const item = findLoaded(parsed.kind, parsed.id);
  if (!item) return null;
  const card = archiveCard(item);
  const kind = KIND_NAME[item.kind];
  const withWhat = card.includes ? ` with ${card.includes}` : '';
  return {
    kind,
    title: card.title,
    sub: `${kind} · ${card.title}`,
    message: `${kind} “${card.title}”${withWhat} will be gone for good. This cannot be undone.`,
    allowed: card.purge === 'enabled',
    reason: card.purgeReason,
  };
}

/** The row in whichever Trash list holds it; the sheet is opened from a loaded list. */
function findLoaded(kind: TrashKind, id: string): TrashItemWire | undefined {
  for (const filter of ['all', kind] as const) {
    const found = trashList(filter)
      .current()
      ?.rows.find((row) => row.kind === kind && row.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Restore the item card `key` names. Returns what came back, for the notice. */
export function restoreCard(key: string) {
  const parsed = parseCardKey(key);
  if (!parsed) throw new Error(`Cannot restore ${key}: it names no Trash item`);
  return restoreTrashItem(parsed.kind, parsed.id);
}

/** Delete the item card `key` names for good. */
export function deleteForever(key: string) {
  const parsed = parseCardKey(key);
  if (!parsed) throw new Error(`Cannot delete ${key} forever: it names no Trash item`);
  return purgeTrashItem(parsed.kind, parsed.id);
}
