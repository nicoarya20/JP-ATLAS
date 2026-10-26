/**
 * Two things every paged read of `/api/app/*` needs, kept apart from the reads themselves so the
 * list family and the single-cursor reads can share them without importing each other.
 *
 * The server pages by keyset: a page carries `nextCursor`, and `null` means it was the last one. A
 * cursor it will not take (`BAD_CURSOR`, which it answers after a sort or filter change) is not an
 * error to show — its own message is "Muat ulang daftar dari awal", so that is what happens, once,
 * without the screen hearing about it.
 */
import { isApiError } from '@/api/errors';

import { type Resource, resource } from './resource';

/** A keyset page of anything. */
export type Page<T> = { items: T[]; nextCursor: string | null };

/**
 * Waits out a load already in flight.
 *
 * `reload()` joins a request that is already out rather than starting a second one (rule 1 of
 * `docs/phase2-pola-data.md`), so a caller that first records what the *next* load should do would
 * have that intent read by nobody, and left behind for a later load to misread. Waiting until the
 * resource settles makes the load this caller starts the one that reads its intent.
 */
export async function settled(r: Resource<unknown>): Promise<void> {
  while (r.peek().phase === 'loading') await r.reload();
}

/** Whether a failure is the server refusing a cursor, which it answers by asking for a fresh start. */
export const isBadCursor = (cause: unknown): boolean =>
  isApiError(cause) && cause.code === 'BAD_CURSOR';

export type Paged<P> = Resource<P> & {
  /** Fetch the next page and append it; a no-op on the last page. */
  more: () => Promise<void>;
};

/**
 * A resource over one keyset-paged endpoint. `fetchPage(cursor)` does one request; the resource
 * keeps the pages it has as one `items` list.
 */
export function paged<T, P extends Page<T>>(
  name: string,
  fetchPage: (cursor: string | null) => Promise<P>,
): Paged<P> {
  let items: T[] = [];
  /** The cursor the next load continues from; null = start again from the first page. */
  let from: string | null = null;

  const self: Paged<P> = {
    ...resource<P>(name, async () => {
      // `forget()` (sign out, tests) empties the store but cannot reach the pages held here, so
      // they go whenever the store has nothing: otherwise a cursor that outlived a sign out would
      // append the next session's rows to the last one's.
      const held = self.peek().data !== null;
      const cursor = held ? from : null;
      if (!held) items = [];
      from = null;
      let page: P;
      try {
        page = await fetchPage(cursor);
      } catch (cause) {
        if (!cursor || !isBadCursor(cause)) throw cause;
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
  };
  return self;
}
