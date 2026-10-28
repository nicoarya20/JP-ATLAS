import {
  BASE_QUERY,
  eventsParams,
  GROUP_TYPE,
  isFiltered,
  KIND_LABEL,
  KINDS,
  kindOf,
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
  TYPES,
} from '../../src/data/events.shared';
import { findEvent } from '../../src/data/events.store';

// The sample helpers (profile calendar, hidden outcomes) on Wed, Oct 7, 2026, and the query string the Events tab
// sends to `GET /api/app/events` for each Filter & sort choice.

const event = (id: string): EventItem => {
  const e = findEvent(id);
  if (!e) throw new Error(`test-only: no sample event ${id}`);
  return e;
};

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
  test('the default asks for upcoming events of every type and project', () => {
    expect(eventsParams(BASE_QUERY)).toBe('tab=upcoming');
    expect(isFiltered(BASE_QUERY)).toBe(false);
  });

  test('Show, type, project and the search become tab, kind, projectId and q, in that order', () => {
    const q = { ...BASE_QUERY, when: 1, type: TYPE_FILTERS.indexOf('Review'), project: 'p-atlas' };
    expect(eventsParams(q, '  sync  ')).toBe('tab=past&kind=review&projectId=p-atlas&q=sync');
    expect(isFiltered(q)).toBe(true);
  });

  test('the calendar sends neither Show nor the search: its window replaces them', () => {
    const q = { ...BASE_QUERY, when: 1, type: TYPE_FILTERS.indexOf('Team event') };
    expect(eventsParams(q, 'sync', { calendar: true })).toBe('kind=team');
  });

  test('a search longer than the server reads is cut at 100 characters', () => {
    const sent = new URLSearchParams(eventsParams(BASE_QUERY, 'a'.repeat(140))).get('q');
    expect(sent).toHaveLength(100);
  });

  test('grouping alone is not a filter', () => {
    expect(isFiltered({ ...BASE_QUERY, group: GROUP_TYPE })).toBe(false);
  });

  test('each type filter names one server kind, in form order; All names none', () => {
    expect(kindOf(0)).toBeNull();
    expect(TYPES.map((_, i) => kindOf(i + 1))).toEqual(KINDS);
    expect(KINDS.map((k) => KIND_LABEL[k])).toEqual([...TYPES]);
  });
});
