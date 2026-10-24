// In-memory state for the sample data (prototype *.store.js), read by screens through useSyncExternalStore.
// Phase 2 swaps these stores for API calls behind the same get<Module>() functions.
import { useRef, useSyncExternalStore } from 'react';

/** A value that changes over time, with listeners. State is immutable: `set` takes a new value, never a mutated one. */
export type Store<T> = {
  /** Current state. */
  get: () => T;
  /** Replace the state (or derive it from the current one); listeners run only when it changed. */
  set: (next: T | ((prev: T) => T)) => void;
  /** Listen for changes; returns the unsubscribe function. */
  subscribe: (listener: () => void) => () => void;
  /** Back to the initial state (tests, sign out). */
  reset: () => void;
};

/** Create a store holding `initial`. */
export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  const write = (next: T) => {
    if (Object.is(next, state)) return;
    state = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    get: () => state,
    set: (next) => write(typeof next === 'function' ? (next as (prev: T) => T)(state) : next),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset: () => write(initial),
  };
}

const whole = <T>(state: T) => state;

/**
 * Read a store in a component and re-render when the selected value changes. `select` may build a new object or array:
 * its result is cached until the state or the `select` function itself changes.
 */
export function useStore<T, S = T>(store: Store<T>, select?: (state: T) => S): S {
  const pick = (select ?? whole) as (state: T) => S;
  const cache = useRef<{ state: T; pick: (state: T) => S; value: S } | null>(null);
  const snapshot = () => {
    const state = store.get();
    const hit = cache.current;
    if (hit && Object.is(hit.state, state) && hit.pick === pick) return hit.value;
    const value = pick(state);
    cache.current = { state, pick, value };
    return value;
  };
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
