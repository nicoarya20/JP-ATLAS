import { monthDay, weekdayMonthDay } from '@/data/dates';
import type {
  AgendaEvent,
  FocusGroupKey,
  FocusTask,
  ProjectCondition,
  StatKey,
  StatSub,
} from '@/data/home.types';

/*
 * Every word Home words itself, in English like the prototype. What the server composed is not here:
 * the briefing lines, the Ask answers, the activity sentences and "Anda · hari ini" arrive in
 * Indonesian and are rendered as they came (K5) — writing an English copy of them would be a second
 * source of the same sentence.
 */

export const STAT_LABEL: Record<StatKey, string> = {
  assigned: 'Assigned',
  inbox: 'Inbox',
};

/** The line under a stat chip's label. */
export function statSub(sub: StatSub): string {
  switch (sub.kind) {
    case 'overdue':
      return `${sub.n} overdue`;
    case 'onTrack':
      return 'on track';
    case 'toRespond':
      return `${sub.n} to respond`;
    case 'caughtUp':
      return 'all caught up';
  }
}

export const FOCUS_GROUP: Record<FocusGroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  thisWeek: 'This week',
  later: 'Later',
  noDate: 'No due date',
};

/** How a project is doing, in the three words the server's condition means. */
export const CONDITION: Record<ProjectCondition, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
};

export const S = {
  /** Header before the greeting is known (the payload carries it). */
  title: 'Home',
  // An unknown part of the day leaves the name on its own rather than a stray comma.
  greeting: (greeting: string, name: string) => (greeting ? `${greeting}, ${name}` : name),
  search: 'Search or ask anything…',
  searchLater: 'Search is coming soon.',
  briefing: {
    title: 'Daily Briefing',
    sub: 'What do I need to know today?',
    meta: (updated: string) => `✦ Built automatically from project data · updated ${updated}`,
  },
  focus: {
    title: 'My Focus',
    sub: 'What should I work on now?',
    review: 'Review',
    awaitingReview: 'Awaiting your review',
    done: 'Done',
    start: 'Start',
    markedDone: 'Task marked done',
    started: 'Task started',
    actionFailed: 'Could not update the task. Try again.',
    empty: 'Nothing open right now.',
    seeAll: (open: number, review: number) =>
      `See all tasks (${open})${review ? ` · ${review} awaiting review` : ''}`,
    taskTitle: (no: number, title: string) => `#${no} ${title}`,
    taskSub: (project: string, when: string) => `${project} · ${when}`,
    /** When a focus row is due, from the two fields the server sends. */
    when: (t: Pick<FocusTask, 'dueDate' | 'overdueDays'>) => {
      if (t.overdueDays !== null && t.overdueDays > 0)
        return `${t.overdueDays} day${t.overdueDays === 1 ? '' : 's'} late`;
      return t.dueDate ? `Due ${monthDay(t.dueDate)}` : 'No due date';
    },
  },
  ask: {
    title: 'Ask Data',
    // The server answers three fixed questions and has no free-text ask, so the field is gone.
    sub: 'Three answers, from your own project data',
  },
  agenda: {
    title: 'Agenda & Projects',
    sub: 'Any meetings? How are my projects?',
    noMeetings: 'No meetings coming up',
    myProjects: 'My projects',
    noProjects: 'No open projects.',
    noTasksYet: 'No tasks yet',
    projectSub: (due: string | null) => (due ? `Due ${monthDay(due)}` : 'No due date'),
    eventSub: (e: AgendaEvent) => `${weekdayMonthDay(e.date)}${e.mode ? ` · ${e.mode}` : ''}`,
  },
  done: { title: 'Tasks Completed This Week', empty: 'Nothing completed this week yet.' },
  activity: { title: 'Latest Activity', empty: 'No activity yet.' },
  seeAll: 'See all',
  percent: (n: number) => `${n}%`,
};
