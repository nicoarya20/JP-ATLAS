import { findEntry, listEntries, removeEntry, resetArchive } from '../../src/data/archive.store';
import { BASE_QUERY } from '../../src/data/events.query';
import {
  addEvent,
  archiveEvent,
  cancelEvent,
  confirmOutcomes,
  type EventFields,
  editEvent,
  eventsQueryStore,
  eventsStore,
  findEvent,
  forgetArchivedEvent,
  resetEvents,
  restoreEvent,
  setEventsQuery,
} from '../../src/data/events.store';
import { getTask, resetTasks } from '../../src/data/tasks.store';

// Port of the prototype's events.store.test.js, on ISO dates.

afterEach(() => {
  resetEvents();
  resetTasks();
  resetArchive();
});

const FORM: EventFields = {
  title: 'Retro',
  date: '2026-10-09',
  start: '11:00 AM',
  end: '12:00 PM',
  mode: 'In person',
  place: 'Room 3',
  attendees: ['Rina'],
  type: 'Meeting',
  project: 'sinar',
  agenda: ['Wins'],
  repeat: '',
};
const ids = () => eventsStore.get().list.map((e) => e.id);

describe('events store', () => {
  test('adds an event in date order with the creator first and a range across noon', () => {
    const id = addEvent(FORM, 'Nico');
    expect(id).toBe('new-1');
    expect(findEvent(id)).toMatchObject({
      status: 'Upcoming',
      creator: 'Nico',
      date: '2026-10-09',
      time: '11:00',
      range: '11:00 AM–12:00 PM',
      project: 'sinar',
      updated: '2026-10-07',
      attendees: ['Nico', 'Rina'],
    });
    expect(findEvent(id)).not.toHaveProperty('repeat');
    expect(ids().indexOf(id)).toBe(ids().indexOf('sprint') + 1);
    expect(addEvent(FORM, 'Rina')).toBe('new-2');
  });

  test('edits an event and moves it when its date changes', () => {
    const before = findEvent('review');
    editEvent(
      'review',
      { ...FORM, date: '2026-10-15', start: '2:00 PM', end: '3:00 PM', repeat: 'every week' },
      'Nico',
    );
    expect(findEvent('review')).toMatchObject({
      title: 'Retro',
      date: '2026-10-15',
      range: '2:00–3:00 PM',
      repeat: 'every week',
      editor: 'Nico',
      creator: 'Rina',
    });
    expect(ids().indexOf('review')).toBeGreaterThan(ids().indexOf('sprint'));
    expect(before?.title).toBe('Onboarding design review');
    editEvent('sprint', FORM, 'Nico');
    expect(findEvent('sprint')).not.toHaveProperty('repeat');
  });

  test('cancels an event, keeping it listed; once only counts for a recurring one', () => {
    cancelEvent('review', 'Room taken', 'Rina', { once: true });
    cancelEvent('sprint', 'Holiday', 'Nico', { once: true });
    expect(findEvent('review')?.canceled).toEqual({
      reason: 'Room taken',
      by: 'Rina',
      once: false,
    });
    expect(findEvent('sprint')?.canceled).toEqual({ reason: 'Holiday', by: 'Nico', once: true });
    expect(ids()).toContain('review');
  });

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
    cancelEvent('sprint', 'Holiday', 'Nico', { once: true });
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

  test('forgetting a key the store does not hold (a sample entry) changes nothing', () => {
    const before = eventsStore.get();
    forgetArchivedEvent('event-test-meeting');
    expect(eventsStore.get()).toBe(before);
  });

  test('refuses to change events that are not there', () => {
    expect(() => archiveEvent('nope', 'Nico')).toThrow('Cannot archive event "nope"');
    expect(() => restoreEvent('review')).toThrow('not in Archive');
    expect(() => cancelEvent('nope', 'x', 'Nico')).toThrow('Cannot cancel event "nope"');
    expect(() => editEvent('nope', FORM, 'Nico')).toThrow('Cannot edit event "nope"');
    expect(() => confirmOutcomes('nope', [], 'Nico')).toThrow('no such event');
  });

  test('reset brings back the sample events and the default query', () => {
    addEvent(FORM, 'Nico');
    archiveEvent('party', 'Ayu');
    setEventsQuery({ ...BASE_QUERY, type: 1 });
    resetEvents();
    expect(ids()).toEqual(['kickoff', 'review', 'daily', 'sinar', 'sprint', 'rehearsal', 'party']);
    expect(eventsStore.get().archived).toEqual([]);
    expect(eventsQueryStore.get()).toBe(BASE_QUERY);
    expect(addEvent(FORM, 'Nico')).toBe('new-1');
  });
});
