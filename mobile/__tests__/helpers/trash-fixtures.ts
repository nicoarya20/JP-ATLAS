// Trash answers as `GET /api/app/trash` and its writes send them (`server/api/app-trash.ts`). test-only
import type {
  TrashEventWire,
  TrashItemWire,
  TrashPageWire,
  TrashProjectWire,
  TrashTaskWire,
} from '@/data/trash.wire';

const timing = {
  deletedAt: '2026-10-06T03:00:00.000Z',
  restorableUntil: '2026-11-05',
  daysLeft: 12,
  deletedBy: { id: 'u-nico', name: 'Nico Arya' },
  can: { restore: true },
} as const;

export const project = (over: Partial<TrashProjectWire> = {}): TrashProjectWire => ({
  ...timing,
  kind: 'project',
  id: 'p-sinar',
  name: 'Sinar Website',
  cascade: { tasks: 8, events: 2 },
  ...over,
});

export const task = (over: Partial<TrashTaskWire> = {}): TrashTaskWire => ({
  ...timing,
  kind: 'task',
  id: 't-12',
  number: 12,
  title: 'Fix the login copy',
  project: { id: 'p-atlas', name: 'Atlas Project' },
  blockedBy: null,
  projectInTrash: false,
  ...over,
});

export const event = (over: Partial<TrashEventWire> = {}): TrashEventWire => ({
  ...timing,
  kind: 'event',
  id: 'e-3',
  title: 'Sprint review',
  eventKind: 'review',
  startsAt: '2026-10-09T07:00:00.000Z',
  project: null,
  blockedBy: null,
  projectInTrash: false,
  ...over,
});

/** A page; `counts` defaults to the kinds of `items`, as when every item is on it. */
export function trashPage(
  items: TrashItemWire[],
  over: Partial<Omit<TrashPageWire, 'items'>> = {},
): TrashPageWire {
  const count = (k: TrashItemWire['kind']) => items.filter((i) => i.kind === k).length;
  return {
    items,
    total: items.length,
    page: 1,
    limit: 25,
    counts: { project: count('project'), task: count('task'), event: count('event') },
    ...over,
  };
}

/** The query of a Trash request, as a record. */
export const trashQuery = (url: string) => Object.fromEntries(new URL(url).searchParams);
