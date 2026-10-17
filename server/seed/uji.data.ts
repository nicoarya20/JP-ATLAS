/**
 * User-test scenario (UP-1, S2-15) as pure data: no database, no env. "Renovasi Dapur" with five dummy
 * testers who are approved members of the project, each with the tasks T1..T7 of the test script need
 * (P3 §6.3). Dates are offsets from "today" in the team zone, so a seed made on any day still has one
 * task due today. Every person is a labelled dummy (KEPUTUSAN-MVP-INTI §5); none of this is real data.
 */
import { METRICS } from '../metrics/config';
import { isoDateIn } from '../metrics/dates';
import type { IsoDate } from '../metrics/types';
import type { TaskStatus } from '../pm/enums';
import { addDays, shiftInstant } from './atlas.data';

/** Reserved `.invalid` TLD (RFC 2606): these addresses can never be a real mailbox. */
export const UJI_EMAIL_DOMAIN = 'uji.invalid';
export const UJI_TESTER_COUNT = 5;
export const UJI_PROJECT_NAME = 'Renovasi Dapur';
/** T4 asks the tester to create this task, so no seeded task may carry the title. */
export const UJI_T4_TITLE = 'Beli cat dapur';
/** Checklist of the T1 task: three steps, none ticked (T2 ticks one). */
export const UJI_T1_STEPS: readonly string[] = [
  'Ukur lebar lemari',
  'Catat hasilnya di buku',
  'Kirim fotonya ke grup',
];

export type UjiPersonKey = 'fasilitator' | `penguji${1 | 2 | 3 | 4 | 5}`;

export interface UjiPerson {
  readonly key: UjiPersonKey;
  readonly name: string;
  /** Local part of the address; the domain is `UJI_EMAIL_DOMAIN`. */
  readonly mailbox: string;
  readonly role: 'member' | 'project_manager';
}

// test-only: dummy people, never real names or mailboxes.
export const UJI_TESTERS: readonly UjiPerson[] = Array.from(
  { length: UJI_TESTER_COUNT },
  (_, i) => ({
    key: `penguji${i + 1}` as UjiPersonKey,
    name: `Penguji-${i + 1} (dummy)`,
    mailbox: `penguji-${i + 1}`,
    role: 'member' as const,
  }),
);

/** Manages the project so the testers stay plain Anggota (peran Anggota, Q5). */
export const UJI_FACILITATOR: UjiPerson = {
  key: 'fasilitator',
  name: 'Fasilitator (dummy)',
  mailbox: 'fasilitator',
  role: 'project_manager',
};

export interface UjiTaskSpec {
  readonly key: string;
  readonly title: string;
  readonly status: TaskStatus;
  readonly assignee: UjiPersonKey;
  readonly dueOffset: number;
  readonly createdOffset: number;
  readonly startedOffset?: number;
  readonly completedOffset?: number;
  readonly steps: readonly string[];
}

/** Team progress for T7 and tasks nobody on the test touches: 4 done, 2 in progress, 1 to do. */
const TEAM_TASKS: readonly UjiTaskSpec[] = [
  ['bongkar', 'Bongkar kabinet lama', 'done', -6, -7, -6, -4],
  ['ukur', 'Ukur ruang dapur', 'done', -5, -7, -6, -5],
  ['gambar', 'Gambar denah dapur baru', 'done', -3, -7, -5, -3],
  ['listrik', 'Pindahkan stopkontak', 'done', -2, -6, -4, -2],
  ['pipa', 'Pasang pipa air baru', 'in_progress', 2, -4, -2, undefined],
  ['kompor', 'Pilih kompor', 'in_progress', 4, -3, -1, undefined],
  ['lampu', 'Pesan lampu gantung', 'todo', 7, -2, undefined, undefined],
].map(([key, title, status, due, created, started, completed]) => ({
  key: key as string,
  title: title as string,
  status: status as TaskStatus,
  assignee: 'fasilitator' as const,
  dueOffset: due as number,
  createdOffset: created as number,
  startedOffset: started as number | undefined,
  completedOffset: completed as number | undefined,
  steps: [],
}));

/** One T1 task (due today, 3 steps) and one T6 task (to cancel) for every tester, so sessions never collide. */
const TESTER_TASKS: readonly UjiTaskSpec[] = UJI_TESTERS.flatMap((p, i) => [
  {
    key: `t1-${i + 1}`,
    title: 'Cek ukuran lemari dapur',
    status: 'todo' as const,
    assignee: p.key,
    dueOffset: 0,
    createdOffset: -1,
    steps: UJI_T1_STEPS,
  },
  {
    key: `t6-${i + 1}`,
    title: 'Pesan keramik lantai tambahan',
    status: 'todo' as const,
    assignee: p.key,
    dueOffset: 5,
    createdOffset: -1,
    steps: [],
  },
]);

export const UJI_TASKS: readonly UjiTaskSpec[] = [...TEAM_TASKS, ...TESTER_TASKS];

export interface ResolvedUjiTask extends UjiTaskSpec {
  readonly dueDate: IsoDate;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly lastActivityAt: Date;
}

export interface ResolvedUji {
  readonly today: IsoDate;
  readonly people: readonly UjiPerson[];
  readonly startDate: IsoDate;
  readonly dueDate: IsoDate;
  readonly tasks: readonly ResolvedUjiTask[];
}

/** Turns the offsets into concrete dates for `now`; "today" is the calendar day in the team zone. */
export function resolveUji(now: Date, tz: string = METRICS.TIME_ZONE): ResolvedUji {
  const today = isoDateIn(now, tz);
  const at = (days: number | undefined) => (days === undefined ? null : shiftInstant(now, days));
  const tasks = UJI_TASKS.map((t): ResolvedUjiTask => {
    const stamps = [t.createdOffset, t.startedOffset, t.completedOffset];
    const latest = Math.max(...stamps.filter((n): n is number => n !== undefined));
    return {
      ...t,
      dueDate: addDays(today, t.dueOffset),
      createdAt: shiftInstant(now, t.createdOffset),
      startedAt: at(t.startedOffset),
      completedAt: at(t.completedOffset),
      lastActivityAt: shiftInstant(now, latest),
    };
  });
  return {
    today,
    people: [UJI_FACILITATOR, ...UJI_TESTERS],
    startDate: addDays(today, -7),
    dueDate: addDays(today, 30),
    tasks,
  };
}
