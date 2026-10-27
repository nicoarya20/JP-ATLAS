import {
  applyQuery,
  BASE_QUERY,
  eventsFor,
  GROUP_TYPE,
  groupEvents,
  isFiltered,
  isPast,
  projectOptions,
  searchEvents,
  TYPE_FILTERS,
} from '../../src/data/events.query';
import {
  type EventItem,
  eventEnd,
  eventHref,
  eventProject,
  eventStart,
  eventStatus,
  eventWhere,
} from '../../src/data/events.shared';
import { eventsStore, findEvent } from '../../src/data/events.store';

// Expected values are the prototype's events list (events.filter.test.jsx) on Wed, Oct 7, 2026.

const all = () => eventsStore.get().list;
const ids = (events: readonly EventItem[]) => events.map((e) => e.id);
const event = (id: string): EventItem => {
  const e = findEvent(id);
  if (!e) throw new Error(`test-only: no sample event ${id}`);
  return e;
};
const UPCOMING = ['review', 'sinar', 'sprint', 'rehearsal', 'party'];

describe('events shared', () => {
  test('status, times, place and project of an event', () => {
    expect(['kickoff', 'review', 'sinar'].map((id) => eventStatus(event(id)))).toEqual([
      'Done',
      'Today',
      'Upcoming',
    ]);
    expect(
      eventStatus({ ...event('sinar'), canceled: { reason: 'x', by: 'Nico', once: false } }),
    ).toBe('Canceled');
    expect([eventStart(event('review')), eventEnd(event('review'))]).toEqual([
      '2:00 PM',
      '3:00 PM',
    ]);
    expect(eventStart(event('sinar'))).toBe('10:00 AM');
    expect(eventStart({ ...event('sinar'), range: '11:00 AM–12:00 PM' })).toBe('11:00 AM');
    expect(eventWhere(event('review'))).toBe('In person · Meeting Room 2');
    expect(eventWhere(event('sinar'))).toBe('Online');
    expect(eventProject(event('sinar'))).toBe('Atlas Project');
    expect(eventProject({ ...event('sinar'), project: 'sinar' })).toBe('PT Sinar Client Portal');
  });

  test('an event opens its detail, its results once confirmed, else Step 3', () => {
    expect(eventHref(event('review'))).toBe('/events/review');
    expect(eventHref(event('kickoff'))).toBe('/events/kickoff/results');
    expect(eventHref(event('daily'))).toBe('/events/daily/outcomes/3');
    const confirmed = {
      ...event('daily'),
      outcomes: { tasks: [22], by: 'Nico', date: '2026-10-07' },
    };
    expect(eventHref(confirmed)).toBe('/events/daily/results');
  });
});

describe('events query', () => {
  test('past = done, or its first date is before today', () => {
    expect(ids(all().filter(isPast))).toEqual(['kickoff', 'daily']);
    expect(isPast({ ...event('sinar'), date: '2026-10-06' })).toBe(true);
  });

  test('the base query lists upcoming events; Past lists the rest', () => {
    expect(ids(applyQuery(all(), BASE_QUERY))).toEqual(UPCOMING);
    expect(ids(applyQuery(all(), { ...BASE_QUERY, when: 1 }))).toEqual(['kickoff', 'daily']);
    expect(applyQuery(all(), { ...BASE_QUERY, when: null })).toHaveLength(7);
  });

  test('filters by type on top of Show, and by project', () => {
    const meeting = TYPE_FILTERS.indexOf('Meeting');
    expect(ids(applyQuery(all(), { ...BASE_QUERY, type: meeting }))).toEqual(['rehearsal']);
    const review = TYPE_FILTERS.indexOf('Review');
    expect(ids(applyQuery(all(), { ...BASE_QUERY, type: review, when: null }))).toEqual([
      'review',
      'sprint',
    ]);
    expect(applyQuery(all(), { ...BASE_QUERY, project: 'sinar' })).toEqual([]);
    expect(ids(applyQuery(all(), { ...BASE_QUERY, project: 'atlas' }))).toEqual(UPCOMING);
    expect(projectOptions()[0]).toEqual({ value: '', label: 'All projects' });
  });

  test('the filter dot ignores grouping', () => {
    expect(isFiltered(BASE_QUERY)).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, group: GROUP_TYPE })).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, when: 1 })).toBe(true);
    expect(isFiltered({ ...BASE_QUERY, type: 2 })).toBe(true);
    expect(isFiltered({ ...BASE_QUERY, project: 'atlas' })).toBe(true);
  });

  test('groups by schedule in data order, or by type in form order', () => {
    const upcoming = applyQuery(all(), BASE_QUERY);
    const schedule = groupEvents(upcoming, BASE_QUERY);
    expect(schedule.map((g) => g.title)).toEqual([
      'Today · Wed, Oct 7',
      'Tomorrow · Thu, Oct 8',
      'This week',
      'Later',
    ]);
    expect(ids(schedule[3]?.data ?? [])).toEqual(['rehearsal', 'party']);
    const byType = groupEvents(upcoming, { ...BASE_QUERY, group: GROUP_TYPE });
    expect(byType.map((g) => g.title)).toEqual(['Meeting', 'Review', 'Important', 'Team event']);
    expect(ids(byType[1]?.data ?? [])).toEqual(['review', 'sprint']);
  });

  test('a Member sees only the events they attend', () => {
    expect(ids(eventsFor('member', all()))).toEqual([
      'kickoff',
      'review',
      'daily',
      'sprint',
      'party',
    ]);
    expect(eventsFor('pm', all())).toHaveLength(7);
  });

  test('search matches title or place, ignoring case', () => {
    expect(ids(searchEvents(all(), 'room 2'))).toEqual(['review']);
    expect(ids(searchEvents(all(), 'ONLINE'))).toEqual(['daily', 'sinar']);
    expect(ids(searchEvents(all(), 'sprint'))).toEqual(['sprint']);
    expect(searchEvents(all(), '  ')).toHaveLength(7);
  });
});
