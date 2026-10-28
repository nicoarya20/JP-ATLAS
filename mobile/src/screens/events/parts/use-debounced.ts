// A value that follows another once it stops changing: the search text goes to the server after typing pauses.
import { useEffect, useState } from 'react';

/** How long typing pauses before the search goes to the server. */
export const SEARCH_DEBOUNCE_MS = 300;

/** `value`, `ms` after its last change. */
export function useDebounced<T>(value: T, ms: number = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}
