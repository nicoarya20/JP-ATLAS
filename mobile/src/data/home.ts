import { homeAgenda, homeFocus } from './home.focus';
import { homeStats } from './home.stats';
import { tasksWith } from './home.tasks';
import type { HomeData } from './home.types';
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

/*
 * Home data in one call, the swap point to the API: today it is built from the prototype's sample data, later it
 * becomes a fetch of GET /api/app/home (the web app's getHome) that returns the same HomeData.
 */

/** How many Ask Data questions, completed tasks and activity rows each role sees (prototype home.roles.js). */
const LENGTHS: Record<Role, { asks: number; done: number; activity: number }> = {
  member: { asks: 2, done: 2, activity: 1 },
  pm: { asks: 3, done: 4, activity: 3 },
  admin: { asks: 3, done: 4, activity: 3 },
};

export type HomeOptions = {
  /** Task numbers marked done on this screen since it opened. */
  completed?: readonly number[];
};

/** Everything Home shows for `role`. */
export function getHome(role: Role, { completed = [] }: HomeOptions = {}): HomeData {
  const person = PEOPLE[ME_BY_ROLE[role]];
  const tasks = tasksWith(completed);
  const n = LENGTHS[role];
  return {
    role,
    me: { name: person.name, full: person.full },
    greeting: GREETING,
    stats: homeStats(role, tasks, person.name),
    briefing: BRIEFING,
    focus: homeFocus(role, tasks, person.name),
    ask: { ...ASK, questions: ASK.questions.slice(0, n.asks) },
    agenda: homeAgenda(role, person.name),
    done: DONE_THIS_WEEK.slice(0, n.done),
    activity: ACTIVITY.slice(0, n.activity),
  };
}
