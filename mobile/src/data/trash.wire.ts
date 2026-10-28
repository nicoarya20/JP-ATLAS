/**
 * What `GET /api/app/trash` and its writes answer (`server/api/app-trash.ts`; item shapes in
 * `server/{project/project-trash,task/task-trash,event/events.trash}.query.ts`). Dates are decided by the server:
 * `deletedAt` is an instant, `restorableUntil` a team-zone date, `daysLeft` whole days before the purge.
 */
import type { EventKindWire } from './events.wire';
import type { CapValueWire } from './tasks.wire';

export type TrashKindWire = 'project' | 'task' | 'event';
/** `?kind=`: one kind, or all three. */
export type TrashFilterWire = 'all' | TrashKindWire;

/** `true` acts, a deny code shows why (`EXPIRED`, `PROJECT_IN_TRASH`, `IMPERSONATING`), a missing key hides it. */
export type TrashCapsWire = Partial<Record<'restore' | 'purge', CapValueWire>>;

type PersonRef = { id: string; name: string };

type TrashTimingWire = {
  deletedAt: string;
  restorableUntil: string;
  /** 0 once the item can no longer be restored. */
  daysLeft: number;
  /** Null when the deleting account no longer exists. */
  deletedBy: PersonRef | null;
  can: TrashCapsWire;
};

/** The trashed project a task or event waits for; `visible` says the viewer can find it in the Trash too. */
export type TrashBlockedByWire = { projectId: string; name: string; visible: boolean };

export type TrashProjectWire = TrashTimingWire & {
  kind: 'project';
  id: string;
  name: string;
  /** What went to the Trash with it and comes back with it. */
  cascade: { tasks: number; events: number };
};

export type TrashTaskWire = TrashTimingWire & {
  kind: 'task';
  id: string;
  number: number;
  title: string;
  project: PersonRef;
  blockedBy: TrashBlockedByWire | null;
  projectInTrash: boolean;
};

export type TrashEventWire = TrashTimingWire & {
  kind: 'event';
  id: string;
  title: string;
  eventKind: EventKindWire;
  startsAt: string;
  /** Null for a personal event. */
  project: PersonRef | null;
  blockedBy: TrashBlockedByWire | null;
  projectInTrash: boolean;
};

export type TrashItemWire = TrashProjectWire | TrashTaskWire | TrashEventWire;

export type TrashCountsWire = Record<TrashKindWire, number>;

/** One page: `total` follows `?kind`, `counts` does not. */
export type TrashPageWire = {
  items: TrashItemWire[];
  total: number;
  page: number;
  limit: number;
  counts: TrashCountsWire;
};

/** `DELETE /trash/:kind/:id`: what went for good with it. */
export type TrashPurgeWire = {
  kind: TrashKindWire;
  id: string;
  purged: { projects: number; tasks: number; events: number };
};

/** `POST /trash/:kind/:id/restore`: a project brings its tasks back, a task keeps its number. */
export type TrashRestoreWire = { id: string; tasks?: number; number?: number };
