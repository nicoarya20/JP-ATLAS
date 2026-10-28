/**
 * Today's date and the team's time zone, as the server decided them (K1): `now.today` and
 * `now.timeZone` of `GET /api/app/home`. There is no endpoint of its own for the clock, and no
 * screen may fall back to the phone's own clock — a phone in another zone, or with a wrong date,
 * would then disagree with the server about which day a task is due.
 *
 * The value lives in the session store (`SessionState.clock`), not in a second store of its own:
 * two copies of "today" would drift. This module is how the data layer reads it.
 *
 * Inside the app's own screens the clock is guaranteed to be there, the same way the signed-in
 * account is: the gate keeps the splash up until it has loaded (src/session/use-session-gate.ts),
 * so `today()` cannot be called before it exists. `requireClock()` throws rather than guessing,
 * because a date computed without the server's clock is a bug that shows wrong days to someone,
 * not a case to paper over.
 */
import { type SessionClock, sessionStore } from '@/session/session.state';

import { useStore } from './store';

export type Clock = SessionClock;

/** The clock, or null before `GET /api/app/home` has answered. */
export const peekClock = (): Clock | null => sessionStore.get().clock;

/** Whether the server's clock has arrived. Dated screens must not render until it has. */
export const clockLoaded = (): boolean => peekClock() !== null;

/** The clock, or an error naming what is missing. */
export function requireClock(): Clock {
  const clock = peekClock();
  if (!clock)
    throw new Error(
      'The clock from GET /api/app/home has not loaded yet: today and the team time zone are ' +
        'unknown. Render a loading state instead of computing a date (K1); never fall back to the ' +
        "device's own clock.",
    );
  return clock;
}

/** Today, as `YYYY-MM-DD` in the team's zone. The date every "today" in the data layer means. */
export const today = (): string => requireClock().today;

/** The team's IANA zone (`Asia/Jakarta`), for turning an instant from the server into a date or a time. */
export const teamTimeZone = (): string => requireClock().timeZone;

/** The clock in a component; null while it loads, so a screen can show that instead of a date. */
export const useClock = (): Clock | null => useStore(sessionStore, (s) => s.clock);

/**
 * Today in a component, for a screen the gate already guarantees a clock for (every screen behind
 * the session gate). Outside that guarantee use `useClock()` and handle null.
 */
export function useToday(): string {
  const clock = useClock();
  if (!clock) return requireClock().today; // throws with the explanation above
  return clock.today;
}
