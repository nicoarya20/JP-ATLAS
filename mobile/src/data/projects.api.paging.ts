/**
 * Paging for the two paged reads of this module, on top of `resource()` and without changing it.
 *
 * `resource()` holds one value and its `load` takes no argument, so a page has to be remembered
 * beside it. The Tasks module solved the same thing per module (`tasks.api.paging.ts`); this is the
 * same approach for the shapes the project routes use — **offset** for the project list
 * (`{ items, total, page, limit }`) and **keyset** for the activity feed (`{ items, nextCursor }`).
 * It is a copy of the approach, not of the file: the two modules must not share a store, and the
 * shared foundation stays frozen this wave on purpose.
 *
 * The one rule worth restating, because the Tasks worker found it the hard way: the intent recorded
 * for the *next* load must never survive that load. `reload()` joins a request already in flight
 * (rule 1 of `docs/phase2-pola-data.md`), so an intent written while one is out would be read by
 * nobody and then misread by a later load — typically the refetch of an `invalidate()`, which would
 * then keep stale rows instead of starting over. So the intent is cleared the moment a load reads
 * it, and a load that finds none starts from the first page. A lost intent therefore costs one
 * re-fetch of the first page; it can never keep the wrong rows on screen.
 */
import { type Resource, resource } from './resource';

/** An offset page of anything, as the project list route answers it. */
export type OffsetPage<T> = { items: T[]; total: number; page: number; limit: number };

/** A keyset page of anything; `nextCursor` null means that was the last one. */
export type CursorPage<T> = { items: T[]; nextCursor: string | null };

export type Paged<P> = Resource<P> & {
  /** Fetch the next page and append it; a no-op when there is none, or none loaded yet. */
  more: () => Promise<void>;
  /** The server has another page to give. */
  hasMore: () => boolean;
};

/** Waits out a load already in flight, so the load this caller starts is the one that reads it. */
async function settled(r: Resource<unknown>): Promise<void> {
  while (r.peek().phase === 'loading') await r.reload();
}

/**
 * A resource over one offset-paged endpoint. `fetchPage(page)` is 1-based; the resource keeps the
 * pages it has as one `items` list and reports the server's `total` untouched.
 */
export function offsetPaged<T, P extends OffsetPage<T>>(
  name: string,
  fetchPage: (page: number) => Promise<P>,
): Paged<P> {
  let items: T[] = [];
  /** The page to fetch and append next; null = start again from the first page. */
  let want: number | null = null;

  const self: Paged<P> = {
    ...resource<P>(name, async () => {
      // `forget()` (sign out, tests) empties the store but cannot reach the items held here, so
      // they go whenever the store has nothing: rows of the last session must not be appended to.
      const held = self.peek().data !== null;
      const page = held ? (want ?? 1) : 1;
      if (!held) items = [];
      want = null;
      const answer = await fetchPage(page);
      items = page > 1 ? [...items, ...answer.items] : answer.items;
      return { ...answer, items };
    }),
    more: async () => {
      await settled(self);
      const data = self.current();
      if (!data || !self.hasMore()) return;
      want = data.page + 1;
      await self.reload();
    },
    hasMore: () => {
      const data = self.current();
      return !!data && data.items.length < data.total;
    },
  };
  return self;
}

/**
 * A resource over one keyset-paged endpoint. A cursor the server refuses is not an error to show —
 * it only means the list has to start over — so that is what happens, once, and the screen is not
 * told. The project activity route answers a forged cursor with `422 VALIDATION`, so that code
 * counts as a refusal here the way `BAD_CURSOR` does elsewhere.
 */
export function cursorPaged<T, P extends CursorPage<T>>(
  name: string,
  fetchPage: (cursor: string | null) => Promise<P>,
  isRefusedCursor: (cause: unknown) => boolean,
): Paged<P> {
  let items: T[] = [];
  /** The cursor the next load continues from; null = start again from the first page. */
  let from: string | null = null;

  const self: Paged<P> = {
    ...resource<P>(name, async () => {
      const held = self.peek().data !== null;
      const cursor = held ? from : null;
      if (!held) items = [];
      from = null;
      let page: P;
      try {
        page = await fetchPage(cursor);
      } catch (cause) {
        if (!cursor || !isRefusedCursor(cause)) throw cause;
        page = await fetchPage(null);
        items = page.items;
        return { ...page, items };
      }
      items = cursor ? [...items, ...page.items] : page.items;
      return { ...page, items };
    }),
    more: async () => {
      await settled(self);
      const next = self.current()?.nextCursor;
      if (!next) return;
      from = next;
      await self.reload();
    },
    hasMore: () => self.current()?.nextCursor != null,
  };
  return self;
}
