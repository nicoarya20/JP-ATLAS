import { monthDay, weekdayMonthDay } from '@/data/dates';
import type { AgendaEvent, FocusGroupKey, StatKey, StatSub } from '@/data/home.types';

/* Every word Home shows, in English like the prototype (riset-keano/prototype-react/src/screens/home). */

export const STAT_LABEL: Record<StatKey, string> = {
  assigned: 'Assigned',
  inProgress: 'In Progress',
  completed: 'Completed',
  upcoming: 'Upcoming',
  inbox: 'Inbox',
  active: 'Active',
  overdue: 'Overdue',
  awaiting: 'Awaiting',
};

/** The line under a stat chip's label. */
export function statSub(sub: StatSub): string {
  switch (sub.kind) {
    case 'overdue':
      return `${sub.n} overdue`;
    case 'onTrack':
      return 'on track';
    case 'dueToday':
      return `${sub.n} due today`;
    case 'noneStarted':
      return 'none started';
    case 'nextDue':
      return `next due ${monthDay(sub.date)}`;
    case 'thisWeek':
      return 'this week';
    case 'items':
      return `${sub.n} ${sub.n === 1 ? 'item' : 'items'}`;
    case 'toRespond':
      return `${sub.n} to respond`;
    case 'caughtUp':
      return 'all caught up';
    case 'unit':
      return sub.unit;
  }
}

export const FOCUS_GROUP: Record<FocusGroupKey, string> = {
  overdue: 'Overdue',
  today: 'Today',
  thisWeek: 'This week',
};

export const S = {
  greeting: (greeting: string, name: string) => `${greeting}, ${name}`,
  openProfile: (full: string) => `${full}, open profile`,
  search: 'Search or ask anything…',
  searchLater: 'Search is coming soon.',
  briefing: { title: 'Daily Briefing', sub: 'What do I need to know today?' },
  focus: {
    title: 'My Focus',
    sub: 'What should I work on now?',
    needsAction: 'Needs action',
    // The prototype only words two; one left after a decision reads "1 new user".
    approve: (n: number) => `Approve ${n} new user${n === 1 ? '' : 's'}`,
    approveSub: 'Users · Approval · Waiting 1 day',
    open: 'Open',
    review: 'Review',
    awaitingReview: 'Awaiting your review',
    done: 'Done',
    markedDone: 'Task marked done',
    empty: 'Nothing due this week.',
    seeAll: (open: number, review: number) =>
      `See all tasks (${open})${review ? ` · ${review} awaiting review` : ''}`,
    taskTitle: (no: number, title: string) => `#${no} ${title}`,
    taskSub: (project: string, when: string) => `${project} · ${when}`,
    /** A row without its own action carries its status here, so the right column only ever holds buttons. */
    taskSubStatus: (project: string, when: string, status: string) =>
      `${project} · ${when} · ${status}`,
  },
  ask: {
    title: 'Ask Data',
    sub: 'Ask anything about your projects',
    placeholder: 'Type or say a question…',
    button: 'Ask',
    answered: 'Answer generated',
  },
  agenda: {
    title: 'Agenda & Projects',
    sub: 'Any meetings? How are my projects?',
    noMeetings: 'No meetings coming up',
    myProjects: 'My projects',
    noProjects: 'No open projects.',
    projectSub: (lead: string, due: string) => `Lead ${lead} · Due ${monthDay(due)}`,
    eventSub: (e: AgendaEvent) =>
      `${weekdayMonthDay(e.date)} · ${e.mode === 'Online' ? 'Online' : `${e.mode} · ${e.place}`}`,
  },
  done: { title: 'Tasks Completed This Week', empty: 'Nothing completed this week yet.' },
  activity: { title: 'Latest Activity', empty: 'No activity yet.' },
  seeAll: 'See all',
  percent: (n: number) => `${n}%`,
};
