/**
 * The Trash reads and writes of `/api/app/trash`: the merged list of trashed projects, tasks and
 * events (`?kind&page&limit`), the three restore routes, and the permanent delete.
 *
 * **The screen is called Archive and the server calls it Sampah, and the server's meaning wins.**
 * The prototype's Archive kept things until somebody restored them; the server keeps them for a
 * retention window and then a scheduler deletes them (`server/trash/trash.purge.ts`). So the two
 * dates it sends, `restorableUntil` and `daysLeft`, are not decoration: without them the screen
 * would promise a restore that stops working on a day nobody announced. They are used exactly as
 * they came — the retention is the server's arithmetic, in the team's zone, and recomputing it here
 * could only disagree with it.
 *
 * Permissions are the item's own `can{}` (`server/access/trash.policy.ts`), never a role test:
 * `restore` may be a deny code the button shows disabled with the reason, and `purge` is **absent**
 * for anyone who is not an Admin, which means the control is not drawn at all.
 */
import { apiDelete, apiGet, apiPost, isApiError } from '@/api';
import { applyApiError } from '@/session/session.state';
import { eventsListResource, eventsWindowResource } from './events.api';
import { homeResource } from './home.api';
import { type OffsetPaged, offsetPaged } from './offset-pages';
import { type Resource, write } from './resource';
import { taskCounts } from './tasks.api';
import { taskLists } from './tasks.api.lists';

/** `server/api/app-common.ts`: the page the server sends when no limit is asked for. */
export const TRASH_LIMIT = 25;

/** The three kinds a Trash row can be (`server/trash/trash.list.query.ts`). */
export const TRASH_KINDS = ['project', 'task', 'event'] as const;
export type TrashKind = (typeof TRASH_KINDS)[number];

/** What the list may be narrowed to; `all` is the server's default. */
export type TrashFilter = 'all' | TrashKind;

/** `true` = shown and enabled · a deny code = shown disabled with its reason · absent = hidden. */
export type CapValue = true | string;
export type TrashCapsWire = { restore?: CapValue; purge?: CapValue };

/** The trashed project a task or event waits for; `visible` says the caller can find it in the list. */
export type TrashBlockedByWire = { projectId: string; name: string; visible: boolean };

type TrashRowWire = {
  id: string;
  /** ISO instant of the delete. */
  deletedAt: string;
  /** Last calendar day (team zone) the item may still be restored. */
  restorableUntil: string;
  /** Whole days left before the purge; 0 once it can no longer be restored. */
  daysLeft: number;
  /** Id and name only; null when the deleting account no longer exists. */
  deletedBy: { id: string; name: string } | null;
  can: TrashCapsWire;
};

export type TrashProjectWire = TrashRowWire & {
  kind: 'project';
  name: string;
  /** What went to the Trash with the project and comes back with it. */
  cascade: { tasks: number; events: number };
};

export type TrashTaskWire = TrashRowWire & {
  kind: 'task';
  number: number;
  title: string;
  project: { id: string; name: string };
  blockedBy: TrashBlockedByWire | null;
  /** The project is in the Trash too, so a restore of this row alone answers 409. */
  projectInTrash: boolean;
};

export type TrashEventWire = TrashRowWire & {
  kind: 'event';
  title: string;
  eventKind: string;
  startsAt: string;
  /** Null for a personal event. */
  project: { id: string; name: string } | null;
  blockedBy: TrashBlockedByWire | null;
  projectInTrash: boolean;
};

export type TrashItemWire = TrashProjectWire | TrashTaskWire | TrashEventWire;

/** How many of each kind exist; always all three, whatever `?kind` narrowed the page to. */
export type TrashCountsWire = { project: number; task: number; event: number };

export type TrashListWire = {
  items: TrashItemWire[];
  /** Follows `?kind`, unlike `counts`. */
  total: number;
  page: number;
  limit: number;
  counts: TrashCountsWire;
};

export type TrashListResource = OffsetPaged<TrashItemWire, TrashCountsWire>;

const lists = new Map<TrashFilter, TrashListResource>();

/**
 * The Trash, narrowed to `filter` and paged. The server pages this one by `page`, not by `offset`,
 * so the offset is turned back into a page number; the limit is fixed, which makes that exact. A
 * `page` past the end is a valid empty page, not an error (`server/api/app-trash.ts`).
 */
export function trashList(filter: TrashFilter = 'all'): TrashListResource {
  const held = lists.get(filter);
  if (held) return held;
  const made = offsetPaged<TrashItemWire, TrashCountsWire>(
    `trash:${filter}`,
    TRASH_LIMIT,
    async (offset, limit) => {
      const params = new URLSearchParams({
        kind: filter,
        page: String(Math.floor(offset / limit) + 1),
        limit: String(limit),
      });
      const body = await apiGet<TrashListWire>(`/api/app/trash?${params.toString()}`);
      return { rows: body.items, total: body.total, extra: body.counts };
    },
  );
  lists.set(filter, made);
  return made;
}

/** Every Trash list that was ever asked for: a restore or a purge changes all of their counts. */
const allTrashLists = (): Resource<unknown>[] => [...lists.values()] as Resource<unknown>[];

/**
 * Everything a restore or a permanent delete can have made wrong.
 *
 * Wide on purpose (rule 2 of `docs/phase2-pola-data.md`): a restored project brings its tasks and
 * events back, so every list that was ever asked for can be wrong, not only the Trash.
 *
 * KNOWN GAP: the Projects lists are not named here, because the Projects module is being moved to
 * the API in the same wave and has no resource to name yet. **When these branches are merged, add
 * the project list resources to this array** — until then a restored project is in the Trash list
 * and gone from it correctly, while a Projects screen left mounted keeps its old rows.
 */
const touched = (): Resource<unknown>[] => [
  ...allTrashLists(),
  homeResource as Resource<unknown>,
  eventsListResource as Resource<unknown>,
  eventsWindowResource as Resource<unknown>,
  taskCounts as Resource<unknown>,
  ...(taskLists() as Resource<unknown>[]),
];

/**
 * Reports a failure to the session before rethrowing. Inside a `resource` this is automatic; a
 * write is outside one, so it is done here (`phase2-pola-data.md` rule 3).
 */
async function send<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    if (isApiError(cause)) applyApiError(cause);
    throw cause;
  }
}

/** What a restore answers, per kind; the project's `tasks` and the task's `number` feed the notice. */
export type RestoredWire = { id: string; tasks?: number; number?: number };

/**
 * Bring one item back. Whether it may come back is the server's call — retention, a trashed
 * project, impersonation — and the item's `can.restore` has already said so, so a refusal here is
 * worth putting on screen as it came.
 */
export const restoreTrashItem = (kind: TrashKind, id: string): Promise<RestoredWire> =>
  write(
    () =>
      send(() => apiPost<RestoredWire>(`/api/app/trash/${kind}/${encodeURIComponent(id)}/restore`)),
    touched(),
  );

/** What a permanent delete answers: how many rows went, counted as one run of the retention sweep. */
export type PurgedWire = {
  kind: TrashKind;
  id: string;
  purged: { projects: number; tasks: number; events: number };
};

/**
 * Delete one item for good. Admin and Super-admin only, which is exactly what the item's
 * `can.purge` already told this client — so no screen branches on a role to find the button.
 */
export const purgeTrashItem = (kind: TrashKind, id: string): Promise<PurgedWire> =>
  write(
    () => send(() => apiDelete<PurgedWire>(`/api/app/trash/${kind}/${encodeURIComponent(id)}`)),
    touched(),
  );

/** Drop the held lists. The stores themselves are cleared by `forgetAllResources`. test-only */
export const resetArchiveApi = (): void => lists.clear();
