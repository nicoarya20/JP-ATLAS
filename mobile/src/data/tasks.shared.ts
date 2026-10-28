/*
 * Words every Tasks view shares, whatever the server sends: the workflow statuses, the priorities and the late note.
 * The sample task store that once lived beside them is gone (gap §4.4).
 */

/** The task workflow as the screens name it (the server's `todo` … `canceled`, mapped in tasks.wire). */
export type TaskStatus = 'To do' | 'In progress' | 'In review' | 'Done' | 'Canceled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

/** "1 day late", "3 days late": the facts' due note, and the text a late card shows beside its red date. */
export const daysLate = (n: number) => `${n} ${n === 1 ? 'day' : 'days'} late`;
