// One status vocabulary for every screen (port of the prototype's kit/status.js): a status word always reads in the
// same Atlas pair. Values are gluestack Badge variants (src/components/ui/badge).

export type StatusTone = 'default' | 'info' | 'warning' | 'success' | 'destructive';

const STATUS_TONE: Record<string, StatusTone> = {
  // moving now (Atlas info = violet pair)
  'In progress': 'info',
  Active: 'info',
  Ongoing: 'info',
  Today: 'info',
  // waiting on someone, paused or at risk
  'In review': 'warning',
  'On hold': 'warning',
  Pending: 'warning',
  'Needs attention': 'warning',
  Extended: 'warning',
  Waiting: 'warning',
  // finished or healthy
  Done: 'success',
  Completed: 'success',
  Confirmed: 'success',
  'On track': 'success',
  // late, stopped or live-recording
  Overdue: 'destructive',
  Canceled: 'destructive',
  Recording: 'destructive',
  // not started yet
  'To do': 'default',
  Draft: 'default',
  Upcoming: 'default',
  'No tasks yet': 'default',
};

const KEYS = Object.keys(STATUS_TONE).sort((a, b) => b.length - a.length);

/** Tone for a status label; ignores a leading mark ("✓ Done") and a trailing detail ("Extended ×1"). Unknown → default. */
export function statusTone(label: string): StatusTone {
  const text = label.replace(/^[^\p{L}]+/u, '').toLowerCase();
  const key = KEYS.find((k) => text === k.toLowerCase() || text.startsWith(`${k.toLowerCase()} `));
  return key ? STATUS_TONE[key] : 'default';
}
