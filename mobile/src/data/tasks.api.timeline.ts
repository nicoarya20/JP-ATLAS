/**
 * A task's timeline as the detail reads it: one line per comment and per activity row.
 *
 * The server sends `action` + `payload` + `author` + `at`, not finished sentences (A8), so the
 * sentence is this app's to compose — in English, like the rest of the mobile UI, which is the one
 * case K5 allows: it is a verb picked from an enum, not a translation of a sentence the server
 * wrote. An action this app has not learnt yet is shown as its own verb rather than dropped, so a
 * server that grows a row never makes the history lie by leaving it out.
 *
 * `at` is an *instant*, so it goes through `instant.ts` in the team's zone (K2): a comment written
 * at 01.00 WIB belongs to that day, not to the UTC day before it.
 */
import { monthDay } from './dates';
import { instantDate } from './instant';
import type { WireTimelineEntry } from './tasks.api.types';

type WireActivity = Extract<WireTimelineEntry, { kind: 'activity' }>;

/** One line of "Chat & history". */
export type TaskHistoryLine = {
  /** The entry's own id, so a row keeps its place when an older page arrives. */
  id: string;
  text: string;
  /** "Oct 6", the day it happened in the team's zone. */
  when: string;
  /** Whose avatar sits beside it; null when the entry has no author at all. */
  who: string | null;
};

/** The verbs of `TASK_ACTIVITY` (`server/task/task.limits.ts`), in this app's words. */
const VERB: Record<string, string> = {
  created: 'created this task',
  assignee_changed: 'changed who is working on this task',
  due_date_changed: 'changed the due date',
  priority_changed: 'changed the priority',
  started: 'started working',
  unstarted: 'moved this task back to To do',
  completed: 'marked this task done',
  reopened: 'reopened this task',
  canceled: 'canceled this task',
  uncanceled: 'restored this task',
  'comment.delete': 'deleted a comment',
  trashed: 'moved this task to Archive',
  restored: 'brought this task back',
};

/**
 * The phase a `phase_changed` row moved the task to, when its payload really carries one.
 *
 * `payload` is `unknown` on the wire and only some actions are documented, so it is read defensively
 * and never trusted into a sentence: an unexpected shape falls back to the verb without a name in
 * it, which is still true.
 */
function phaseTo(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const to = (payload as { to?: unknown }).to;
  return typeof to === 'string' && to ? to : null;
}

function verbOf(entry: WireActivity): string {
  if (entry.action === 'phase_changed') {
    const to = phaseTo(entry.payload);
    return to ? `moved this task to ${to}` : 'changed the phase';
  }
  return VERB[entry.action] ?? entry.action;
}

/**
 * One timeline entry as a history line. A comment is shown as what was written, with who wrote it;
 * an activity row as its verb. An edited comment says so, because the time beside it is when it was
 * first written.
 */
export function historyLineOf(entry: WireTimelineEntry): TaskHistoryLine {
  const when = monthDay(instantDate(entry.at));
  const who = entry.author.name || null;
  if (entry.kind === 'comment') {
    const edited = entry.editedAt ? ' (edited)' : '';
    return { id: entry.id, text: `${entry.author.name}: ${entry.body}${edited}`, when, who };
  }
  return { id: entry.id, text: `${entry.author.name} ${verbOf(entry)}`, when, who };
}

/**
 * The timeline as the detail shows it, newest first — the server's own order.
 *
 * The prototype listed its sample history oldest first, but the server pages from the newest and
 * "Load more" can only add older entries, so keeping its order is the only one where a new page
 * lands at the bottom where the button is.
 */
export const historyOf = (entries: readonly WireTimelineEntry[]): TaskHistoryLine[] =>
  entries.map(historyLineOf);

/**
 * Who did the newest `action` the timeline carries, or null when it has none.
 *
 * This is how "Canceled by X" gets its name: `TaskDetail.cancel` has the category and the note but
 * no author (A7), and the server keeps the author on the activity row instead.
 */
export function authorOfAction(
  entries: readonly WireTimelineEntry[],
  action: string,
): string | null {
  const found = entries.find((e) => e.kind === 'activity' && e.action === action);
  return found?.author.name || null;
}
