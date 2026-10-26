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

/** The session gate: start the session on mount, then follow the store. */
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
    void refreshSession().finally(() => setRetrying(false));
  };

  return { ...session, retry, retrying };
}
