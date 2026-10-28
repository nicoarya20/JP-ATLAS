/**
 * "Chat & history" of the task detail from `GET /api/app/tasks/:ref/timeline` (map
 * `phase2-map-tasks.md` §2c, §3). The server sends each activity as an `action` with its `payload`,
 * never a sentence, so the English line is built here; a comment is its author's own words. Names
 * are the server's (a removed account reads "Mantan anggota", K5). An action this app does not know
 * yet still gets a line, so the history never silently drops what happened.
 */
import { monthDay } from './dates';
import { instantDate } from './instant';
import { cancelLabel } from './tasks.detail';
import type { TaskDetailWire, TimelineEntryWire } from './tasks.detail.wire';
import { PRIORITY_LABEL, type TaskCancelCategoryWire, type TaskPriorityWire } from './tasks.wire';

export type HistoryLine = {
  id: string;
  /** Whose avatar the line shows; null for a removed account. */
  who: string | null;
  text: string;
  /** "Oct 7", in the team's zone. */
  when: string;
  comment: boolean;
};

type Payload = Record<string, unknown>;
const field = (p: unknown, key: string): string | null => {
  const v = (p as Payload | null)?.[key];
  return typeof v === 'string' && v ? v : null;
};

/** What `who` did, without the name: "started working", "set the priority to High". */
function deed(action: string, p: unknown, task: Pick<TaskDetailWire, 'assignee'>): string {
  const to = field(p, 'to');
  switch (action) {
    case 'created':
      return 'created this task';
    case 'started':
      return 'started working';
    case 'unstarted':
      return 'stopped working';
    case 'completed':
      return 'marked this task done';
    case 'reopened': {
      const why = field(p, 'reason');
      return why ? `reopened this task: ${why}` : 'reopened this task';
    }
    case 'canceled': {
      const c = field(p, 'category') as TaskCancelCategoryWire | null;
      const note = field(p, 'note');
      const why = [c && cancelLabel(c), note].filter(Boolean).join(' — ');
      return why ? `canceled this task: ${why}` : 'canceled this task';
    }
    case 'uncanceled':
      return 'restored this task';
    case 'assignee_changed':
      // The payload holds ids only; the current assignee's name is the one this app knows.
      if (!to) return 'removed the assignee';
      return task.assignee?.id === to
        ? `assigned it to ${task.assignee.name}`
        : 'changed the assignee';
    case 'due_date_changed':
      return to ? `set the due date to ${monthDay(to)}` : 'removed the due date';
    case 'priority_changed': {
      const label = to ? PRIORITY_LABEL[to as TaskPriorityWire] : undefined;
      return label ? `set the priority to ${label}` : 'changed the priority';
    }
    case 'phase_changed':
      return to ? `moved it to the phase ${to}` : 'took it out of its phase';
    case 'comment.delete':
      return 'deleted a comment';
    case 'trashed':
      return 'moved this task to the Trash';
    case 'restored':
      return 'brought this task back from the Trash';
    default:
      return 'changed this task';
  }
}

/** The timeline's entries as history lines, newest first (the server's order). */
export function historyLines(
  entries: readonly TimelineEntryWire[],
  task: Pick<TaskDetailWire, 'assignee'>,
): HistoryLine[] {
  return entries.map((e) => {
    const who = e.author.id ? e.author.name : null;
    const when = monthDay(instantDate(e.at));
    if (e.kind === 'comment') {
      const edited = e.editedAt ? ' (edited)' : '';
      return { id: e.id, who, when, comment: true, text: `${e.author.name}: ${e.body}${edited}` };
    }
    return {
      id: e.id,
      who,
      when,
      comment: false,
      text: `${e.author.name} ${deed(e.action, e.payload, task)}`,
    };
  });
}
