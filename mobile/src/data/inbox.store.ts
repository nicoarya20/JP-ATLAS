// Inbox read state (prototype inbox.store.js): "Mark all as read" clears Today's unread dots, and they stay cleared when
// the Inbox is left and reopened. Restarting the app brings the sample back.
import { createStore, useStore } from './store';

const read = createStore(false);

/** Mark every update read and re-render the readers. */
export const markAllRead = () => read.set(true);

/** True once "Mark all as read" was pressed. */
export const useAllRead = () => useStore(read);

/** Same as useAllRead, outside a component. */
export const getAllRead = () => read.get();

/** Back to the sample (Today's updates unread). test-only */
export const resetInbox = () => read.reset();
