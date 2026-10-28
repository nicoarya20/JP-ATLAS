import { findEntry, listEntries, removeEntry, resetArchive } from '../../src/data/archive.store';
import {
  archiveEvent,
  canRestoreEvent,
  confirmOutcomes,
  eventsStore,
  findEvent,
  forgetArchivedEvent,
  resetEvents,
  restoreEvent,
} from '../../src/data/events.store';
import { getTask, resetTasks } from '../../src/data/tasks.store';

// Port of the prototype's events.store.test.js, on ISO dates.

afterEach(() => {
  resetEvents();
  resetTasks();
  resetArchive();
});

const ids = () => eventsStore.get().list.map((e) => e.id);

describe('events store', () => {
  test('archives an event out of the list and restores it to its place', () => {
    const at = ids().indexOf('sinar');
    const key = archiveEvent('sinar', 'Nico');
    expect(key).toBe('event-sinar');
    expect(ids()).not.toContain('sinar');
    expect(findEvent('sinar')?.title).toBe('Progress presentation to PT Sinar');
    expect(listEntries()[0]).toMatchObject({
      key,
      kind: 'EVENT',
      title: 'Progress presentation to PT Sinar',
      where: 'Atlas Project',
      by: 'Nico',
      date: '2026-10-07',
      ref: 'sinar',
    });
    restoreEvent('sinar');
    expect(ids().indexOf('sinar')).toBe(at);
    expect(findEntry(key)).toBeUndefined();
  });

  test('archives one occurrence of a recurring event: the series moves on and Undo puts it back', () => {
    const key = archiveEvent('sprint', 'Nico', { once: true });
    expect(findEvent('sprint')?.date).toBe('2026-10-23');
    expect(findEvent('sprint')).not.toHaveProperty('canceled');
    expect(findEntry(key)?.title).toBe('Atlas sprint review · Fri, Oct 9');
    expect(ids()).toContain('sprint');
    const next = archiveEvent('sprint', 'Nico', { once: true });
    expect(findEvent('sprint')?.date).toBe('2026-11-06');
    restoreEvent('sprint');
    expect(findEvent('sprint')?.date).toBe('2026-10-23');
    expect(findEntry(next)).toBeUndefined();
    restoreEvent('sprint');
    expect(findEvent('sprint')?.date).toBe('2026-10-09');
    expect(findEntry(key)).toBeUndefined();
  });

  test('once on a one-off event archives the whole event', () => {
    archiveEvent('review', 'Rina', { once: true });
    expect(ids()).not.toContain('review');
    expect(eventsStore.get().archived.map((e) => e.id)).toEqual(['review']);
  });

  test('confirms outcomes as To do tasks in the event’s project and marks the event Done', () => {
    const nos = confirmOutcomes(
      'daily',
      [{ title: 'Fix login', who: 'Rina', due: '2026-10-09' }],
      'Nico',
    );
    expect(getTask(nos[0] ?? 0)).toMatchObject({
      title: 'Fix login',
      who: 'Rina',
      due: '2026-10-09',
      status: 'To do',
      project: 'Atlas Project',
    });
    expect(findEvent('daily')).toMatchObject({
      status: 'Done',
      outcomes: { tasks: nos, by: 'Nico', date: '2026-10-07' },
    });
  });

  test('refuses outcomes while a draft has no due date, creating nothing', () => {
    const drafts = [
      { title: 'Fix the login page before Friday', who: 'Rina', due: '2026-10-09' },
      { title: 'Prepare test data once SSO is fixed', who: 'Dodi', due: '' },
    ];
    expect(() => confirmOutcomes('daily', drafts, 'Nico')).toThrow(
      'Cannot confirm the outcomes of event "daily": "Prepare test data once SSO is fixed" has no due date',
    );
    expect(findEvent('daily')).not.toHaveProperty('outcomes');
    expect(getTask(22)).toBeUndefined();
  });

  test('Delete forever of an archived event: it is gone and its Undo throws', () => {
    const key = archiveEvent('sinar', 'Nico');
    forgetArchivedEvent(key);
    removeEntry(key);
    expect(findEvent('sinar')).toBeUndefined();
    expect(() => restoreEvent('sinar')).toThrow('Cannot restore event "sinar": not in Archive');
  });

  test('Delete forever of an occurrence keeps the series and the older moves', () => {
    const first = archiveEvent('sprint', 'Nico', { once: true });
    const second = archiveEvent('sprint', 'Nico', { once: true });
    forgetArchivedEvent(second);
    removeEntry(second);
    expect(findEvent('sprint')?.date).toBe('2026-11-06');
    restoreEvent('sprint');
    expect(findEvent('sprint')?.date).toBe('2026-10-09');
    expect(findEntry(first)).toBeUndefined();
    expect(() => restoreEvent('sprint')).toThrow('not in Archive');
  });

  test('Undo bound to its archive key: a deleted move is not undone through an older one', () => {
    const first = archiveEvent('sprint', 'Nico', { once: true });
    const second = archiveEvent('sprint', 'Nico', { once: true });
    expect(canRestoreEvent('sprint', first)).toBe(false);
    expect(canRestoreEvent('sprint', second)).toBe(true);
    forgetArchivedEvent(second);
    removeEntry(second);
    expect(canRestoreEvent('sprint', second)).toBe(false);
    expect(() => restoreEvent('sprint', second)).toThrow(
      `Cannot restore event "sprint" (archive entry "${second}"): not in Archive`,
    );
    expect(findEvent('sprint')?.date).toBe('2026-11-06');
    expect(canRestoreEvent('sprint', first)).toBe(true);
    restoreEvent('sprint', first);
    expect(findEvent('sprint')?.date).toBe('2026-10-09');
  });

  test('forgetting a key the store does not hold (a sample entry) changes nothing', () => {
    const before = eventsStore.get();
    forgetArchivedEvent('event-test-meeting');
    expect(eventsStore.get()).toBe(before);
  });

  test('refuses to change events that are not there', () => {
    expect(() => archiveEvent('nope', 'Nico')).toThrow('Cannot archive event "nope"');
    expect(() => restoreEvent('review')).toThrow('not in Archive');
    expect(() => confirmOutcomes('nope', [], 'Nico')).toThrow('no such event');
  });

  test('reset brings back the sample events', () => {
    archiveEvent('party', 'Ayu');
    resetEvents();
    expect(ids()).toEqual(['kickoff', 'review', 'daily', 'sinar', 'sprint', 'rehearsal', 'party']);
    expect(eventsStore.get().archived).toEqual([]);
  });
});
