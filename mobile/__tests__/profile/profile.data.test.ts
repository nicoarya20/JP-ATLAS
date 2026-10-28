// Profile ① and ② from the server's answers: the hero (name, line, photo) and My calendar's week and day blocks, cut
// from `GET /api/app/events` in the team's zone (Jakarta). Today is the test clock's Wed, Oct 7, 2026.
import { profileData } from '../../src/data/profile';
import { blocksOn, getMyCalendar } from '../../src/data/profile.calendar';
import {
  dayLabel,
  FIRST_MIN,
  HOUR_PX,
  hourLabel,
  initialScroll,
  weekOf,
} from '../../src/data/profile.calendar.dates';
import { pageOf } from '../../src/data/profile.calendar.swipe';
import { reviewItem, syncItem } from '../helpers/events-fixtures';
import { profileWire } from '../helpers/profile-fixtures';
import { APPROVED_USER } from '../helpers/session-fixtures';
import { whoamiAs } from '../helpers/whoami-fixtures';

describe('profile.calendar.dates', () => {
  test('the week starts on Sunday, as in iOS Calendar', () => {
    expect(weekOf('2026-10-07')).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
    expect(weekOf('2026-10-04')[0]).toBe('2026-10-04');
  });

  test('labels: day and hour', () => {
    expect(dayLabel('2026-10-07')).toBe('Wednesday, Oct 7, 2026');
    expect([0, 9, 12, 15].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '3 PM']);
  });

  test('the grid opens an hour before the first event, else before 8 AM, never above midnight', () => {
    const at = (min: number) => ((min - 60) / 60) * HOUR_PX;
    expect(initialScroll(14 * 60)).toBe(at(14 * 60));
    expect(initialScroll(undefined)).toBe(at(FIRST_MIN));
    expect(initialScroll(20)).toBe(0);
  });
});

describe('week strip paging (pageOf)', () => {
  const W = 360;
  test('a drag past a quarter of the width pages; left = next week', () => {
    expect(pageOf(-100, 0, W)).toBe(1);
    expect(pageOf(100, 0, W)).toBe(-1);
    expect(pageOf(-80, 0, W)).toBe(0);
  });

  test('a short flick pages, a flick against the drag does not', () => {
    expect(pageOf(-20, -600, W)).toBe(1);
    expect(pageOf(-10, -600, W)).toBe(0);
    expect(pageOf(-20, 600, W)).toBe(0);
  });

  test('a narrow strip still needs 40 px of travel', () => {
    expect(pageOf(-39, 0, 100)).toBe(0);
    expect(pageOf(-41, 0, 100)).toBe(1);
  });
});

describe('My calendar blocks', () => {
  test('only events I take part in, on the day, in the team zone, earliest first, toned by kind', () => {
    const items = [
      reviewItem(),
      reviewItem({
        id: 'e-early',
        title: 'Stand-up',
        kind: 'meeting',
        startsAt: '2026-10-07T02:00:00.000Z',
        endsAt: '2026-10-07T02:15:00.000Z',
      }),
      reviewItem({ id: 'e-other', participants: { total: 4, isParticipant: false } }),
      syncItem(),
    ];
    expect(blocksOn(items, '2026-10-07')).toEqual([
      expect.objectContaining({ id: 'e-early', start: 9 * 60, end: 9 * 60 + 15, tone: 'blue' }),
      expect.objectContaining({
        id: 'e-review',
        title: 'Onboarding design review',
        meta: '2:00–3:00 PM · In person · Meeting Room 2',
        start: 14 * 60,
        end: 15 * 60,
        tone: 'purple',
        canceled: false,
        href: '/events/e-review',
      }),
    ]);
  });

  test('a canceled event stays, said so; one past midnight is cut at each day’s edge', () => {
    const late = reviewItem({
      id: 'e-late',
      startsAt: '2026-10-07T15:00:00.000Z',
      endsAt: '2026-10-07T18:00:00.000Z',
      canceledAt: '2026-10-06T01:00:00.000Z',
    });
    const [first] = blocksOn([late], '2026-10-07');
    expect(first).toMatchObject({ start: 22 * 60, end: 24 * 60, canceled: true });
    expect(first?.meta).toBe('Canceled · 10:00 PM – Oct 8, 1:00 AM · In person · Meeting Room 2');
    expect(blocksOn([late], '2026-10-08')[0]).toMatchObject({ start: 0, end: 60 });
  });

  test('the day: month, label, count, the picked day, today and the days with my events marked', () => {
    const d = getMyCalendar('2026-10-07', [reviewItem(), syncItem()]);
    expect(d.month).toBe('October 2026');
    expect(d.dayLabel).toBe('Wednesday, Oct 7, 2026');
    expect(d.count).toBe('1 event');
    expect(d.scrollY).toBe(initialScroll(14 * 60));
    const picked = d.week.filter((x) => x.picked);
    expect(picked.map((x) => x.label)).toEqual(['Wednesday, Oct 7, 2026, today']);
    expect(d.week.filter((x) => x.marked).map((x) => x.iso)).toEqual(['2026-10-07', '2026-10-08']);
    expect(d.week.find((x) => x.iso === '2026-10-10')?.weekend).toBe(true);
    expect(getMyCalendar('2026-10-05', []).count).toBe('No events');
  });
});

describe('profileData', () => {
  const session = { ...APPROVED_USER, image: 'https://img/nico.png' };

  test('the display name, the job and division, the session photo and the Inbox count', () => {
    const d = profileData(profileWire(), whoamiAs('pm'), session, 3);
    expect(d).toEqual({
      full: 'Nico',
      email: 'nico@kantor.id',
      line: 'Designer · Product',
      image: 'https://img/nico.png',
      inbox: 3,
    });
  });

  test('an Admin is marked; with no job or division the role is the line', () => {
    expect(profileData(profileWire(), whoamiAs('admin'), null, null).line).toBe(
      'Designer · Product · Admin',
    );
    const bare = profileWire({ jobTitle: null, department: null, displayName: null });
    const d = profileData(bare, whoamiAs('pm'), null, null);
    expect(d.line).toBe('Project Manager');
    expect(d.full).toBe('Nico Arya');
  });

  test('before the profile is in: the session’s name and email, no line until whoami', () => {
    const d = profileData(null, null, session, null);
    expect(d).toMatchObject({ full: 'Nico Arya', email: 'nico@kantor.id', line: '', inbox: null });
  });
});
