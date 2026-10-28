/**
 * A list `/api/app/tasks*` sends a page at a time (the task lists and board columns, a task's
 * timeline), kept as one resource holding every page loaded so far. The pattern is the Inbox's
 * (`inbox.api.ts`, resource.ts untouched): `wantMore()` then `reload()` appends the next page; any
 * other load (ensure, reload, the invalidate after a write) asks for page one again, as long as
 * what is on screen (TASKS_PAGE to TASKS_PAGE_MAX rows). A `BAD_CURSOR` while loading more starts
 * over from page one, as the server's own message asks.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';

import { type Resource, type ResourceState, resource } from './resource';

export const TASKS_PAGE = 25;
/** The server's `PAGE_LIMIT_MAX`; a refresh never asks for more than this in one request. */
export const TASKS_PAGE_MAX = 100;

/** What every paged route answers. */
export type PageWire<T> = { items: T[]; nextCursor: string | null };

export type Paged<P extends PageWire<unknown>> = { res: Resource<P>; wantMore: () => void };

const pageUrl = (base: string, limit: number, cursor?: string) =>
  `${base}${base.includes('?') ? '&' : '?'}limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;

/** The paged resource `name` reading `base` (a path, with or without its own query). */
export function pagedResource<P extends PageWire<unknown>>(name: string, base: string): Paged<P> {
  let more = false;
  let res: Resource<P>;
  const first = () => {
    const shown = res.current()?.items.length ?? 0;
    const limit = Math.min(TASKS_PAGE_MAX, Math.max(TASKS_PAGE, shown));
    return apiGet<P>(pageUrl(base, limit));
  };
  const load = async (): Promise<P> => {
    const asked = more;
    more = false;
    const had = res.current();
    if (!asked || !had?.nextCursor) return first();
    try {
      const next = await apiGet<P>(pageUrl(base, TASKS_PAGE, had.nextCursor));
      return { ...next, items: [...had.items, ...next.items] };
    } catch (e) {
      if (isApiError(e) && e.code === 'BAD_CURSOR') return first();
      throw e;
    }
  };
  res = resource<P>(name, load);
  return { res, wantMore: () => (more = true) };
}

/**
 * The next page, appended. Does nothing while a request is out (the button is busy then) or when
 * there is no next page; a failure keeps the rows that were there.
 */
export function loadMorePaged<P extends PageWire<unknown>>({
  res,
  wantMore,
}: Paged<P>): Promise<ResourceState<P>> {
  const state = res.peek();
  if (state.phase === 'loading' || !state.data?.nextCursor) return Promise.resolve(state);
  wantMore();
  return res.reload();
}
