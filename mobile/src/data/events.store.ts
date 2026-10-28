// Sample events (Phase 1), kept for what is not on the server yet: the hidden record / outcomes / results flow (E-1;
// Step 3 › Create tasks confirms its outcomes as tasks), the profile calendar, and Archive's sample event entries
// (archive / restore / forget). The Events tab itself reads `/api/app/events` (events.api.ts) and writes through
// events.write.ts.

import { addEntry, removeEntry } from './archive.store';
import { today } from './clock';
import { addDays, dateLabel } from './events.dates';
import { type EventItem, eventProject, REPEAT_DAYS } from './events.shared';
import { EVENTS, type SampleEvent } from './sample';
import { type DraftTask, EVENT_EXTRA } from './sample/events.extra';
import { createStore, useStore } from './store';
import { addTask } from './tasks.store';

/** An event (or one occurrence of it) in Archive: its entry key, and the date an archived occurrence had. */
type Taken = { key: string; id: string; from?: string };

export type EventsState = {
  /** Listed events, in date order. */
  list: readonly EventItem[];
  /** Events moved to Archive as a whole: out of the list and calendar, still found by id. */
  archived: readonly EventItem[];
  /** Archive moves Undo can take back, newest first. */
  taken: readonly Taken[];
};

function fromSample({ canceled, ...e }: SampleEvent): EventItem {
  const extra = EVENT_EXTRA[e.id];
  if (!extra) throw new Error(`Sample event "${e.id}" has no entry in sample/events.extra.ts`);
  if (canceled) throw new Error(`Sample event "${e.id}" is canceled without a reason or canceler`);
  return { ...e, ...extra };
}

const INITIAL: EventsState = { list: EVENTS.map(fromSample), archived: [], taken: [] };

export const eventsStore = createStore<EventsState>(INITIAL);

/** Event id, listed or archived. */
export function findEvent(id: string, s: EventsState = eventsStore.get()): EventItem | undefined {
  return s.list.find((e) => e.id === id) ?? s.archived.find((e) => e.id === id);
}

/** e put after the last event on or before its date, so the list groups stay in date order. */
function insert(list: readonly EventItem[], e: EventItem): EventItem[] {
  let at = list.length - 1;
  while (at >= 0 && (list[at] as EventItem).date > e.date) at -= 1;
  return [...list.slice(0, at + 1), e, ...list.slice(at + 1)];
}

/** Listed event id, or throw saying what could not be done to it. */
function listed(id: string, action: string): EventItem {
  const e = eventsStore.get().list.find((x) => x.id === id);
  if (!e) throw new Error(`Cannot ${action} event "${id}": not in the event list`);
  return e;
}

const without = (list: readonly EventItem[], id: string) => list.filter((e) => e.id !== id);

/**
 * Move event id to Archive. once (recurring only) archives just this occurrence: the series moves on to the next
 * date, and Archive lists the occurrence with the date it had. Returns the Archive entry key.
 */
export function archiveEvent(id: string, by: string, { once = false } = {}): string {
  const e = listed(id, 'archive');
  const entry = { kind: 'EVENT' as const, where: eventProject(e), by, date: today() };
  const s = eventsStore.get();
  if (once && e.repeat) {
    const from = e.date;
    const { canceled: _, ...rest } = e;
    const moved = { ...rest, date: addDays(from, REPEAT_DAYS[e.repeat]) };
    const { key } = addEntry({
      ...entry,
      title: `${e.title} · ${dateLabel(from)}`,
      ref: `${id}-${from}`,
    });
    eventsStore.set({
      ...s,
      list: insert(without(s.list, id), moved),
      taken: [{ key, id, from }, ...s.taken],
    });
    return key;
  }
  const { key } = addEntry({ ...entry, title: e.title, ref: id });
  eventsStore.set({
    ...s,
    list: without(s.list, id),
    archived: [...s.archived, e],
    taken: [{ key, id }, ...s.taken],
  });
  return key;
}

/** The latest archive move of event id still held, and when `key` is given only if it is that move. */
function latestMove(s: EventsState, id: string, key?: string) {
  const t = s.taken.find((x) => x.id === id);
  return t && (key === undefined || t.key === key) ? t : undefined;
}

/**
 * True while archive move `key` of event id can be undone: Delete forever in Archive ends it, and so does a later move
 * of the same event. The snack's Undo checks this, so it never restores an older move in place of its own.
 */
export const canRestoreEvent = (id: string, key: string) =>
  !!latestMove(eventsStore.get(), id, key);

/**
 * Undo of the latest archive move of event id (only if it is move `key`, when given): back in the list (an archived
 * occurrence puts the series back on its date).
 */
export function restoreEvent(id: string, key?: string): void {
  const s = eventsStore.get();
  const t = latestMove(s, id, key);
  if (!t) {
    const which = key ? ` (archive entry "${key}")` : '';
    throw new Error(`Cannot restore event "${id}"${which}: not in Archive`);
  }
  const e = s.archived.find((x) => x.id === id) ?? listed(id, 'restore');
  removeEntry(t.key);
  const back = t.from ? { ...e, date: t.from } : e;
  eventsStore.set({
    ...s,
    list: insert(without(s.list, id), back),
    archived: without(s.archived, id),
    taken: s.taken.filter((x) => x !== t),
  });
}

/**
 * Step 3 › Create tasks for event id: each draft becomes a To do task in the event's project, the event is Done and its
 * outcomes confirmed by `by`. Every draft needs its due date (the screen keeps Create disabled until then). Returns the
 * new task numbers.
 */
export function confirmOutcomes(id: string, drafts: readonly DraftTask[], by: string): number[] {
  const e = findEvent(id);
  if (!e) throw new Error(`Cannot confirm the outcomes of event "${id}": no such event`);
  const missing = drafts.find((d) => !d.due);
  if (missing) {
    throw new Error(
      `Cannot confirm the outcomes of event "${id}": "${missing.title}" has no due date`,
    );
  }
  const project = eventProject(e);
  const desc = `From the meeting "${e.title}"`;
  const tasks = drafts.map((d) =>
    addTask(
      {
        title: d.title,
        project,
        who: d.who,
        due: d.due,
        priority: 'Medium',
        type: 'Task',
        tags: [],
      },
      { desc },
      by,
    ),
  );
  const done: EventItem = { ...e, status: 'Done', outcomes: { tasks, by, date: today() } };
  const swap = (list: readonly EventItem[]) => list.map((x) => (x.id === id ? done : x));
  eventsStore.set((s) => ({ ...s, list: swap(s.list), archived: swap(s.archived) }));
  return tasks;
}

/**
 * Archive › Delete forever of entry `key` (call before removeEntry): an event archived as a whole is gone for good, an
 * archived occurrence only loses its way back, the series stays listed. Undo of that move is no longer possible:
 * restoreEvent then throws "not in Archive" unless an older move of the same event is still held. A key this store does
 * not hold (the sample entries, which no list ever had) is left alone.
 */
export function forgetArchivedEvent(key: string): void {
  const s = eventsStore.get();
  const t = s.taken.find((x) => x.key === key);
  if (!t) return;
  eventsStore.set({
    ...s,
    archived: t.from ? s.archived : without(s.archived, t.id),
    taken: s.taken.filter((x) => x !== t),
  });
}

/** Every event back to the sample and the query to its default; Archive has its own resetArchive(). test-only */
export function resetEvents(): void {
  eventsStore.reset();
}

/** Event state in a component, re-rendered after every change. */
export const useEventsState = () => useStore(eventsStore);
