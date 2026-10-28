/**
 * Trash rows in the app's words (map `phase2-map-profile-archive.md` §4b): kind, title, where it was, who deleted it
 * and when (team zone), what a project takes along, how long it stays, and Restore / Delete forever as its `can{}`
 * allows. A deny code shows the control disabled with the reason; a missing key hides it.
 */
import { capReason } from './caps.messages';
import { monthDay } from './dates';
import { instantDate } from './instant';
import type { TrashCountsWire, TrashFilterWire, TrashItemWire, TrashKindWire } from './trash.wire';

export const TRASH_FILTERS: readonly (readonly [TrashFilterWire, string])[] = [
  ['all', 'All'],
  ['project', 'Projects'],
  ['task', 'Tasks'],
  ['event', 'Events'],
];

export const KIND_NAME: Record<TrashKindWire, string> = {
  project: 'Project',
  task: 'Task',
  event: 'Event',
};

const NO_PROJECT = 'No project';

/** A control on a card: shown when `on`, disabled with `why` when the server says no. */
export type TrashControl = { on: boolean; why: string | null };

export type TrashCard = {
  key: string;
  kind: string;
  title: string;
  /** "Atlas Project · Deleted by Nico Arya · Oct 6". */
  meta: string;
  /** "Includes 8 tasks and 2 events", projects only. */
  includes: string | null;
  /** "Deleted for good in 12 days". */
  left: string;
  /** "Restore “Atlas Project” first." while its project is in the Trash. */
  blocked: string | null;
  restore: TrashControl | null;
  purge: TrashControl | null;
};

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** "8 tasks and 2 events", "1 task", or null when nothing went along. */
export function cascadeText(c: { tasks: number; events: number }): string | null {
  const parts = [
    c.tasks ? plural(c.tasks, 'task') : null,
    c.events ? plural(c.events, 'event') : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' and ') : null;
}

export const titleOf = (i: TrashItemWire): string =>
  i.kind === 'project' ? i.name : i.kind === 'task' ? `#${i.number} ${i.title}` : i.title;

const whereOf = (i: TrashItemWire): string | null =>
  i.kind === 'project' ? null : (i.project?.name ?? NO_PROJECT);

/** "Deleted for good in 3 days", or that its time is over. */
export const leftText = (daysLeft: number): string =>
  daysLeft > 0 ? `Deleted for good in ${plural(daysLeft, 'day')}` : 'Its time in the Trash is over';

const control = (cap: TrashItemWire['can']['restore']): TrashControl | null =>
  cap === undefined ? null : { on: cap === true, why: capReason(cap) };

/** One row, keyed `key` ("task-<id>"). */
export function trashCard(i: TrashItemWire, key: string): TrashCard {
  const by = i.deletedBy ? `Deleted by ${i.deletedBy.name}` : 'Deleted';
  const meta = [whereOf(i), by, monthDay(instantDate(i.deletedAt))].filter(Boolean).join(' · ');
  const includes = i.kind === 'project' ? cascadeText(i.cascade) : null;
  const blockedBy = i.kind === 'project' ? null : i.blockedBy;
  return {
    key,
    kind: KIND_NAME[i.kind],
    title: titleOf(i),
    meta,
    includes: includes && `Includes ${includes}`,
    left: leftText(i.daysLeft),
    blocked: blockedBy && `Restore the project “${blockedBy.name}” first.`,
    restore: control(i.can.restore),
    purge: control(i.can.purge),
  };
}

/** "All 5", "Projects 2"…, in TRASH_FILTERS order; `counts` covers every kind whatever is shown. */
export const trashChips = (counts: TrashCountsWire): string[] =>
  TRASH_FILTERS.map(([k, label]) => {
    const n = k === 'all' ? counts.project + counts.task + counts.event : counts[k];
    return `${label} ${n}`;
  });

/** "5 items" for what is shown. */
export const itemsText = (total: number) => plural(total, 'item');

/** What Delete forever says will go. */
export function purgeMessage(i: TrashItemWire): string {
  const along = i.kind === 'project' ? cascadeText(i.cascade) : null;
  const withWhat = along ? ` with ${along}` : '';
  return `${KIND_NAME[i.kind]} “${titleOf(i)}”${withWhat} will be gone for good. This cannot be undone.`;
}

/** The notice after a restore: a project says how many tasks came back with it. */
export function restoredText(i: TrashItemWire, tasks?: number): string {
  if (i.kind === 'project' && tasks) return `Project restored with ${plural(tasks, 'task')}`;
  return `${KIND_NAME[i.kind]} restored`;
}
