// What the root layout needs to decide which half of the app to show: the session state, plus a
// retry for when the server could not be reached. Reading the session is started here, once, as the
// app comes up — before that, every /api/app/* request would go out without the session cookie.
import { useEffect, useState } from 'react';

import { connectSession, refreshSession } from './session.actions';
import { type SessionState, sessionStore, useSession } from './session.state';

export type SessionGate = SessionState & {
  /** Reads the session again; used by the "Try again" button on the unreachable screen. */
  retry: () => void;
  /** A retry is in flight (the status stays `unreachable` until the answer arrives). */
  retrying: boolean;
};

/**
 * The session gate: start the session on mount, then follow the store.
 *
 * TODO(mobile-W2): hold `status` on `loading` for an approved account until the server's clock
 * (`GET /api/app/home`, K1) is in, and turn a clock that cannot be fetched into `unreachable` —
 * the way `2a985b7^:mobile/src/session/use-session-gate.ts` did with `ensureClock`. Left out of W1
 * on purpose: the clock store belongs to W2 (reacttransition.md §6c), and W1 must not depend on it.
 */
export function useSessionGate(): SessionGate {
  const session = useSession();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    connectSession();
    // Only the first read happens here. The session is already known after that, and a remount —
    // a fast refresh, or the retry screen handing back to the navigator — must not ask again.
    if (sessionStore.get().status === 'loading') void refreshSession();
  }, []);

  const retry = () => {
    if (retrying) return;
    setRetrying(true);
    // refreshSession records every failure in the store itself (`unreachable` + the reason), so
    // there is nothing left to catch here; it only has to end the spinner either way.
    void refreshSession().finally(() => setRetrying(false));
  };

  return { ...session, retry, retrying };
}
