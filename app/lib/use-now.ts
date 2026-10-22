/** A clock for relative times that starts at the server's "now" (same text on server and first paint) and then ticks. */
import { useEffect, useState } from 'react';

/** How often the "x menit lalu" labels are recomputed. */
export const NOW_TICK_MS = 60_000;

export function useNow(initial: number): number {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}
