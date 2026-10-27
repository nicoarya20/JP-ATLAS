/**
 * The server's snake_case enums as the English words this app's screens already showed, and the
 * query values the list sends back.
 *
 * This is the one place an enum becomes a word. Mapping an enum is not translating a sentence: the
 * server never sends "Active", it sends `active`, and the word is this app's own copy — so K5 is
 * untouched. What the server *does* compose (a condition's `reason`, an activity `text`, the error
 * of a refused write) is shown as it came and appears nowhere in this file.
 *
 * Note `completed` ↔ **Done**: the screens have always said "Done" and the status pill is keyed on
 * that word (`src/components/status/status.ts`), so the word stays and only its source changes.
 */
import type {
  WireExtensionReason,
  WirePhaseStatus,
  WireProjectCondition,
  WireProjectMemberRole,
  WireProjectPriority,
  WireProjectSort,
  WireProjectStatus,
} from './projects.api.types';
import type { ProjectStatus } from './sample/projects';
import type { PhaseState, ProjectRole } from './sample/projects.extra';

/** Project priority as the Edit and New forms word it. */
export type ProjectPriorityWord = 'Low' | 'Medium' | 'High' | 'Critical';

const STATUS_WORD = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Done',
  canceled: 'Canceled',
} as const satisfies Record<WireProjectStatus, ProjectStatus>;

const STATUS_WIRE: Record<ProjectStatus, WireProjectStatus> = {
  Draft: 'draft',
  Active: 'active',
  'On hold': 'on_hold',
  Done: 'completed',
  Canceled: 'canceled',
};

const PRIORITY_WORD = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
} as const satisfies Record<WireProjectPriority, ProjectPriorityWord>;

const PRIORITY_WIRE: Record<ProjectPriorityWord, WireProjectPriority> = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
};

const PHASE_WORD = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
} as const satisfies Record<WirePhaseStatus, PhaseState>;

const PHASE_WIRE: Record<PhaseState, WirePhaseStatus> = {
  'Not started': 'not_started',
  'In progress': 'in_progress',
  Done: 'done',
};

const ROLE_WORD = {
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
} as const satisfies Record<WireProjectMemberRole, ProjectRole>;

const ROLE_WIRE: Record<ProjectRole, WireProjectMemberRole> = {
  Manager: 'manager',
  Member: 'member',
  Viewer: 'viewer',
};

/**
 * The health words of a project card. `at_risk` keeps the prototype's "! Needs attention" and
 * `off_track` its "Overdue", because those are the words the status pill is keyed on; they are two
 * levels the server tells apart, so the card does too.
 */
const CONDITION_WORD = {
  on_track: '✓ On track',
  at_risk: '! Needs attention',
  off_track: 'Overdue',
} as const satisfies Record<WireProjectCondition, string>;

/**
 * English labels for the four extension categories. The server's own labels exist only in
 * Indonesian and only inside a web component (`app/components/projects/summary/summary.copy.ts`),
 * which this app cannot import — so these are mobile's own words for four enum values, not a second
 * copy of a server sentence (GAP A-14).
 */
const EXTENSION_WORD = {
  scope_change: 'Scope increased',
  dependency: 'Waiting on third party',
  resource: 'Short-staffed',
  other: 'Other',
} as const satisfies Record<WireExtensionReason, string>;

/** The order the Extend sheet offers the four categories in. */
export const EXTENSION_REASONS: readonly WireExtensionReason[] = [
  'scope_change',
  'dependency',
  'resource',
  'other',
];

export const statusWord = (s: WireProjectStatus): ProjectStatus => STATUS_WORD[s];
export const statusWire = (s: ProjectStatus): WireProjectStatus => STATUS_WIRE[s];
export const priorityWord = (p: WireProjectPriority): ProjectPriorityWord => PRIORITY_WORD[p];
export const priorityWire = (p: ProjectPriorityWord): WireProjectPriority => PRIORITY_WIRE[p];
export const phaseWord = (s: WirePhaseStatus): PhaseState => PHASE_WORD[s];
export const phaseWire = (s: PhaseState): WirePhaseStatus => PHASE_WIRE[s];
export const roleWord = (r: WireProjectMemberRole): ProjectRole => ROLE_WORD[r];
export const roleWire = (r: ProjectRole): WireProjectMemberRole => ROLE_WIRE[r];
export const conditionWord = (c: WireProjectCondition): string => CONDITION_WORD[c];
export const extensionWord = (r: WireExtensionReason): string => EXTENSION_WORD[r];

/**
 * The sorts the list offers, and the `sort=` each one sends.
 *
 * "Lowest progress" is gone: progress is computed from tasks rather than stored, so the server has
 * no sort for it, and ordering the page this app happens to hold would order a slice and call it the
 * list (GAP A-4). "Recently updated" takes its place because `sort=recent` is real.
 */
export const SORTS = ['Nearest deadline', 'Name (A–Z)', 'Recently updated'] as const;
export type SortWord = (typeof SORTS)[number];

const SORT_WIRE: Record<SortWord, WireProjectSort> = {
  'Nearest deadline': 'due',
  'Name (A–Z)': 'name',
  'Recently updated': 'recent',
};

/** The `sort=` of the option at `index`; out of range falls back to the first, as the list does. */
export const sortWire = (index: number): WireProjectSort =>
  SORT_WIRE[SORTS[index] ?? SORTS[0]] ?? 'due';

/** The status filter options; index 0 ("All") sends no `status=` at all. */
export const STATUSES = ['All', 'Active', 'On hold', 'Done', 'Draft', 'Canceled'] as const;

/** The `status=` of the filter at `index`, or undefined for "All". */
export function statusFilter(index: number): WireProjectStatus | undefined {
  const word = STATUSES[index];
  return index && word && word !== 'All' ? statusWire(word as ProjectStatus) : undefined;
}
