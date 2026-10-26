/**
 * The one way a data module gets something from `/api/app/*`, puts it in a store, and marks the
 * other stores stale after a write. Every Phase 2 module uses this; the rules and the reasons are
 * in `mobile/docs/phase2-pola-data.md`.
 *
 * Why it is shaped like this: `get<Module>()` stays **synchronous** (the user's decision, 26 Oct
 * 2026). A fetch layer fills the stores and the screens keep reading them through
 * `useStore`/`useSyncExternalStore`, so loading lives in one place instead of in six dialects. Two
 * facts about Expo Router make the rest follow, both measured with a probe on the real router
 * (see the Gelombang 0 handover):
 *
 * 1. A screen's `useEffect(…, [])` runs once per *mounted instance*, and pushing the same route
 *    twice makes two instances. So asking for data must be idempotent: `ensure()` fetches only
 *    when what is on hand is missing or stale, and a second caller joins the request in flight
 *    instead of starting another.
 * 2. Nothing unmounts when you navigate away — the screen you left stays mounted and keeps its
 *    subscription — so a store that is not invalidated keeps showing the old value on *every*
 *    screen that is still alive, not just the one in front. That is the risk the user accepted
 *    knowingly in exchange for synchronous reads, and `invalidate()` is the whole of the price:
 *    after a successful write, every resource the write could have changed must be named.
 *    The same fact means sign out has to clear all of them, since no screen will unmount and
 *    refetch on its own (`forgetAllResources`).
 */
import { ApiError, CLIENT_CODES, isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

import { createStore, type Store, useStore } from './store';

/**
 * - `empty` — never asked for.
 * - `loading` — a request is out; `data` is whatever was there before, so the screen need not blink.
 * - `ready` — `data` is from the server.
 * - `failed` — the last attempt failed; `data` may still hold what was shown before it.
 */
export type ResourcePhase = 'empty' | 'loading' | 'ready' | 'failed';

export type ResourceState<T> = {
  phase: ResourcePhase;
  data: T | null;
  error: ApiError | null;
  /** The data on hand is known to be out of date (a write touched it); a refetch is on its way. */
  stale: boolean;
};

export type Resource<T> = {
  /** For error messages and the debug list; unique per resource. */
  readonly name: string;
  /** The state now, outside a component. */
  peek: () => ResourceState<T>;
  /** The state in a component, re-rendering when it changes. */
  use: () => ResourceState<T>;
  /** The data now, or null — what a synchronous `get<Module>()` reads. */
  current: () => T | null;
  /** Fetch unless fresh data is already there; safe to call from every screen, every mount. */
  ensure: () => Promise<ResourceState<T>>;
  /** Fetch now regardless (pull to refresh, "Try again"). */
  reload: () => Promise<ResourceState<T>>;
  /** Mark stale after a write, and refetch in the background if a screen is showing it. */
  invalidate: () => void;
  /** Drop everything (sign out, tests): back to `empty`. */
  forget: () => void;
};

const EMPTY = { phase: 'empty', data: null, error: null, stale: false } as const;

const unexpected = (name: string, cause: unknown): ApiError =>
  new ApiError({
    message: `Could not read ${name}.`,
    code: CLIENT_CODES.BAD_RESPONSE,
    status: 0,
    cause,
  });

// Every resource ever built, so sign out can clear them all without each module registering itself.
const all = new Set<Resource<unknown>>();

/**
 * A single thing the app reads from the API. `load` does the request and returns the shape the
 * screens want; everything about when to call it is here.
 */
export function resource<T>(name: string, load: () => Promise<T>): Resource<T> {
  const store: Store<ResourceState<T>> = createStore<ResourceState<T>>(EMPTY);
  let inFlight: Promise<ResourceState<T>> | null = null;

  const run = (): Promise<ResourceState<T>> => {
    if (inFlight) return inFlight;
    store.set((prev) => ({ ...prev, phase: 'loading', error: null }));
    inFlight = load()
      .then((data) => {
        const next: ResourceState<T> = { phase: 'ready', data, error: null, stale: false };
        store.set(next);
        return next;
      })
      .catch((cause) => {
        // The session is the server's to decide: a withdrawn approval, or a session that ended,
        // reaches the gate here instead of waiting for the app to be reopened.
        const error = isApiError(cause) ? cause : unexpected(name, cause);
        if (isApiError(cause)) applyApiError(cause);
        const next: ResourceState<T> = {
          phase: 'failed',
          data: store.get().data,
          error,
          stale: store.get().stale,
        };
        store.set(next);
        return next;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  const self: Resource<T> = {
    name,
    peek: store.get,
    use: () => useStore(store),
    current: () => store.get().data,
    ensure: () => {
      const state = store.get();
      // Rule 1: fresh data is not fetched again, however many screens ask for it.
      if (state.phase === 'ready' && !state.stale) return Promise.resolve(state);
      return run();
    },
    reload: run,
    invalidate: () => {
      const state = store.get();
      if (state.phase === 'empty') return; // nobody has it; the first ensure() will fetch it
      store.set({ ...state, stale: true });
      // Rule 2: the screens showing this never unmount, so nothing else would ever refetch it.
      void run();
    },
    forget: () => {
      inFlight = null;
      store.set(EMPTY);
    },
  };

  all.add(self as Resource<unknown>);
  return self;
}

/** Mark every resource a successful write could have changed. The only place staleness is decided. */
export const invalidateAll = (resources: readonly Resource<unknown>[]): void => {
  for (const r of resources) r.invalidate();
};

/**
 * Runs a write and, only when it succeeds, invalidates what it could have changed. A failed write
 * leaves the stores alone: nothing changed server-side, so nothing on screen is out of date.
 */
export async function write<T>(
  run: () => Promise<T>,
  invalidates: readonly Resource<unknown>[],
): Promise<T> {
  const result = await run();
  invalidateAll(invalidates);
  return result;
}

/** Everything the app has loaded, dropped. Call on sign out: no screen unmounts by itself. */
export const forgetAllResources = (): void => {
  for (const r of all) r.forget();
};

/** The resources built so far, for the sign-out test and for debugging. test-only */
export const knownResources = (): Resource<unknown>[] => [...all];
