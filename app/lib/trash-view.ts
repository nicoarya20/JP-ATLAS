/**
 * Pure view logic of the Trash page (wireframe "Sampah"): the tab labels with their counts, one
 * list out of the loaded pages, and the texts of one card. No React and no clock: every number
 * (days left, counts, cascade) is the server's, so the same input prints the same on server and client.
 */
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import type { TrashCounts, TrashItem, TrashTab } from './trash-api';

export const TRASH_TABS: readonly TrashTab[] = ['all', 'project', 'task', 'event'];

const TAB_NAME: Record<TrashTab, string> = {
  all: 'Semua',
  project: 'Proyek',
  task: 'Tugas',
  event: 'Event',
};

/** The chip on a card, by kind. */
export const KIND_CHIP: Record<TrashItem['kind'], string> = {
  project: 'Proyek',
  task: 'Tugas',
  event: 'Event',
};

/** How many items one tab holds: the sum of the kinds for `all`. */
export function tabCount(counts: TrashCounts, tab: TrashTab): number {
  return tab === 'all' ? counts.project + counts.task + counts.event : counts[tab];
}

/** The segments of the tab control: "Semua (5)", "Proyek (1)", "Tugas (3)", "Event (1)". */
export function tabOptions(counts: TrashCounts): { value: TrashTab; label: string }[] {
  return TRASH_TABS.map((value) => ({
    value,
    label: `${TAB_NAME[value]} (${tabCount(counts, value)})`,
  }));
}

/** Stable React key and highlight handle of an item: ids are unique per kind, not across kinds. */
export const itemKey = (item: Pick<TrashItem, 'kind' | 'id'>) => `${item.kind}:${item.id}`;

/**
 * One list out of the loaded pages, in the order the server sent them (newest delete first). A row
 * that moved to another page while the user was paging, or that two overlapping fetches both
 * returned, shows once.
 */
export function mergePages(pages: readonly { items: readonly TrashItem[] }[]): TrashItem[] {
  const seen = new Set<string>();
  const out: TrashItem[] = [];
  for (const page of pages) {
    for (const item of page.items) {
      const key = itemKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

const SHORT_DATE = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC', // the team-zone calendar day is already decided below; a zone here would move it
});

/** "6 Okt": the day of an instant in the team zone, without the year. */
export function formatShortDate(instant: string): string {
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return '—';
  return SHORT_DATE.format(new Date(`${isoDateIn(d, METRICS.TIME_ZONE)}T00:00:00Z`));
}

/** What a card shows, as plain text, so the wording is tested without rendering. */
export type TrashCardView = {
  key: string;
  kind: TrashItem['kind'];
  chip: string;
  title: string;
  /** "Proyek Atlas · Dihapus oleh Dodi · 5 Okt · Sisa 28 hari" */
  info: string;
  /** Set while the project is in the Trash: the id "Lihat proyeknya" points at, and whether the caller can find it. */
  blocked: { projectId: string; visible: boolean } | null;
  restoreLabel: string;
};

const TEXT = {
  noProject: 'Tanpa proyek',
  inTrash: '(ada di Sampah)',
  deletedBy: (name: string) => `Dihapus oleh ${name}`,
  deleterGone: 'Dihapus oleh akun yang sudah tidak ada',
  daysLeft: (n: number) => `Sisa ${n} hari`,
  cascade: (tasks: number, events: number) => `Termasuk ${tasks} tugas dan ${events} event`,
  project: (name: string) => `Proyek ${name}`,
  restore: (what: string) => `Pulihkan ${what}`,
};

function projectPart(item: TrashItem): string | null {
  if (item.kind === 'project') return null;
  if (!item.project) return TEXT.noProject;
  return `${TEXT.project(item.project.name)}${item.projectInTrash ? ` ${TEXT.inTrash}` : ''}`;
}

/** Title, info line and restore label of one item, in the wireframe's wording. */
export function describeItem(item: TrashItem): TrashCardView {
  const title = item.kind === 'task' ? `#${item.number} ${item.title}` : titleOf(item);
  const cascade =
    item.kind === 'project' && item.cascade.tasks + item.cascade.events > 0
      ? TEXT.cascade(item.cascade.tasks, item.cascade.events)
      : null;
  const info = [
    projectPart(item),
    item.deletedBy ? TEXT.deletedBy(item.deletedBy.name) : TEXT.deleterGone,
    formatShortDate(item.deletedAt),
    TEXT.daysLeft(item.daysLeft),
    cascade,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
  return {
    key: itemKey(item),
    kind: item.kind,
    chip: KIND_CHIP[item.kind],
    title,
    info,
    blocked:
      item.kind !== 'project' && item.blockedBy
        ? { projectId: item.blockedBy.projectId, visible: item.blockedBy.visible }
        : null,
    restoreLabel: TEXT.restore(`${KIND_CHIP[item.kind].toLowerCase()} ${title}`),
  };
}

function titleOf(item: Exclude<TrashItem, { kind: 'task' }>): string {
  return item.kind === 'project' ? item.name : item.title;
}
