// Meeting outcomes data, the API swap point for Steps 1–3 and the confirmed results (prototype events.outcomes.jsx /
// events.confirmed.jsx): the stand-up minutes and drafts, and the tasks confirmed outcomes made, read live from Tasks.
import { monthDay } from './dates';
import { type EventItem, eventProject, isConfirmed } from './events.shared';
import { findEvent } from './events.store';
import type { Role } from './sample';
import { EVENT_RESULTS, type OpenQuestion, STANDUP } from './sample/events.extra';
import { getTask } from './tasks.store';

export type OutcomesData = {
  event: EventItem;
  project: string;
  /** The stand-up recording, transcript and the tasks the AI drafted from it. */
  minutes: typeof STANDUP;
  /** A Member only reads the outcomes and waits for the creator to confirm them. */
  readOnly: boolean;
};

/** Recording done → minutes → draft tasks of event id (every event shows the stand-up sample); null when no such event. */
export function getOutcomes(role: Role, id: string): OutcomesData | null {
  const e = findEvent(id);
  if (!e) return null;
  return { event: e, project: eventProject(e), minutes: STANDUP, readOnly: role === 'member' };
}

/** A task the outcomes created, as it is now; `exists` is false once Tasks no longer has it (it opens All tasks). */
export type MadeTask = {
  no: number;
  title: string;
  status: string;
  who?: string;
  due?: string;
  exists: boolean;
};

export type EventResultsData = {
  event: EventItem;
  project: string;
  /** "Confirmed by Nico · Oct 1, 2026, 11:40 AM". */
  confirmed: string;
  tasks: MadeTask[];
  /** How many of those tasks are Done now. */
  done: number;
  decisions: readonly string[];
  info: readonly string[];
  question: OpenQuestion;
  /** What the minutes came from, then who wrote them. */
  source: readonly [string, string];
  minutes: string;
};

function made(no: number, title: string | undefined, status: string): MadeTask {
  const t = getTask(no);
  if (!t) return { no, title: title ?? '', status, exists: false };
  return { no, title: title ?? t.title, status: t.status, who: t.who, due: t.due, exists: true };
}

/** Confirmed outcomes of event id: the kickoff sample, or what Step 3 confirmed; null when none are confirmed. */
export function getEventResults(id: string): EventResultsData | null {
  const e = findEvent(id);
  if (!e || !isConfirmed(e)) return null;
  const base = { event: e, project: eventProject(e) };
  if (!e.outcomes) {
    const { confirmed, decisions, info, question, source, minutes } = EVENT_RESULTS;
    const tasks = EVENT_RESULTS.tasks.map((t) => made(t.no, t.title, t.status));
    return {
      ...base,
      confirmed,
      tasks,
      done: countDone(tasks),
      decisions,
      info,
      question,
      source,
      minutes,
    };
  }
  const { tasks: nos, by, date } = e.outcomes;
  const tasks = nos.map((no) => made(no, getTask(no)?.title, 'To do'));
  return {
    ...base,
    confirmed: `Confirmed by ${by} · ${monthDay(date)}`,
    tasks,
    done: countDone(tasks),
    decisions: STANDUP.decisions,
    info: STANDUP.info,
    question: STANDUP.question,
    source: ['Source: voice recording', STANDUP.by],
    minutes: STANDUP.transcript.join(' '),
  };
}

const countDone = (tasks: readonly MadeTask[]) => tasks.filter((t) => t.status === 'Done').length;
