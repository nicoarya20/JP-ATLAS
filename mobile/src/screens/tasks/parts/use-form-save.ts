// Saving New task or Edit task (UX §2/§3): Save spins while the write is out; once it worked `done` runs (the notice
// and where to go), and a refusal stays on the form in the server's words (K5), so the person can fix it there.
import { useState } from 'react';

import { why } from '../detail/use-detail-run';

/** `{ busy, error, save }`: `save(write, done)` runs one write at a time. */
export function useFormSave() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async <T>(write: () => Promise<T>, done: (result: T) => void) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    let result: T;
    try {
      result = await write();
    } catch (e) {
      setError(why(e));
      setBusy(false);
      return;
    }
    setBusy(false);
    done(result);
  };
  return { busy, error, save };
}
