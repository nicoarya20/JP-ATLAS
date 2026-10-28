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
import { TYPES } from '../../src/data/events.shared';

// The query string the Events tab sends to `GET /api/app/events` for each Filter & sort choice.

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
