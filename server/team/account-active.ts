/**
 * "This account may be shown and used", as SQL (S1-04, moved out of `picker.query.ts` for S6 M02 so
 * the picker and the Team queries share one definition instead of two copies drifting apart).
 */
import { sql } from 'drizzle-orm';
import { user } from '../db/schema';

// Same rule as `isBanActive` (server/ban.ts), in SQL: `ban_expires` is a plain `timestamp` and the
// session zone is UTC (X1 D7), so `now()` is shifted before comparing; an expired ban does not hold.
export const accountActive = sql<boolean>`(
  ${user.approvalStatus} = 'approved'
  AND NOT (
    coalesce(${user.banned}, false)
    AND (${user.banExpires} IS NULL OR ${user.banExpires} > (now() AT TIME ZONE 'UTC'))
  )
)`;

/** `LIKE` treats `%`, `_` and `\` as patterns; a typed name must match them literally. */
export const likeText = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
