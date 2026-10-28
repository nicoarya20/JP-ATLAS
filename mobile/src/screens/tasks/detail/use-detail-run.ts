// One write of the task detail at a time (UX §2/§3): which control is busy, the notice once it worked, and the server's
// own words when it did not (K5). The data layer has already refreshed what the write changed.
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';

/** A failure in the words it came with (the server's, for an API error). */
export const why = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** `{ busy, run }`: `run(key, write)` resolves true when the write worked. */
export function useDetailRun() {
  const notice = useNotice();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, write: () => Promise<string | undefined>) => {
    if (busy) return false;
    setBusy(key);
    try {
      const done = await write();
      if (done) notice(done);
      return true;
    } catch (e) {
      notice(why(e));
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}
