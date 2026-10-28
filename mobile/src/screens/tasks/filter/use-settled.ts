// The search text a task list sends: what was typed, once typing has paused (SEARCH_WAIT_MS), so a word is one request,
// not one per letter. Shared by the Tasks tab and a project's Tasks tab.
import { useEffect, useState } from 'react';

/** How long typing must pause before the search is sent. */
export const SEARCH_WAIT_MS = 300;

/** `value`, once it has stayed the same for `ms`. */
export function useSettled(value: string, ms: number = SEARCH_WAIT_MS): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}
