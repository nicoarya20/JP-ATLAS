import { eventsStore } from './events.store';
import { homeAgenda, homeFocus } from './home.focus';
import { homeStats } from './home.stats';
import type { HomeData, HomeSources } from './home.types';
import { getProjectsState } from './projects.state';
import {
  ACTIVITY,
  ASK,
  BRIEFING,
  DONE_THIS_WEEK,
  GREETING,
  ME_BY_ROLE,
  PEOPLE,
  type Role,
} from './sample';
import { getTasksState } from './tasks.state';
import { getDecisions, waitingUsers } from './users';

/*
 * Home data in one call, the swap point to the API: today it is built from the live task, event and project stores (so
 * a task moved, canceled or archived in Tasks, an event added or archived in Events, or a project edited or archived
 * in Projects, shows on Home) plus the prototype's sample copy; later it becomes a fetch of GET /api/app/home (the web
 * app's getHome) that returns the same HomeData.
 */

export type { HomeSources } from './home.types';

/** How many Ask Data questions, completed tasks and activity rows each role sees (prototype home.roles.js). */
const LENGTHS: Record<Role, { asks: number; done: number; activity: number }> = {
  member: { asks: 2, done: 2, activity: 1 },
  pm: { asks: 3, done: 4, activity: 3 },
  admin: { asks: 3, done: 4, activity: 3 },
};

/**
 * The stores as they are now; a screen passes what it read with useTasks / useEventsState / useProjectsState /
 * useDecisions to re-render on changes.
 */
export const homeSources = (): HomeSources => ({
  tasks: getTasksState(),
  events: eventsStore.get(),
  projects: getProjectsState(),
  decisions: getDecisions(),
});

/** Everything Home shows for `role`. */
export function getHome(role: Role, src: HomeSources = homeSources()): HomeData {
  const person = PEOPLE[ME_BY_ROLE[role]];
  const n = LENGTHS[role];
  const events = src.events.list;
  const waiting = waitingUsers(src.decisions).length;
  return {
    role,
    me: { name: person.name, full: person.full },
    greeting: GREETING,
    stats: homeStats(role, src, person.name),
    briefing: BRIEFING,
    focus: homeFocus(role, src.tasks, person.name, waiting),
    ask: { ...ASK, questions: ASK.questions.slice(0, n.asks) },
    agenda: homeAgenda(role, events, src.projects.list, person.name),
    done: DONE_THIS_WEEK.slice(0, n.done),
    activity: ACTIVITY.slice(0, n.activity),
  };
}
