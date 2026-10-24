// Runs a confirmed action (UX §2/§3): busy while it runs, closes on success, keeps the dialog open with a message on
// failure. Shared by ConfirmDialog (T2/T3) and a T3 sheet route (Archive "Delete forever").
import { useState } from 'react';

export const CONFIRM_ACTION = { failed: 'Could not finish. Try again.' } as const;

/** What the action does; may be async. Throwing (or rejecting) keeps the dialog open and shows the error. */
export type ConfirmRun = () => void | Promise<void>;

/** The message shown for a failure; default: the generic "Could not finish. Try again.". */
export type ConfirmErrorText = (error: unknown) => string;

/** `{ busy, error, run, clear }`: `run` calls `action`, then `done` once it succeeds. */
export function useConfirmAction(
  action: ConfirmRun,
  done: () => void,
  errorText: ConfirmErrorText = () => CONFIRM_ACTION.failed,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      // Handled: the person sees what failed and can try again or cancel.
      setError(errorText(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    done();
  };
  return { busy, error, run, clear: () => setError(null) };
}
