/**
 * The server's project rows as the list card and the detail header show them, and the one way this
 * module reads `can{}`.
 *
 * Two rules, both from the module's brief and both the opposite of what the prototype did:
 *
 * - **Permissions are the server's.** `can{}` has three states — `true` enabled, a deny code
 *   disabled, the key absent hidden — and `capState` is the only place that reads them. The old
 *   `canEdit = role !== 'member' && !archived` is gone, and so is every other role test this module
 *   used to make for itself.
 * - **Nothing is invented.** A field the server has no column for is left out and written down in
 *   `docs/phase2-gap-disembunyikan.md`: a list row carries no members, so the card shows no avatar
 *   stack and no "4 members" (GAP A-1).
 *
 * Dates here are date strings and belong to the date helpers (K2); the instants a project carries
 * (`reachedAt`, `joinedAt`, `createdAt`) are read through `instant.ts` in `projects.api.detail.ts`.
 */
import { monthDay } from './dates';
import type {
  WireProjectCapKey,
  WireProjectCaps,
  WireProjectDetail,
  WireProjectListItem,
} from './projects.api.types';
import { conditionWord, statusWord } from './projects.api.values';
import { longDate } from './projects.dates';
import type { ProjectStatus } from './sample/projects';

/** What the server allows for one control: shown enabled, shown disabled, or not shown at all. */
export type CapState = 'on' | 'off' | 'hidden';

/**
 * How a control named by a `can{}` key must be drawn. The three states are the server's
 * (`server/access/capabilities.ts`); this app adds nothing, and in particular does not read a
 * missing key as "disabled", which would show a control the server wanted hidden.
 */
export function capState(can: WireProjectCaps | undefined, key: WireProjectCapKey): CapState {
  const value = can?.[key];
  if (value === undefined) return 'hidden';
  return value === true ? 'on' : 'off';
}

/** Whether a control is both shown and usable. */
export const capOn = (can: WireProjectCaps | undefined, key: WireProjectCapKey): boolean =>
  capState(can, key) === 'on';

/** Whether a control is shown at all, enabled or not. */
export const capShown = (can: WireProjectCaps | undefined, key: WireProjectCapKey): boolean =>
  capState(can, key) !== 'hidden';

/**
 * Why a disabled control is disabled.
 *
 * The server decides *that* a control is off and keeps a sentence for it (`capMessage`), but `can{}`
 * carries only the code and the sentence is server-side code this app cannot import. An English
 * sentence per code here would be a second source for the same message, which K5 forbids, so one
 * honest line of this app's own stands for all of them. The Tasks module reached the same answer
 * for the same reason; both are listed as gap G1-T2.
 */
export const CAP_DISABLED_REASON = 'Not available for this project.';

/** The deny code the server sends for a project sitting in the Trash. */
const IN_TRASH = 'PROJECT_IN_TRASH';

/**
 * Whether the project is in the Trash. There is no field for it: a trashed project is still
 * readable, and what says so is `can.update` coming back as `PROJECT_IN_TRASH` (GAP A-15). Reading
 * it from the deny code rather than from a flag of our own keeps one source for the fact.
 */
export const inTrash = (can: WireProjectCaps | undefined): boolean => can?.update === IN_TRASH;

const NO_LEAD = 'No lead yet';
const NO_DUE = 'No deadline';

/** The lead's display name, or the honest absence of one (the FK is SET NULL when an account goes). */
export const leadName = (item: Pick<WireProjectListItem, 'lead'>): string =>
  item.lead?.name ?? NO_LEAD;

/**
 * The health line of a card or header: the server's condition and its own sentence, or — when there
 * is no condition — what the project's state says instead (GAP A-5).
 *
 * The server sends a condition only for an `active` project, so the other cases have to be named
 * here. They are read off fields the server does send (`status`, `progress.total`), never computed
 * from a rule of this app's own: the condition itself is the server's arithmetic and is never
 * recomputed here.
 */
export function healthOf(item: WireProjectListItem): { health: string; why: string } {
  const status = statusWord(item.status);
  if (item.status === 'completed') return { health: '✓ Done', why: '' };
  if (item.progress.total === 0 && !item.condition) return { health: 'No tasks yet', why: '' };
  if (!item.condition) return { health: status, why: '' };
  // The reason is the server's Indonesian sentence, shown as it came (K5).
  return { health: conditionWord(item.condition.level), why: item.condition.reason ?? '' };
}

/** "70%", or "–" for a project with no tasks yet (`percent` is null, which is not 0 %). */
export const percentLabel = (percent: number | null): string =>
  percent === null ? '–' : `${percent}%`;

/** A project card of the list. */
export type ProjectCard = {
  id: string;
  name: string;
  status: ProjectStatus;
  /** The lead's display name, or "No lead yet". */
  lead: string;
  /** 0–100 for the bar; a project with no tasks draws an empty one. */
  progress: number;
  /** "! Needs attention · 1 tugas penting terlambat", or the health alone. */
  health: string;
  /** "70%", or "–". */
  percent: string;
  /** "Oct 31", or "No deadline". */
  due: string;
};

/** One list row as a card. */
export function cardOf(item: WireProjectListItem): ProjectCard {
  const { health, why } = healthOf(item);
  return {
    id: item.id,
    name: item.name,
    status: statusWord(item.status),
    lead: leadName(item),
    progress: item.progress.percent ?? 0,
    health: why ? `${health} · ${why}` : health,
    percent: percentLabel(item.progress.percent),
    due: item.dueDate ? monthDay(item.dueDate) : NO_DUE,
  };
}

/** Header of the detail, the same on every tab. */
export type ProjectHeader = {
  id: string;
  name: string;
  status: ProjectStatus;
  health: string;
  why: string;
  lead: string;
  /** "Extended ×2", or '' when the deadline was never moved. */
  extended: string;
  /** "Oct 31, 2026", or "No deadline". */
  dueLong: string;
  /** The project is in the Trash: the note at the top, and no write anywhere. */
  archived: boolean;
  /** How many tasks a delete would take along (`taskCounts.live`). */
  liveTasks: number;
  /** The server's capabilities; the only thing a control in this module may branch on. */
  can: WireProjectCaps;
};

/** One project detail as the header. */
export function headerOf(detail: WireProjectDetail): ProjectHeader {
  const { health, why } = healthOf(detail);
  return {
    id: detail.id,
    name: detail.name,
    status: statusWord(detail.status),
    health,
    why,
    lead: leadName(detail),
    extended: detail.extensionCount > 0 ? `Extended ×${detail.extensionCount}` : '',
    dueLong: detail.dueDate ? longDate(detail.dueDate) : NO_DUE,
    archived: inTrash(detail.can),
    liveTasks: detail.taskCounts.live,
    can: detail.can,
  };
}
