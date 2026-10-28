/**
 * `GET /api/app/trash` (map `phase2-map-profile-archive.md` §4, pattern `phase2-pola-data.md`): the Trash, one kind
 * or all, a page at a time. It pages like the Projects list (`projects.api.ts`, `resource.ts` untouched): the resource
 * holds every page loaded so far; `load()` either appends the next page (`more`) or reloads page one at the size on
 * screen. The server pages by `page` + `limit`, so rows are de-duplicated by kind and id in case the Trash moved.
 */
import { apiGet } from '@/api/client';
import { sessionStore } from '@/session/session.state';

import { type Resource, type ResourceState, resource } from './resource';
import type { TrashCountsWire, TrashFilterWire, TrashItemWire, TrashPageWire } from './trash.wire';

export const TRASH_PAGE = 25;
/** The server clamps `limit` to 100 (`PAGE_LIMIT_MAX`). */
export const TRASH_PAGE_MAX = 100;

export type TrashData = {
  items: TrashItemWire[];
  total: number;
  counts: TrashCountsWire;
  filter: TrashFilterWire;
};

/** One row's key, also the `[key]` of the Delete forever route: "task-<id>". */
export const trashKey = (item: Pick<TrashItemWire, 'kind' | 'id'>) => `${item.kind}-${item.id}`;

let filter: TrashFilterWire = 'all';
let more = false;

const page = (f: TrashFilterWire, n: number, limit: number) =>
  apiGet<TrashPageWire>(`/api/app/trash?kind=${f}&page=${n}&limit=${limit}`);

const shape = (answer: TrashPageWire, f: TrashFilterWire): TrashData => ({
  items: answer.items,
  total: answer.total,
  counts: answer.counts,
  filter: f,
});

/** Page one, at the size on screen for the same filter, asked again while the filter keeps changing. */
async function firstPage(had: TrashData | null): Promise<TrashData> {
  for (;;) {
    const asOf = filter;
    const shown = had?.filter === asOf ? had.items.length : 0;
    const limit = Math.min(TRASH_PAGE_MAX, Math.max(TRASH_PAGE, shown));
    const answer = await page(asOf, 1, limit);
    if (asOf === filter) return shape(answer, asOf);
  }
}

/** The page that starts right after the `shown` rows: page n of 25, or page 2 of `shown` after a resized refresh. */
const nextAt = (shown: number) =>
  shown % TRASH_PAGE === 0
    ? { n: shown / TRASH_PAGE + 1, limit: TRASH_PAGE }
    : { n: 2, limit: shown };

async function loadTrash(): Promise<TrashData> {
  const asked = more;
  more = false;
  const had = trashResource.current();
  const asOf = filter;
  const shown = had?.items.length ?? 0;
  if (asked && had?.filter === asOf && shown < had.total && shown <= TRASH_PAGE_MAX) {
    const at = nextAt(shown);
    const next = await page(asOf, at.n, at.limit);
    if (asOf === filter) {
      const seen = new Set(had.items.map(trashKey));
      const fresh = next.items.filter((i) => !seen.has(trashKey(i)));
      return { ...shape(next, asOf), items: [...had.items, ...fresh] };
    }
  }
  return firstPage(had);
}

export const trashResource: Resource<TrashData> = resource<TrashData>('trash', loadTrash);

/** The kind the Trash is showing now. */
export const getTrashFilter = (): TrashFilterWire => filter;

/** Show one kind (or all) and reload from page one. */
export function setTrashFilter(next: TrashFilterWire): Promise<ResourceState<TrashData>> {
  filter = next;
  return trashResource.reload();
}

/** The next page, appended; nothing while a request is out or when every row is on screen. */
export function loadMoreTrash(): Promise<ResourceState<TrashData>> {
  const state = trashResource.peek();
  const data = state.data;
  if (state.phase === 'loading' || !data || data.items.length >= data.total) {
    return Promise.resolve(state);
  }
  more = true;
  return trashResource.reload();
}

/** The loaded row `key` ("task-<id>"), if it is on a page already read. */
export const findTrashItem = (key: string): TrashItemWire | undefined =>
  trashResource.current()?.items.find((i) => trashKey(i) === key);

/** Back to all kinds. test-only */
export function resetTrashFilter(): void {
  filter = 'all';
  more = false;
}

// The next account starts on all kinds, like it starts with no data (`forgetAllResources`).
sessionStore.subscribe(() => {
  if (sessionStore.get().status === 'signed-out') resetTrashFilter();
});
