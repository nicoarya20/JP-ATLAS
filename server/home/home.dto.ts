/**
 * Wire shape of `GET /api/app/home` (P4 §5.2). Type-only and browser-safe (no DB import): the loader,
 * the API and the widgets all read the same shapes. Every section is a `Widget`, so one failing
 * query shows "Coba lagi" on its own card instead of blanking the page.
 */
import type { IsoDate } from '../metrics/types';
import type { EventKind, EventLocationType, ProjectCondition, ProjectPriority } from '../pm/enums';

/** A section that loaded, or one that failed softly (the cause is logged server-side, never sent). */
export type Widget<T> = { ok: true; data: T } | { ok: false };

export type Greeting = 'pagi' | 'siang' | 'sore' | 'malam';

/** "Now" of the request in the team zone; the greeting and the date come from here, never from the browser. */
export type HomeNow = {
  iso: string;
  today: IsoDate;
  timeZone: string;
  greeting: Greeting;
  /** `Kamis, 8 Oktober 2026`. */
  dateLabel: string;
  /** `07.30`, the minute the briefing was put together. */
  timeLabel: string;
};

export type HomeBriefing = { lines: string[]; updatedLabel: string };

/** Counts over the projects I manage; both project counts let the card say why a zero is a zero. */
export type HomeCounters = {
  unassigned: number;
  inProgress: number;
  completed: number;
  managedProjects: number;
  memberProjects: number;
};

export type HomeProjectRef = { id: string; name: string };

export type HomeScheduleGroup = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export type HomeFocusTask = {
  id: string;
  number: number;
  title: string;
  project: HomeProjectRef;
  dueDate: string | null;
  group: HomeScheduleGroup;
  /** Whole days past the due date, only for the overdue group. */
  overdueDays: number | null;
  priority: ProjectPriority;
  /** The one button of the row: finish it, or start it when finishing is not (yet) allowed. */
  action: 'complete' | 'start' | null;
};

export type HomeReviewTask = { id: string; number: number; title: string; project: HomeProjectRef };

export type HomeFocus = {
  items: HomeFocusTask[];
  /** Every task of mine that qualifies, for "Lihat semua tugas (N)". */
  total: number;
  overdueTotal: number;
  todayTotal: number;
  awaitingReview: HomeReviewTask[];
  awaitingReviewTotal: number;
};

export type HomeDoneTask = {
  id: string;
  number: number;
  title: string;
  project: HomeProjectRef;
  /** "Anda" for my own, else the person's name; "Belum ada pengerja" when nobody was assigned. */
  byName: string;
  /** "hari ini", "kemarin" or the weekday. */
  dayLabel: string;
};

export type HomeDone = { items: HomeDoneTask[]; total: number };

export type HomeProject = {
  id: string;
  name: string;
  dueDate: string | null;
  progress: { done: number; total: number; percent: number | null };
  condition: ProjectCondition | null;
  reason: string | null;
};

export type HomeAgendaItem = {
  id: string;
  title: string;
  kind: EventKind;
  startsAt: string;
  endsAt: string;
  locationType: EventLocationType | null;
  project: HomeProjectRef | null;
  day: 'today' | 'tomorrow';
};

export type HomeActivityItem = {
  id: string;
  text: string;
  projectName: string;
  at: string;
  taskNumber: number;
};

export const ASK_KEYS = ['behind', 'stalled', 'busiest'] as const;
export type AskKey = (typeof ASK_KEYS)[number];

export type AskBar = { label: string; pct: number; display: string };
export type AskAnswer = { key: AskKey; question: string; answer: string; bars: AskBar[] };

export type HomeData = {
  now: HomeNow;
  briefing: Widget<HomeBriefing>;
  counters: Widget<HomeCounters>;
  focus: Widget<HomeFocus>;
  done: Widget<HomeDone>;
  projects: Widget<HomeProject[]>;
  agenda: Widget<HomeAgendaItem[]>;
  activity: Widget<HomeActivityItem[]>;
  ask: Widget<AskAnswer[]>;
};
