// Filter & sort of the Events list: what it turns into for the server, the option lists, the
// grouping, and the shared helpers the still-sample modules use. The day is Wed, 7 Oct 2026.

import { syncEventsList } from '@/data/events.api';
import { toServerEvent } from '@/data/events.map';
import {
  BASE_QUERY,
  eventsFor,
  eventsSearchStore,
  GROUP_TYPE,
  groupEvents,
  isFiltered,
  kindOfFilter,
  listKeyOf,
  projectOptions,
  setEventsSearch,
  TYPE_FILTERS,
  WHEN,
} from '@/data/events.query';
import {
  type EventItem,
  eventEnd,
  eventProject,
  eventStart,
  eventStatus,
  eventWhere,
} from '@/data/events.shared';
import { eventsStore, findEvent } from '@/data/events.store';

import { listItem, PROJECT, page, serveEventsApi } from '../helpers/events-server';

const server = serveEventsApi(() => ({
  body: page([
    listItem(),
    listItem({ id: 'e-sinar', project: { id: 'p-sinar', name: 'PT Sinar', status: 'active' } }),
    listItem({ id: 'e-solo', project: null }),
  ]),
}));

const event = (id: string): EventItem => {
  const e = findEvent(id);
  if (!e) throw new Error(`test-only: no sample event ${id}`);
  return e;
};

describe('what the server is asked for', () => {
  test('Show becomes the tab, the type becomes a kind, the rest goes as it is', () => {
    expect(WHEN).toEqual(['Upcoming', 'Past']);
    expect(listKeyOf(BASE_QUERY, '')).toEqual({
      tab: 'upcoming',
      kind: undefined,
      projectId: undefined,
      q: undefined,
    });
    const review = TYPE_FILTERS.indexOf('Review');
    expect(listKeyOf({ when: 1, type: review, project: 'p-atlas', group: 0 }, ' design ')).toEqual({
      tab: 'past',
      kind: 'review',
      projectId: 'p-atlas',
      q: 'design',
    });
  });

  test('"All" is no kind at all, so the server is not asked to filter', () => {
    expect(kindOfFilter(0)).toBeUndefined();
    expect(kindOfFilter(TYPE_FILTERS.indexOf('Team event'))).toBe('team');
  });

  test('the search text lives in a store, because the fetch layer has to read it', () => {
    setEventsSearch('retro');
    expect(eventsSearchStore.get()).toBe('retro');
    expect(listKeyOf(BASE_QUERY, eventsSearchStore.get()).q).toBe('retro');
    setEventsSearch('');
  });

  test('the filter dot ignores grouping and the search text', () => {
    expect(isFiltered(BASE_QUERY)).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, group: GROUP_TYPE })).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, when: 1 })).toBe(true);
    expect(isFiltered({ ...BASE_QUERY, type: 2 })).toBe(true);
    expect(isFiltered({ ...BASE_QUERY, project: 'p-atlas' })).toBe(true);
  });
});

describe('the project options', () => {
  test('are the projects of the loaded events, with All first and no personal entry', async () => {
    expect(projectOptions()).toEqual([{ value: '', label: 'All projects' }]);
    await syncEventsList({ tab: 'upcoming' });
    expect(projectOptions()).toEqual([
      { value: '', label: 'All projects' },
      { value: PROJECT.id, label: 'Atlas' },
      { value: 'p-sinar', label: 'PT Sinar' },
    ]);
    expect(server.to('/api/app/events')).toHaveLength(1);
  });
});

describe('grouping the rows on screen', () => {
  const events = [
    toServerEvent(listItem({ id: 'today', startsAt: '2026-10-07T07:00:00.000Z' })),
    toServerEvent(
      listItem({
        id: 'tomorrow',
        kind: 'meeting',
        startsAt: '2026-10-08T07:00:00.000Z',
        endsAt: '2026-10-08T08:00:00.000Z',
      }),
    ),
    toServerEvent(
      listItem({
        id: 'later',
        kind: 'team',
        startsAt: '2026-10-25T07:00:00.000Z',
        endsAt: '2026-10-25T08:00:00.000Z',
      }),
    ),
  ];

  test('by schedule, in the order the server sent them', () => {
    const groups = groupEvents(events, BASE_QUERY);
    expect(groups.map((g) => g.title)).toEqual([
      'Today · Wed, Oct 7',
      'Tomorrow · Thu, Oct 8',
      'Later',
    ]);
    expect(groups[0]?.data.map((e) => e.id)).toEqual(['today']);
  });

  test("by type, in the form's order, leaving empty types out", () => {
    const groups = groupEvents(events, { ...BASE_QUERY, group: GROUP_TYPE });
    expect(groups.map((g) => g.title)).toEqual(['Meeting', 'Review', 'Team event']);
    expect(groups[1]?.data.map((e) => e.id)).toEqual(['today']);
  });
});

describe('the helpers the sample modules still use', () => {
  // The Profile calendar and Archive read `eventsStore` until their own wave; these keep working.
  test('status, times, place and project of a sample event', () => {
    expect(['kickoff', 'review', 'sinar'].map((id) => eventStatus(event(id)))).toEqual([
      'Done',
      'Today',
      'Upcoming',
    ]);
    expect([eventStart(event('review')), eventEnd(event('review'))]).toEqual([
      '2:00 PM',
      '3:00 PM',
    ]);
    expect(eventWhere(event('review'))).toBe('In person · Meeting Room 2');
    expect(eventProject(event('sinar'))).toBe('Atlas Project');
  });

  test('a Member sees only the sample events they attend', () => {
    const all = eventsStore.get().list;
    expect(eventsFor('member', all).map((e) => e.id)).toEqual([
      'kickoff',
      'review',
      'daily',
      'sprint',
      'party',
    ]);
    expect(eventsFor('pm', all)).toHaveLength(7);
  });
});
