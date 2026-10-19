/** Pure helpers of the Events list: team-zone day boundaries, headings, status, filters (S7 E-08). */
import { describe, expect, it } from 'bun:test';
import { type EventListItem, eventKeys, uniqueEvents } from '../app/lib/events-api';
import {
  DEFAULT_EVENT_FILTERS,
  hasEventFilters,
  parseEventFilters,
  toEventQuery,
} from '../app/lib/events-filters';
import {
  dayHeading,
  dayKeyOf,
  type EventsClock,
  eventStatus,
  formatEventTime,
  formatTimeRange,
  groupByDay,
  locationLabel,
} from '../app/lib/events-format';

const WIB = 'Asia/Jakarta'; // test-only
// 20 Oct 2026 10:00 WIB.
const NOW = Date.parse('2026-10-20T03:00:00.000Z'); // test-only
const CLOCK: EventsClock = { now: NOW, today: '2026-10-20', timeZone: WIB };

function event(id: string, startsAt: string, endsAt: string, over: Partial<EventListItem> = {}) {
  return {
    id,
    title: `Event ${id}`,
    kind: 'meeting',
    startsAt,
    endsAt,
    locationType: null,
    locationText: null,
    meetingUrl: null,
    project: null,
    canceledAt: null,
    cancelReason: null,
    participants: { total: 1, isParticipant: true },
    noteStatus: null,
    can: {},
    ...over,
  } satisfies EventListItem;
}

describe('day boundaries in the team zone', () => {
  it('puts 00:00 WIB on the new day and 23:59 WIB on the old one', () => {
    expect(dayKeyOf('2026-10-19T16:59:59.000Z', WIB)).toBe('2026-10-19');
    expect(dayKeyOf('2026-10-19T17:00:00.000Z', WIB)).toBe('2026-10-20');
    expect(dayKeyOf('2026-10-20T16:59:59.000Z', WIB)).toBe('2026-10-20');
  });

  it('prints midnight as 00.00 and a morning time with a leading zero', () => {
    expect(formatEventTime('2026-10-19T17:00:00.000Z', WIB)).toBe('00.00');
    expect(formatEventTime('2026-10-20T02:05:00.000Z', WIB)).toBe('09.05');
  });

  it('names the end day when an event crosses midnight', () => {
    const e = event('x', '2026-10-20T16:00:00.000Z', '2026-10-20T18:00:00.000Z');
    expect(formatTimeRange(e, WIB)).toBe('23.00–21 Okt 01.00');
    const same = event('y', '2026-10-20T02:00:00.000Z', '2026-10-20T03:00:00.000Z');
    expect(formatTimeRange(same, WIB)).toBe('09.00–10.00');
  });
});

describe('dayHeading', () => {
  it('says Hari ini, Besok and Kemarin with the date, then plain weekday names', () => {
    expect(dayHeading('2026-10-20', '2026-10-20')).toBe('Hari ini · Selasa, 20 Oktober');
    expect(dayHeading('2026-10-21', '2026-10-20')).toBe('Besok · Rabu, 21 Oktober');
    expect(dayHeading('2026-10-19', '2026-10-20')).toBe('Kemarin · Senin, 19 Oktober');
    expect(dayHeading('2026-10-22', '2026-10-20')).toBe('Kamis, 22 Oktober');
  });

  it('adds the year only when it differs from today', () => {
    expect(dayHeading('2027-01-01', '2026-10-20')).toBe('Jumat, 1 Januari 2027');
  });
});

describe('groupByDay', () => {
  it('splits the late evening and the early morning of the next day into two headings', () => {
    const late = event('late', '2026-10-20T16:30:00.000Z', '2026-10-20T17:30:00.000Z'); // 23.30 WIB
    const early = event('early', '2026-10-20T17:30:00.000Z', '2026-10-20T18:30:00.000Z'); // 00.30 WIB
    const groups = groupByDay([late, early], CLOCK);
    expect(groups.map((g) => g.heading)).toEqual([
      'Hari ini · Selasa, 20 Oktober',
      'Besok · Rabu, 21 Oktober',
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['late'], ['early']]);
  });

  it('keeps events of one day together, in the order given', () => {
    const a = event('a', '2026-10-20T02:00:00.000Z', '2026-10-20T03:00:00.000Z');
    const b = event('b', '2026-10-20T05:00:00.000Z', '2026-10-20T06:00:00.000Z');
    expect(groupByDay([a, b], CLOCK)).toHaveLength(1);
    expect(groupByDay([], CLOCK)).toEqual([]);
  });
});

describe('eventStatus', () => {
  const at = (starts: string, ends: string, canceledAt: string | null = null) =>
    eventStatus({ startsAt: starts, endsAt: ends, canceledAt }, NOW);

  it('works out canceled, ongoing, ended and scheduled from the data', () => {
    expect(at('2026-10-20T04:00:00.000Z', '2026-10-20T05:00:00.000Z')).toBe('scheduled');
    expect(at('2026-10-20T02:30:00.000Z', '2026-10-20T04:00:00.000Z')).toBe('ongoing');
    expect(at('2026-10-20T01:00:00.000Z', '2026-10-20T02:00:00.000Z')).toBe('ended');
    expect(at('2026-10-20T04:00:00.000Z', '2026-10-20T05:00:00.000Z', '2026-10-19T00:00:00Z')).toBe(
      'canceled',
    );
  });

  it('counts an event that ends exactly now as ended and one that starts exactly now as ongoing', () => {
    expect(at('2026-10-20T02:00:00.000Z', '2026-10-20T03:00:00.000Z')).toBe('ended');
    expect(at('2026-10-20T03:00:00.000Z', '2026-10-20T04:00:00.000Z')).toBe('ongoing');
  });
});

describe('locationLabel', () => {
  it('prefers the written place and falls back to Online for a meeting link', () => {
    expect(locationLabel({ locationType: 'offline', locationText: ' Ruang 1 ' })).toBe('Ruang 1');
    expect(locationLabel({ locationType: 'online', locationText: null })).toBe('Online');
    expect(locationLabel({ locationType: null, locationText: null })).toBeNull();
  });
});

describe('events filters', () => {
  it('reads defaults from an empty URL and ignores unknown values', () => {
    expect(parseEventFilters(new URLSearchParams(''))).toEqual(DEFAULT_EVENT_FILTERS);
    const odd = parseEventFilters(new URLSearchParams('waktu=besok&jenis=party'));
    expect(odd.waktu).toBe('akan-datang');
    expect(odd.jenis).toBe('');
  });

  it('turns the URL into the API query', () => {
    const f = parseEventFilters(
      new URLSearchParams('waktu=lewat&jenis=review&proyek=p1&q=%20desain%20'),
    );
    expect(toEventQuery(f)).toEqual({
      tab: 'past',
      kind: 'review',
      projectId: 'p1',
      q: 'desain',
      limit: 30,
    });
    expect(toEventQuery(DEFAULT_EVENT_FILTERS)).toEqual({ tab: 'upcoming', limit: 30 });
  });

  it('counts kind, project and search as filters but not the tab', () => {
    expect(hasEventFilters(DEFAULT_EVENT_FILTERS)).toBe(false);
    expect(hasEventFilters({ ...DEFAULT_EVENT_FILTERS, waktu: 'lewat' })).toBe(false);
    expect(hasEventFilters({ ...DEFAULT_EVENT_FILTERS, q: 'x' })).toBe(true);
  });
});

describe('events api helpers', () => {
  it('lists an event once when a page boundary repeats it', () => {
    const a = event('a', '2026-10-20T04:00:00.000Z', '2026-10-20T05:00:00.000Z');
    const b = event('b', '2026-10-20T06:00:00.000Z', '2026-10-20T07:00:00.000Z');
    const pages = [
      { items: [a, b], nextCursor: 'c', caps: {} },
      { items: [b], nextCursor: null, caps: {} },
    ];
    expect(uniqueEvents(pages).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('keys every query separately', () => {
    expect(eventKeys.list({ tab: 'upcoming', limit: 30 })).not.toEqual(
      eventKeys.list({ tab: 'past', limit: 30 }),
    );
  });
});
