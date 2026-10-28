import type { Href } from 'expo-router';

import type { Widget } from './home.api';

/*
 * Shape of everything Home shows, built by getHome (src/data/home.ts) out of the one
 * `GET /api/app/home` payload. The data carries values, not copy: the screen words them
 * (src/screens/home/home.strings.ts), and the Indonesian sentences the server composed (the
 * briefing, an Ask answer, an activity line, "Anda · hari ini") travel through as they came (K5).
 *
 * Every section is a `Widget`, exactly as the server sends it: one failing query shows "Try again"
 * on its own card instead of blanking Home.
 */

export type { Widget } from './home.api';

/** Screen a Home element opens. */
export type HomeTarget = 'tasks.all' | 'tasks.my' | 'projects.list' | 'inbox.respond';

/**
 * The chips Home can honestly show: a chip is drawn only when the server sends a number that means
 * what its label says. Upcoming and the three Admin chips are hidden with their GAPs
 * (`mobile/docs/phase2-gap-disembunyikan.md`); In Progress comes from `tasks/counts`, Inbox from the
 * Inbox count.
 */
export type StatKey = 'assigned' | 'inProgress' | 'completed' | 'inbox';

/** The line under a stat chip's label. */
export type StatSub =
  | { kind: 'overdue'; n: number }
  | { kind: 'onTrack' }
  | { kind: 'mine' }
  | { kind: 'noneStarted' }
  | { kind: 'thisWeekMyProjects' }
  | { kind: 'toRespond'; n: number }
  | { kind: 'caughtUp' };

/** count null hides the number; alert shows the sub line in the danger colour. */
export type StatChip = {
  key: StatKey;
  count: number | null;
  sub: StatSub;
  alert: boolean;
  target: HomeTarget;
};

export type FocusTask = {
  /** The task's id, which is what a workflow write takes. */
  id: string;
  /** The number a person sees ("#14"), which is also how the task's own screen is addressed. */
  no: number;
  title: string;
  project: string;
  dueDate: string | null;
  /** Whole days past the due date; only the overdue group has it. */
  overdueDays: number | null;
  /** The row's one button, as the server's policy decided it — never a client rule. */
  action: 'complete' | 'start' | null;
};

/** A task waiting for my review; it has no due date or button of its own. */
export type ReviewTask = { id: string; no: number; title: string; project: string };

/** Mobile's own buckets: the server's `tomorrow` and `week` are one "This week" here. */
export type FocusGroupKey = 'overdue' | 'today' | 'thisWeek' | 'later' | 'noDate';

export type HomeFocus = {
  groups: { key: FocusGroupKey; tasks: FocusTask[] }[];
  review: ReviewTask[];
  /** Every open task of mine, not only the rows on screen. */
  openCount: number;
  /** Every task waiting for my review, likewise. */
  reviewCount: number;
  empty: boolean;
};

export type AgendaEvent = {
  id: string;
  /** Where its row leads. */
  href: Href;
  title: string;
  /** Clock time in the team zone, from `startsAt`. */
  time: string;
  /** Calendar day in the team zone, from `startsAt`. */
  date: string;
  /** Null when the event says nothing about where it is. */
  mode: 'In person' | 'Online' | null;
};

/** How a project is doing, as the server judges it; the lifecycle status lives in Projects. */
export type ProjectCondition = 'on_track' | 'at_risk' | 'off_track';

export type AgendaProject = {
  id: string;
  name: string;
  due: string | null;
  /** Null for a project with no tasks yet — not the same as 0%. */
  progress: number | null;
  condition: ProjectCondition | null;
  /** Why it needs a look, in the server's words. */
  reason: string | null;
};

/** A task finished this week: who finished it and when, both worded by the server. */
export type DoneTask = { id: string; title: string; who: string };

export type ActivityRow = { id: string; text: string; meta: string };

export type AskBar = { label: string; pct: number; display: string };

export type AskAnswer = { key: string; question: string; answer: string; bars: AskBar[] };

export type HomeData = {
  /** The signed-in account: the first name greets, the full name labels the avatar. */
  me: { name: string; full: string };
  greeting: string;
  stats: StatChip[];
  /** The lines are the server's Indonesian sentences; `updatedLabel` is its clock time. */
  briefing: Widget<{ lines: string[]; updatedLabel: string }>;
  focus: Widget<HomeFocus>;
  ask: Widget<AskAnswer[]>;
  /** My next meeting; null once there is none today or tomorrow. */
  agenda: Widget<AgendaEvent | null>;
  projects: Widget<AgendaProject[]>;
  done: Widget<DoneTask[]>;
  activity: Widget<ActivityRow[]>;
};
