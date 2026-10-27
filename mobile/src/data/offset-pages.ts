/**
 * One paged read of an **offset** list of `/api/app/*`, for the two lists this module family shows:
 * the Team (`?limit&offset`, `{ people, total, summary }`) and the Trash (`?page&limit&kind`,
 * `{ items, total, counts }`). Both are small bounded lists that carry a total, which is why the
 * server pages them by offset rather than by cursor (`server/api/app-common.ts`).
 *
 * Why it lives here and not in `resource.ts`: `resource()` holds one value and its `load` takes no
 * argument, so paging has no place in it. That limitation is known and deliberately **frozen** for
 * this wave — three modules are being written on the same foundation at once, and a one-sided fix
 * would leave them disagreeing. So this follows the approach the Tasks lists already proved
 * (`tasks.api.paging.ts`): a per-module layer over `resource()` that remembers where the next slice
 * starts. When the foundation is fixed once, after this wave, this file and that one are the
 * evidence for what the fix has to cover — offset as well as keyset.
 *
 * What the caller gets is the rows fetched so far as one list, so a screen reading the store
 * synchronously never has to know how many requests it took.
 */
import { type Resource, resource } from './resource';

/** One slice as the caller reads it out of the response body. */
export type Slice<T, X> = {
  rows: readonly T[];
  /** How many rows match on the server — not how many are on hand. */
  total: number;
  /** The rest of the answer (a summary, per-kind counts): always the newest the server sent. */
  extra: X;
};

/** Every row fetched so far, plus what the last answer said about the whole list. */
export type Slices<T, X> = {
  rows: readonly T[];
  total: number;
  extra: X;
};

export type OffsetPaged<T, X> = Resource<Slices<T, X>> & {
  /** Fetch the next slice and append it; a no-op once every matching row is on hand. */
  more: () => Promise<void>;
  /** Whether the server has matching rows this app has not asked for yet. */
  hasMore: () => boolean;
};

/**
 * Waits out a load already in flight.
 *
 * `reload()` joins a request that is already out rather than starting a second one (rule 1 of
 * `docs/phase2-pola-data.md`), so a caller that first records which slice to fetch next would have
 * that intent read by nobody. Waiting until the resource settles makes the load this caller starts
 * the one that reads its intent.
 */
async function settled(r: Resource<unknown>): Promise<void> {
  while (r.peek().phase === 'loading') await r.reload();
}

/**
 * A resource over one offset-paged endpoint. `fetchSlice(offset, limit)` does one request and
 * reports the rows it carried, the server's total and whatever else the body said.
 */
export function offsetPaged<T, X>(
  name: string,
  limit: number,
  fetchSlice: (offset: number, limit: number) => Promise<Slice<T, X>>,
): OffsetPaged<T, X> {
  let held: T[] = [];
  /** Where the next load starts; 0 = begin again from the first slice. */
  let from = 0;

  const self: OffsetPaged<T, X> = {
    ...resource<Slices<T, X>>(name, async () => {
      // `forget()` (sign out, tests) empties the store but cannot reach the rows held here, so they
      // go whenever the store has nothing: a rows list that outlived a sign out would otherwise
      // show the previous account's teammates above the new one's.
      const kept = self.peek().data !== null;
      const offset = kept ? from : 0;
      if (!kept) held = [];
      from = 0;
      const slice = await fetchSlice(offset, limit);
      held = offset === 0 ? [...slice.rows] : [...held, ...slice.rows];
      return { rows: held, total: slice.total, extra: slice.extra };
    }),
    more: async () => {
      await settled(self);
      const data = self.current();
      if (!data || data.rows.length >= data.total) return;
      from = data.rows.length;
      await self.reload();
    },
    hasMore: () => {
      const data = self.current();
      return data !== null && data.rows.length < data.total;
    },
  };
  return self;
}
