// One status vocabulary (task, project, project health, event, account) for every module: a status word always reads
// in the same Atlas status pair. "Review" is not here: it is an event type, the task status is "In review".
export const STATUS_TONE = {
  // moving now (Atlas info = violet pair)
  'In progress': 'info', Active: 'info', Ongoing: 'info', Today: 'info',
  // waiting on someone, paused or at risk
  'In review': 'warning', 'On hold': 'warning', Pending: 'warning', 'Needs attention': 'warning', Extended: 'warning',
  Waiting: 'warning',
  // finished or healthy
  Done: 'success', Completed: 'success', Confirmed: 'success', 'On track': 'success',
  // late, stopped or live-recording
  Overdue: 'danger', Canceled: 'danger', Recording: 'danger',
  // not started yet
  'To do': 'neutral', Draft: 'neutral', Upcoming: 'neutral', 'No tasks yet': 'neutral',
};

const KEYS = Object.keys(STATUS_TONE).sort((a, b) => b.length - a.length);

/** Tone for a status label; ignores a leading mark ("! Needs attention", "✓ Done") and a trailing detail
    ("Extended ×1", "Confirmed · 3"). Unknown labels are not statuses and stay neutral. */
export function statusTone(label) {
  const text = String(label ?? '').replace(/^[^\p{L}]+/u, '').toLowerCase();
  const key = KEYS.find(k => text === k.toLowerCase() || text.startsWith(`${k.toLowerCase()} `));
  return key ? STATUS_TONE[key] : 'neutral';
}
