import type { EventHref } from './events.shared';
import type { EventsState } from './events.store';
import type { ProjectsState } from './projects.state';
import type { ProjectStatus, Role, TaskStatus } from './sample';
import type { TasksState } from './tasks.state';
import type { Decisions } from './users';

/*
 * Shape of everything Home shows, built by getHome (src/data/home.ts). The data carries values, not copy: the screen
 * words them (src/screens/home/home.strings.ts), so the API can later return this same shape.
 */

/**
 * What Home is built from: the task, event and project state and the Users decisions (Phase 2: the API's answer
 * instead).
 */
export type HomeSources = {
  tasks: TasksState;
  events: EventsState;
  projects: ProjectsState;
  decisions: Decisions;
};

/** Prototype screen a Home element opens (riset-keano/prototype-react screen ids). */
export type HomeTarget =
  | 'tasks.all'
  | 'tasks.my'
  | 'projects.list'
  | 'users.approve'
  | 'events.calendar'
  | 'inbox.respond';

export type StatKey =
  | 'assigned'
  | 'inProgress'
  | 'completed'
  | 'upcoming'
  | 'inbox'
  | 'active'
  | 'overdue'
  | 'awaiting';

/** The line under a stat chip's label. */
export type StatSub =
  | { kind: 'overdue'; n: number }
  | { kind: 'onTrack' }
  | { kind: 'dueToday'; n: number }
  | { kind: 'noneStarted' }
  | { kind: 'nextDue'; date: string }
  | { kind: 'thisWeek' }
  | { kind: 'items'; n: number }
  | { kind: 'toRespond'; n: number }
  | { kind: 'caughtUp' }
  | { kind: 'unit'; unit: 'projects' | 'tasks' | 'users' };

/** count null hides the number; alert shows the sub line in the danger colour. */
export type StatChip = {
  key: StatKey;
  count: number | null;
  sub: StatSub;
  alert: boolean;
  target: HomeTarget;
};

export type FocusTask = {
  no: number;
  title: string;
  project: string;
  when: string;
  status: TaskStatus;
  /** False when the task is in review or has a reviewer: the row shows its status instead of Done. */
  canMarkDone: boolean;
};

export type FocusGroupKey = 'overdue' | 'today' | 'thisWeek';

export type HomeFocus = {
  /** Admin only: accounts waiting for approval; null when none waits (or not an Admin). */
  pendingUsers: number | null;
  groups: { key: FocusGroupKey; tasks: FocusTask[] }[];
  /** PM only: other people's tasks in review. */
  review: FocusTask[];
  openCount: number;
  empty: boolean;
};

export type AgendaEvent = {
  id: string;
  /** Where its row leads (eventHref: the detail of an event not done). */
  href: EventHref;
  title: string;
  time: string;
  date: string;
  mode: 'In person' | 'Online';
  place: string;
};

export type AgendaProject = {
  id: string;
  name: string;
  lead: string;
  due: string;
  progress: number;
  status: ProjectStatus;
};

export type HomeData = {
  role: Role;
  me: { name: string; full: string };
  greeting: string;
  stats: StatChip[];
  briefing: { lines: string[]; meta: string };
  focus: HomeFocus;
  ask: { questions: string[]; answer: string; projects: { name: string; pct: number }[] };
  agenda: { next: AgendaEvent | null; projects: AgendaProject[] };
  done: { title: string; who: string }[];
  activity: { title: string; meta: string }[];
};
