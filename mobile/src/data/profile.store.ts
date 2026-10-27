// Profile state (prototype profile.store.js): the note, presence and mute, kept outside the profile modal so they survive
// closing and reopening it.
import { createStore, useStore } from './store';

/** Longest note the bubble takes. */
export const NOTE_MAX = 60;

export type ProfileState = { note: string; online: boolean; muted: boolean };

const INITIAL: ProfileState = { note: '', online: true, muted: false };

const profile = createStore<ProfileState>(INITIAL);

/** Merge a patch into the profile state; a note is trimmed and cut to NOTE_MAX. */
export function setProfile(patch: Partial<ProfileState>) {
  const note = patch.note === undefined ? {} : { note: patch.note.trim().slice(0, NOTE_MAX) };
  profile.set((s) => ({ ...s, ...patch, ...note }));
}

/** Current profile state in a component: { note, online, muted }. */
export const useProfile = () => useStore(profile);

/** Same as useProfile, outside a component. */
export const getProfileState = () => profile.get();

/** Back to the signed-in defaults (empty note, online, notifications on). test-only */
export const resetProfile = () => profile.reset();
