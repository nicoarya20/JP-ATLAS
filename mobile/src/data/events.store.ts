// Sample events (Phase 1), kept for what is not on the server yet: the hidden record / outcomes / results flow (E-1;
// Step 3 › Create tasks confirms its outcomes as tasks) and the profile calendar. The Events tab itself reads
// `/api/app/events` (events.api.ts) and writes through events.write.ts; the Trash is the server's (trash.api.ts).

import { today } from './clock';
import { type EventItem, eventProject } from './events.shared';
import { EVENTS, type SampleEvent } from './sample';
import { type DraftTask, EVENT_EXTRA } from './sample/events.extra';
import { createStore, useStore } from './store';
import { addTask } from './tasks.store';

export type EventsState = {
  /** Listed events, in date order. */
  list: readonly EventItem[];
};

function fromSample({ canceled, ...e }: SampleEvent): EventItem {
  const extra = EVENT_EXTRA[e.id];
  if (!extra) throw new Error(`Sample event "${e.id}" has no entry in sample/events.extra.ts`);
  if (canceled) throw new Error(`Sample event "${e.id}" is canceled without a reason or canceler`);
  return { ...e, ...extra };
}

const INITIAL: EventsState = { list: EVENTS.map(fromSample) };

export const eventsStore = createStore<EventsState>(INITIAL);

/** Sample event id. */
export function findEvent(id: string, s: EventsState = eventsStore.get()): EventItem | undefined {
  return s.list.find((e) => e.id === id);
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
  eventsStore.set((s) => ({ ...s, list: s.list.map((x) => (x.id === id ? done : x)) }));
  return tasks;
}

/** Every event back to the sample. test-only */
export function resetEvents(): void {
  eventsStore.reset();
}

/** Event state in a component, re-rendered after every change. */
export const useEventsState = () => useStore(eventsStore);
