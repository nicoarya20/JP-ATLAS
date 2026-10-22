// Profile overlay state (note, presence, mute) kept outside the overlay so it survives closing and reopening it.
import { useSyncExternalStore } from 'react';

export const NOTE_MAX = 60;
const INITIAL = { note: '', online: true, muted: false };

let state = INITIAL;
const listeners = new Set();

const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => state;

/** Merge a patch into the profile state and re-render every reader. */
export function setProfile(patch) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn());
}

/** Back to the signed-in defaults (empty note, online, notifications on). test-only */
export const resetProfile = () => setProfile(INITIAL);

/** Current profile state: {note, online, muted}. */
export const useProfile = () => useSyncExternalStore(subscribe, snapshot);
