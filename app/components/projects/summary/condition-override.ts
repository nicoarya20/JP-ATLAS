/** Rules of the "Atur kondisi" form, pure so the button's reason and the request body are testable. */
import { METRICS } from '@server/metrics/config';
import type { IsoDate } from '@server/metrics/types';
import type { ProjectCondition } from '@server/pm/enums';
import { OVERRIDE_REASON_MAX } from '@server/project/project.limits';
import type { ConditionOverrideInput } from '~/lib/project-deadline-api';
import { OVERRIDE_COPY } from './summary.copy';

export type OverrideValues = {
  condition: ProjectCondition | null;
  reason: string;
  /** `YYYY-MM-DD` of the last day the condition holds, null = until cleared by hand. */
  until: string | null;
};

export const EMPTY_OVERRIDE: OverrideValues = { condition: null, reason: '', until: null };

/** Length as the server counts it (trimmed UTF-16 units). */
export const overrideReasonLength = (reason: string): number => reason.trim().length;

const ISO_DAY_END = 'T23:59:59Z';
const MS_PER_SECOND = 1000;

/** Milliseconds `tz` is ahead of UTC at instant `at`, read back from the zone's own wall clock. */
function zoneOffsetMs(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return wall - Math.floor(at.getTime() / MS_PER_SECOND) * MS_PER_SECOND;
}

/** The instant the team's calendar day `date` ends, as the ISO string the API wants. */
export function endOfDayInstant(date: IsoDate, tz: string = METRICS.TIME_ZONE): string {
  const wall = new Date(`${date}${ISO_DAY_END}`);
  return new Date(wall.getTime() - zoneOffsetMs(tz, wall)).toISOString();
}

/** Why "Pasang kondisi" is off right now, or null when the form can be sent. `today` is the server's day. */
export function overrideBlocker(v: OverrideValues, today: string): string | null {
  if (!v.condition) return OVERRIDE_COPY.needCondition;
  const length = overrideReasonLength(v.reason);
  if (length === 0) return OVERRIDE_COPY.needReason;
  if (length > OVERRIDE_REASON_MAX) return OVERRIDE_COPY.tooLong(OVERRIDE_REASON_MAX);
  if (v.until && v.until < today) return OVERRIDE_COPY.pastEnd;
  return null;
}

export function toOverrideInput(v: OverrideValues, today: string): ConditionOverrideInput | null {
  if (overrideBlocker(v, today) !== null || !v.condition) return null;
  return {
    condition: v.condition,
    reason: v.reason.trim(),
    expiresAt: v.until ? endOfDayInstant(v.until as IsoDate) : null,
  };
}
