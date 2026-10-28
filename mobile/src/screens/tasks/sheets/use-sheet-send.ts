// Sends a task sheet (UX §2/§3): the main action spins while the step is out; once it worked the sheet closes and the
// notice shows, and a refusal stays in the sheet in the server's words (K5), so the person can fix it or go back.
import { router } from 'expo-router';
import { useState } from 'react';

import { useNotice } from '@/components/notice/use-notice';

import { why } from '../detail/use-detail-run';

export function useSheetSend() {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async (step: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const done = await step();
      setBusy(false);
      notice(done);
      router.back();
    } catch (e) {
      setError(why(e));
      setBusy(false);
    }
  };
  return { busy, error, send };
}
