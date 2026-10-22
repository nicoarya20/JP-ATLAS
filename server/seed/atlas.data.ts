/**
 * Atlas demo scenario as pure data (S0B-30): no database, no env, so tests, the dev seed script and
 * the factories all read one source. Dates are offsets in days from "today" (the reference day is
 * Wednesday 7 Oct 2026, X2 §2C), so a seed made on any day still looks like that Wednesday.
 * Every person is a labelled dummy; none of this is real data.
 */
import { METRICS } from '../metrics/config';
import { isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import type {
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
  TaskBaseKind,
  TaskStatus,
} from '../pm/enums';

/** The reference "today" of the scenario, as the calendar date the golden numbers are written for. */
export const ATLAS_REFERENCE_DATE: IsoDate = '2026-10-07';

const MS_PER_DAY = 86_400_000;

export type AtlasPersonKey = 'nico' | 'rina' | 'dodi' | 'sri' | 'admin';
export type AtlasProjectKey = 'atlas' | 'sinar';
export type AtlasTaskKey =
  | 'architecture'
  | 'fixSso'
  | 'specApi'
  | 'reviewDesign'
  | 'prepareTestData'
  | 'fixProfileSave'
  | 'sinarReport';

/** Account roles the scenario needs; a subset of `Role` that never includes `super-admin` (env-only). */
export type AtlasAccountRole = 'member' | 'project_manager' | 'admin';

export interface AtlasPerson {
  readonly key: AtlasPersonKey;
  readonly name: string;
  readonly role: AtlasAccountRole;
}

export interface AtlasProjectSpec {
  readonly key: AtlasProjectKey;
  readonly name: string;
  readonly description: string;
  readonly status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly lead: AtlasPersonKey;
  readonly startOffset: number;
  readonly dueOffset: number;
  /** Set only when the due date was extended once (Atlas: 15 Oct to 31 Oct). */
  readonly originalDueOffset?: number;
  readonly members: ReadonlyArray<readonly [AtlasPersonKey, ProjectMemberRole]>;
}

export interface AtlasTaskSpec {
  readonly key: AtlasTaskKey;
  readonly project: AtlasProjectKey;
  readonly title: string;
  readonly kind: TaskBaseKind;
  readonly status: TaskStatus;
  readonly priority: ProjectPriority;
  readonly assignee: AtlasPersonKey;
  readonly creator: AtlasPersonKey;
  readonly reviewer: AtlasPersonKey | null;
  readonly needsReview: boolean;
  readonly dueOffset: number;
  /** Days relative to today; negative means in the past. Only the timestamps the status implies are set. */
  readonly createdOffset: number;
  readonly startedOffset?: number;
  readonly reviewRequestedOffset?: number;
  readonly completedOffset?: number;
}

const DUMMY = '(contoh)';

export const ATLAS_PEOPLE: readonly AtlasPerson[] = [
  { key: 'nico', name: `Nico ${DUMMY}`, role: 'project_manager' },
  { key: 'rina', name: `Rina ${DUMMY}`, role: 'member' },
  { key: 'dodi', name: `Dodi ${DUMMY}`, role: 'member' },
  // Sri only watches Atlas; her account role is an assumption (R09 §2.3), a plain member.
  { key: 'sri', name: `Sri ${DUMMY}`, role: 'member' },
  // The source never names the admin, so the fixture calls them "Admin" (R09 §2.3).
  { key: 'admin', name: `Admin ${DUMMY}`, role: 'admin' },
];

export const ATLAS_PROJECTS: readonly AtlasProjectSpec[] = [
  {
    key: 'atlas',
    name: 'Proyek Atlas',
    description: 'Data contoh Simple PM: 1 Sep sampai 31 Okt, tenggat sudah diperpanjang sekali.',
    status: 'active',
    priority: 'high',
    lead: 'nico',
    startOffset: -36, // 1 Sep; 36 of 60 days have passed, which is the 60% elapsed time
    dueOffset: 24, // 31 Oct
    originalDueOffset: 8, // 15 Oct, before the scope grew
    members: [
      ['nico', 'manager'],
      ['dodi', 'member'],
      ['rina', 'member'],
      ['sri', 'viewer'],
    ],
  },
  {
    key: 'sinar',
    name: 'Portal Klien PT Sinar',
    description: 'Data contoh Simple PM: proyek kedua, pemilik tugas laporan progres.',
    status: 'active',
    priority: 'medium',
    lead: 'rina',
    startOffset: -16,
    dueOffset: 13, // 20 Oct
    members: [
      ['rina', 'manager'],
      ['nico', 'member'],
    ],
  },
];

// Counts the golden numbers depend on: Atlas has 6 non-canceled tasks (1 done), so progress is 1/6 = 17%,
// not the 70% the wireframe printed. The sixth Sinar task is not an Atlas task.
export const ATLAS_TASKS: readonly AtlasTaskSpec[] = [
  {
    key: 'architecture',
    project: 'atlas',
    title: 'Susun rancangan arsitektur',
    kind: 'task',
    status: 'done',
    priority: 'high',
    assignee: 'nico',
    creator: 'nico',
    reviewer: null,
    needsReview: false,
    dueOffset: -17, // 20 Sep
    createdOffset: -35,
    startedOffset: -34,
    completedOffset: -18,
  },
  {
    key: 'fixSso',
    project: 'atlas',
    title: 'Fix login SSO',
    kind: 'issue',
    status: 'in_progress',
    priority: 'high',
    assignee: 'nico',
    creator: 'rina',
    reviewer: 'admin', // the lead is the assignee and Atlas has one manager, so review falls to the admin
    needsReview: true,
    dueOffset: -2, // the one overdue task
    createdOffset: -4,
    startedOffset: -3,
  },
  {
    key: 'specApi',
    project: 'atlas',
    title: 'Tulis spesifikasi API',
    kind: 'task',
    status: 'todo',
    priority: 'medium',
    assignee: 'nico',
    creator: 'nico',
    reviewer: null,
    needsReview: false,
    dueOffset: 0, // due today: not overdue, `due_date < today` is strict
    createdOffset: -5,
  },
  {
    key: 'reviewDesign',
    project: 'atlas',
    title: 'Periksa desain halaman onboarding',
    kind: 'task',
    status: 'todo',
    priority: 'medium',
    assignee: 'nico',
    creator: 'rina',
    reviewer: null,
    needsReview: false,
    dueOffset: 2,
    createdOffset: -3,
  },
  {
    key: 'prepareTestData',
    project: 'atlas',
    title: 'Siapkan data uji',
    kind: 'task',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'dodi',
    creator: 'nico',
    reviewer: null,
    needsReview: false,
    dueOffset: 2,
    createdOffset: -3,
    startedOffset: -1,
  },
  {
    key: 'fixProfileSave',
    project: 'atlas',
    title: 'Perbaiki tombol simpan di halaman profil',
    kind: 'issue',
    status: 'in_review',
    priority: 'medium',
    assignee: 'dodi',
    creator: 'nico',
    reviewer: 'nico',
    needsReview: true,
    dueOffset: 1,
    createdOffset: -2,
    startedOffset: -2,
    reviewRequestedOffset: -1,
  },
  {
    key: 'sinarReport',
    project: 'sinar',
    title: 'Laporan progres untuk PT Sinar',
    kind: 'task',
    status: 'todo',
    priority: 'medium',
    assignee: 'nico',
    creator: 'rina',
    reviewer: null,
    needsReview: false,
    dueOffset: 1,
    createdOffset: -2,
  },
];

/** `date` shifted by `days` calendar days; UTC arithmetic, so month ends and leap years need no care. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}

/** The instant `days` days from `now`; the time of day of `now` is kept. */
export function shiftInstant(now: Date, days: number): Date {
  return new Date(now.getTime() + days * MS_PER_DAY);
}

export interface ResolvedProject
  extends Omit<AtlasProjectSpec, 'startOffset' | 'dueOffset' | 'originalDueOffset'> {
  readonly startDate: IsoDate;
  readonly dueDate: IsoDate;
  readonly originalDueDate: IsoDate | null;
}

export interface ResolvedTask
  extends Omit<
    AtlasTaskSpec,
    'dueOffset' | 'createdOffset' | 'startedOffset' | 'reviewRequestedOffset' | 'completedOffset'
  > {
  readonly dueDate: IsoDate;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly reviewRequestedAt: Date | null;
  readonly completedAt: Date | null;
  /** Last touch: the latest timestamp the status implies, so nothing in the scenario is stale. */
  readonly lastActivityAt: Date;
}

export interface ResolvedAtlas {
  readonly today: IsoDate;
  readonly people: readonly AtlasPerson[];
  readonly projects: readonly ResolvedProject[];
  readonly tasks: readonly ResolvedTask[];
}

/** Turns the offsets into concrete dates for `now`; "today" is the calendar day in the team zone. */
export function resolveAtlas(now: Date, tz: string = METRICS.TIME_ZONE): ResolvedAtlas {
  const today = isoDateIn(now, tz);
  const projects = ATLAS_PROJECTS.map(
    ({ startOffset, dueOffset, originalDueOffset, ...rest }): ResolvedProject => ({
      ...rest,
      startDate: addDays(today, startOffset),
      dueDate: addDays(today, dueOffset),
      originalDueDate: originalDueOffset === undefined ? null : addDays(today, originalDueOffset),
    }),
  );
  const at = (days: number | undefined) => (days === undefined ? null : shiftInstant(now, days));
  const tasks = ATLAS_TASKS.map(
    ({
      dueOffset,
      createdOffset,
      startedOffset,
      reviewRequestedOffset,
      completedOffset,
      ...rest
    }): ResolvedTask => {
      const stamps = [createdOffset, startedOffset, reviewRequestedOffset, completedOffset];
      const latest = Math.max(...stamps.filter((n): n is number => n !== undefined));
      return {
        ...rest,
        dueDate: addDays(today, dueOffset),
        createdAt: shiftInstant(now, createdOffset),
        startedAt: at(startedOffset),
        reviewRequestedAt: at(reviewRequestedOffset),
        completedAt: at(completedOffset),
        lastActivityAt: shiftInstant(now, latest),
      };
    },
  );
  return { today, people: ATLAS_PEOPLE, projects, tasks };
}
