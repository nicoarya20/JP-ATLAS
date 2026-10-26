/**
 * Pure view logic of the leave UI: date ranges and labels. No React and no clock — "today" always
 * arrives from the server, so every rule is testable on any date. The form helpers and the
 * four-state card view left with the application flow (P14 CU-02/CU-05); what stays is wording the
 * Ketersediaan card and the Inbox cards share.
 *
 * The two date formatters live in `@server/leave/leave.format` (pure, nothing server-only in it):
 * since P14 CU-03 the API has to name a clashing period in its 409 message, and one implementation
 * for both sides is the only way the sentence the admin reads and the card cannot drift apart.
 */
export { formatLeaveDay, formatLeaveRange } from '@server/leave/leave.format';

export const leaveDaysLabel = (days: number) => `${days} hari`;

/** "3 tugas jatuh tempo selama cuti", or the sentence for none. */
export function dueTasksLabel(count: number): string {
  return count > 0 ? `${count} tugas jatuh tempo selama cuti` : 'Tidak ada tugas jatuh tempo';
}
