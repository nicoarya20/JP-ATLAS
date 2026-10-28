// What the root layout needs to decide which half of the app to show: the session state, plus a
// retry for when the server could not be reached. Reading the session is started here, once, as the
// app comes up — before that, every /api/app/* request would go out without the session cookie.
import { useEffect, useState } from 'react';

import { ensureClock } from '@/data/home.api';

import { connectSession, refreshSession } from './session.actions';
import {
  type SessionState,
  sessionStore,
  setSessionUnreachable,
  useSession,
} from './session.state';

export type SessionGate = SessionState & {
  /** Reads the session again; used by the "Try again" button on the unreachable screen. */
  retry: () => void;
  /** A retry is in flight (the status stays `unreachable` until the answer arrives). */
  retrying: boolean;
};

/** The session gate: start the session on mount, fetch the server's clock, then follow the store. */
export function useSessionGate(): SessionGate {
  const session = useSession();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    connectSession();
    // Only the first read happens here. The session is already known after that, and a remount —
    // a fast refresh, or the retry screen handing back to the navigator — must not ask again.
    if (sessionStore.get().status === 'loading') void refreshSession();
  }, []);

  // An approved account still has no date to show until the server's clock has arrived (K1), so
  // fetch it here — at app start and again after a sign-in, which this effect sees as a status
  // change. A failure that says nothing about the session gets the retry screen, the same as a
  // session that could not be read: guessing a date is worse than asking again.
  const needsClock = session.status === 'signed-in' && session.clock === null;
  useEffect(() => {
    if (!needsClock) return;
    void ensureClock().then((state) => {
      if (state.phase !== 'failed' || !state.error) return;
      // A 401/403 has already moved the session on (applyApiError); only a failure that proved
      // nothing about the account leaves an approved session with no clock, and that is the one
      // worth offering a retry for.
      const after = sessionStore.get();
      if (after.status === 'signed-in' && after.clock === null) setSessionUnreachable(state.error);
    });
  }, [needsClock]);

  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    // refreshSession records every failure in the store itself (`unreachable` + the reason), so
    // there is nothing left to catch here; it only has to end the spinner either way. A session
    // read that lands on `signed-in` without a clock brings the effect above back to fetch it.
    void refreshSession().finally(() => setRetrying(false));
  };

  return {
    ...session,
    // Held on `loading` until the clock is in: the root layout keeps the splash up for that, so no
    // dated screen can draw a frame with a date the server has not given us.
    status: needsClock ? 'loading' : session.status,
    retry,
    retrying,
  };
}
