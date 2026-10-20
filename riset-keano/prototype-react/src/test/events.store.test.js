// events.store: New / Edit save the form, Cancel marks the event, Archive moves it (or one occurrence) out of the list
// until restored, and Create tasks turns the outcomes into tasks and the event Done.
import { afterEach, describe, expect, it } from 'vitest';
import { D } from '../data/sample';
import { addEvent, archiveEvent, cancelEvent, confirmOutcomes, dateOn, editEvent, groupOf, resetEvents, restoreEvent } from '../screens/events/events.store';
import { resetTasks } from '../screens/tasks/tasks.store';

afterEach(() => { resetEvents(); resetTasks(); });

const FORM = { title: 'Retro', date: 9, start: '11:00 AM', end: '12:00 PM', mode: 'In person', place: 'Room 3',
  attendees: ['Rina'], type: 'Meeting', project: 'sinar', agenda: ['Wins'], repeat: '' };
const ids = () => D.events.map(e => e.id);

describe('events store', () => {
  it('groups dates as Earlier, Today, Tomorrow, This week (to Sunday) and Later', () => {
    expect([1, 7, 8, 11, 12].map(n => groupOf(dateOn(n))))
      .toEqual(['Earlier · Thu, Oct 1', 'Today · Wed, Oct 7', 'Tomorrow · Thu, Oct 8', 'This week', 'Later']);
  });

  it('adds an event in date order with the creator first and a range across noon', () => {
    const id = addEvent(FORM, 'Nico');
    const e = D.event(id);
    expect(id).toBe('new-1');
    expect(e).toMatchObject({ status: 'Upcoming', creator: 'Nico', day: 'Fri 9', group: 'This week', time: '11:00', range: '11:00 AM–12:00 PM' });
    expect(e.attendees).toEqual(['Nico', 'Rina']);
    expect(ids().indexOf(id)).toBe(ids().indexOf('sprint') + 1);
  });

  it('edits an event and moves it when its date changes', () => {
    editEvent('review', { ...FORM, date: 15, start: '2:00 PM', end: '3:00 PM', repeat: 'every week' }, 'Nico');
    const e = D.event('review');
    expect(e).toMatchObject({ title: 'Retro', day: 'Thu 15', group: 'Later', range: '2:00–3:00 PM', repeat: 'every week', editor: 'Nico' });
    expect(ids().indexOf('review')).toBeGreaterThan(ids().indexOf('sprint'));
  });

  it('cancels an event, keeping it listed; once only counts for a recurring one', () => {
    cancelEvent('review', 'Room taken', 'Rina', { once: true });
    cancelEvent('sprint', 'Holiday', 'Nico', { once: true });
    expect(D.event('review').canceled).toEqual({ reason: 'Room taken', by: 'Rina', once: false });
    expect(D.event('sprint').canceled).toEqual({ reason: 'Holiday', by: 'Nico', once: true });
    expect(ids()).toContain('review');
  });

  it('archives an event out of the list and restores it to its place', () => {
    const at = ids().indexOf('sinar');
    archiveEvent('sinar', 'Nico');
    expect(ids()).not.toContain('sinar');
    expect(D.archive[0]).toMatchObject({ kind: 'EVENT', title: 'Progress presentation to PT Sinar', by: 'Nico', event: 'sinar' });
    restoreEvent('sinar');
    expect(ids().indexOf('sinar')).toBe(at);
    expect(D.archive.some(a => a.event === 'sinar')).toBe(false);
  });

  it('archives one occurrence of a recurring event: the series moves on and Undo puts it back', () => {
    archiveEvent('sprint', 'Nico', { once: true });
    expect(D.event('sprint').day).toBe('Fri 23');
    expect(D.archive[0].title).toBe('Atlas sprint review · Fri, Oct 9');
    restoreEvent('sprint');
    expect(D.event('sprint').day).toBe('Fri 9');
  });

  it('confirms outcomes as To do tasks in the event\'s project and marks the event Done', () => {
    const nos = confirmOutcomes('daily', [{ title: 'Fix login', who: 'Rina', due: 'Oct 9' }], 'Nico');
    expect(D.task(nos[0])).toMatchObject({ title: 'Fix login', who: 'Rina', due: 'Oct 9', status: 'To do', project: 'Atlas Project' });
    expect(D.event('daily')).toMatchObject({ status: 'Done', outcomes: { tasks: nos, by: 'Nico' } });
  });

  it('refuses to change events that are not there', () => {
    expect(() => archiveEvent('nope', 'Nico')).toThrow('Cannot archive event "nope"');
    expect(() => restoreEvent('review')).toThrow('not in Archive');
  });
});
