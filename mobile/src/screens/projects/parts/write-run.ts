// How the Projects screens run a write behind a button and say how it went (UX §2–§3): busy while it runs, a notice
// with the outcome, and why it failed (`writeError`).
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { useNotice } from '@/components/notice/use-notice';
import { writeError } from '@/components/state/write-error';

/**
 * `{ busy, run }`: `run(key, action, done)` runs one write at a time, `busy` names the one running (for its
 * button's spinner), then a notice says `done` or why it failed. A failure that is not a server answer is a bug in
 * this app: it is still said, then thrown on.
 */
export function useBusyWrite() {
  const notice = useNotice();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, action: () => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(key);
    try {
      await action();
      notice(done);
    } catch (e) {
      notice(writeError(e));
      if (!isApiError(e)) throw e;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}
