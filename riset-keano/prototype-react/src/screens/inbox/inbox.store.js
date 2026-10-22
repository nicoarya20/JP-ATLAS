// Inbox read state: "Mark all as read" clears Today's unread dots, and they stay cleared when the Inbox is left and
// reopened. A page reload brings the sample back.
import { useSyncExternalStore } from 'react';

let allRead = false;
const listeners = new Set();

const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/** Mark every update read and re-render the readers. */
export function markAllRead() {
  allRead = true;
  listeners.forEach(fn => fn());
}

/** Back to the sample (Today's updates unread). test-only */
export function resetInboxRead() {
  allRead = false;
  listeners.forEach(fn => fn());
}

/** True once "Mark all as read" was pressed. */
export const useAllRead = () => useSyncExternalStore(subscribe, () => allRead);
