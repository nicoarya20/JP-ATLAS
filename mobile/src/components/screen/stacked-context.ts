// What a StackedScreen shares with its search block and pinned row: the pinned row's compaction progress, and where the
// search block's field registers so the header icon can focus it after scrolling the block back.
import { createContext, useContext } from 'react';
import { type SharedValue, useSharedValue } from 'react-native-reanimated';

/** 0 = the pinned row is tall, 1 = compact (prototype --stk-q). */
export const PinnedProgressContext = createContext<SharedValue<number> | null>(null);

/**
 * The pinned row's compaction (0..1), scrubbed by the scroll on the UI thread; a pinned child styles its compact form
 * from it, keeping every height it changes linear in it. Outside a StackedScreen it stays 0.
 */
export function usePinnedProgress(): SharedValue<number> {
  const own = useSharedValue(0);
  return useContext(PinnedProgressContext) ?? own;
}

/** The part of a text field the header icon needs. */
export type Focusable = { focus: () => void };

/** Registers the search block's text field (null on unmount). */
export type RegisterFind = (field: Focusable | null) => void;

export const FindFieldContext = createContext<RegisterFind | null>(null);

/** Called by SearchField: inside a StackedScreen's search block it becomes the field the header icon focuses. */
export const useRegisterFind = () => useContext(FindFieldContext);
