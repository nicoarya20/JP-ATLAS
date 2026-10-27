// Profile and My calendar, mapped from the server: who I am, the greeting name rule ported from the
// server, and the week My calendar draws — including an instant that falls on another day in UTC.
import { ApiError } from '../../src/api/errors';
import { inboxCountResource } from '../../src/data/inbox.api';
import { calendarRange, getMyCalendar, getProfile, greetingName } from '../../src/data/profile';
import { myEventsRange } from '../../src/data/profile.calendar.api';
import { profileResource, saveNotificationPrefs } from '../../src/data/profile.api';
import { notificationPrefsResource } from '../../src/data/profile.api';
import {
  dayLabel,
  eventsFor,
  FIRST_MIN,
  HOUR_PX,
  hourLabel,
  initialScroll,
  itemsOn,
  weekOf,
} from '../../src/data/profile.calendar.dates';
import { pageOf } from '../../src/data/profile.calendar.swipe';
import { whoamiResource } from '../../src/data/whoami.api';
import { listItem, page } from '../helpers/events-server';
import { profileBody, type Reply, serveAppApi, whoami } from '../helpers/team-trash-server';

/** What the stub answers next. */
let profile: Reply = { body: profileBody() };
let events: Reply = { body: page([]) };
let prefs: Reply = { body: { eventReminder: true, inboxNews: true } };

const server = serveAppApi(({ path, method }) => {
  if (path === '/api/app/profile') return profile;
  if (path === '/api/app/profile/notifications') return prefs;
  if (path === '/api/app/whoami') return { body: whoami() };
  if (path === '/api/app/inbox/count') return { body: { action: 3, infoUnread: 1 } };
  if (path === '/api/app/events') return events;
  return { status: 500, body: { error: `no stub for ${path} (${method})`, code: 'X', status: 500 } };
});

beforeEach(() => {
  profile = { body: profileBody() };
  events = { body: page([]) };
  prefs = { body: { eventReminder: true, inboxNews: true } };
});

describe('the greeting name, ported from the server', () => {
  it('is the nickname when there is one', () => {
    expect(greetingName({ nickname: 'Niko', displayName: 'Nico Pratama', name: 'Nico Arya' })).toBe(
      'Niko',
    );
  });

  it('falls back to the first word of the display name, then of the account name', () => {
    expect(greetingName({ nickname: null, displayName: 'Nico Pratama', name: 'X Y' })).toBe('Nico');
    expect(greetingName({ nickname: '  ', displayName: null, name: 'Rina Wulandari' })).toBe('Rina');
  });
});

describe('getProfile', () => {
  it('shows the session account before the profile lands, so the modal is never blank', () => {
    const d = getProfile();
    // helpers/session-fixtures.ts signs in as Nico Arya.
    expect(d.me.full).toBe('Nico Pratama');
    expect(d.me.title).toBe('');
    expect(d.line).toBe('');
  });

  it('fills in the job, the department and the account role once they arrive', async () => {
    await profileResource.ensure();
    await whoamiResource.ensure();
    const d = getProfile();
    expect(d.me.full).toBe('Nico Pratama');
    expect(d.me.name).toBe('Nico');
    expect(d.me.email).toBe('nico@kantor.id');
    expect(d.line).toBe('Project Manager · Product · Project Manager');
  });

  it('leaves out of the line whatever the server has no value for', async () => {
    profile = { body: profileBody({ jobTitle: null, department: null, displayName: null }) };
    await profileResource.ensure();
    const d = getProfile();
    expect(d.me.full).toBe('Nico Arya');
    expect(d.line).toBe('');
  });

  it('takes the Inbox number from the count endpoint, not from a loaded page', async () => {
    await inboxCountResource.ensure();
    expect(getProfile().inbox).toBe(3);
  });

  it('shows no Inbox number before the count lands, rather than a made-up 0', () => {
    expect(getProfile().inbox).toBe(0);
    expect(inboxCountResource.peek().phase).toBe('empty');
  });
});

describe('the notification switches', () => {
  it('reads the two the server keeps', async () => {
    prefs = { body: { eventReminder: false, inboxNews: true } };
    await notificationPrefsResource.ensure();
    expect(notificationPrefsResource.current()).toEqual({
      eventReminder: false,
      inboxNews: true,
    });
  });

  it('sends only what changed, and marks the switches stale afterwards', async () => {
    await notificationPrefsResource.ensure();
    prefs = { body: { eventReminder: false, inboxNews: true } };
    await saveNotificationPrefs({ eventReminder: false });
    const put = server.to('/api/app/profile/notifications').find((c) => c.method === 'PUT');
    expect(put?.body).toEqual({ eventReminder: false });
    // Rule 2: the write marked them stale and a refetch is already out, so what the screen ends up
    // drawing is what the server stored — not what the finger asked for.
    await notificationPrefsResource.ensure();
    expect(notificationPrefsResource.current()).toEqual({
      eventReminder: false,
      inboxNews: true,
    });
  });

  it('leaves the stored value alone when the save fails', async () => {
    await notificationPrefsResource.ensure();
    prefs = { status: 500, body: { error: 'Gagal.', code: 'INTERNAL', status: 500 } };
    await expect(saveNotificationPrefs({ inboxNews: false })).rejects.toBeInstanceOf(ApiError);
    expect(notificationPrefsResource.current()).toEqual({ eventReminder: true, inboxNews: true });
  });
});

describe('the calendar week', () => {
  it('starts on Sunday, as in iOS Calendar', () => {
    expect(weekOf('2026-10-07')).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ]);
  });

  it('asks the server for exactly the week it shows', async () => {
    expect(calendarRange('2026-10-07')).toEqual({ from: '2026-10-04', to: '2026-10-10' });
    await myEventsRange('2026-10-04', '2026-10-10').ensure();
    const asked = server.to('/api/app/events')[0]?.search;
    expect(asked?.get('from')).toBe('2026-10-04');
    expect(asked?.get('to')).toBe('2026-10-10');
  });

  it('labels the days and the hours', () => {
    expect(dayLabel('2026-10-07')).toBe('Wednesday, Oct 7, 2026');
    expect([0, 9, 12, 15].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '3 PM']);
  });

  it('keeps only the events the server says I am on', async () => {
    events = {
      body: page([
        listItem({ id: 'mine', participants: { total: 2, isParticipant: true } }),
        listItem({ id: 'theirs', participants: { total: 2, isParticipant: false } }),
      ]),
    };
    await myEventsRange('2026-10-04', '2026-10-10').ensure();
    const d = getMyCalendar('2026-10-07');
    expect(d.blocks.map((b) => b.id)).toEqual(['mine']);
  });

  it('places a block at the time the team zone reads, with its real location', async () => {
    events = { body: page([listItem()]) };
    await myEventsRange('2026-10-04', '2026-10-10').ensure();
    const d = getMyCalendar('2026-10-07');
    // 07:00–08:00 UTC is 14:00–15:00 in Asia/Jakarta: minute 840 to 900.
    expect(d.blocks[0]).toMatchObject({ start: 14 * 60, end: 15 * 60 });
    expect(d.blocks[0]?.meta).toBe('2:00–3:00 PM · In person · Meeting Room 2');
    expect(d.count).toBe('1 event');
  });

  it('puts an instant past midnight UTC on the day the team is already in', async () => {
    // 2026-10-07T23:30Z is 2026-10-08 06:30 in Asia/Jakarta: the event belongs to the 8th.
    events = {
      body: page([
        listItem({ startsAt: '2026-10-07T23:30:00.000Z', endsAt: '2026-10-08T00:30:00.000Z' }),
      ]),
    };
    await myEventsRange('2026-10-04', '2026-10-10').ensure();
    expect(getMyCalendar('2026-10-07').blocks).toHaveLength(0);
    const next = getMyCalendar('2026-10-08');
    expect(next.blocks).toHaveLength(1);
    expect(next.blocks[0]?.start).toBe(6 * 60 + 30);
    // ...and the strip marks the 8th, not the 7th.
    expect(next.week.find((day) => day.iso === '2026-10-08')?.marked).toBe(true);
    expect(next.week.find((day) => day.iso === '2026-10-07')?.marked).toBe(false);
  });

  it('counts no events as such, and marks today', async () => {
    const d = getMyCalendar('2026-10-07');
    expect(d.count).toBe('No events');
    expect(d.today).toBe(true);
    expect(getMyCalendar('2026-10-08').today).toBe(false);
  });

  it('opens an hour before the first event, else before 8 AM', () => {
    const e = { e: {} as never, date: '2026-10-07', start: 600, end: 660 };
    expect(initialScroll([e])).toBe(((600 - 60) / 60) * HOUR_PX);
    expect(initialScroll([])).toBe(((FIRST_MIN - 60) / 60) * HOUR_PX);
  });

  it('places events on their own day and no other: there is no client-side repeat', () => {
    const item = { e: {} as never, date: '2026-10-07', start: 0, end: 60 };
    expect(itemsOn([item], '2026-10-07')).toHaveLength(1);
    expect(itemsOn([item], '2026-10-14')).toHaveLength(0);
  });

  it('places rows by their start minute, earliest first', async () => {
    events = {
      body: page([
        listItem({ id: 'late', startsAt: '2026-10-07T07:00:00.000Z', endsAt: '2026-10-07T08:00:00.000Z' }),
        listItem({ id: 'early', startsAt: '2026-10-07T02:00:00.000Z', endsAt: '2026-10-07T03:00:00.000Z' }),
      ]),
    };
    await myEventsRange('2026-10-04', '2026-10-10').ensure();
    expect(getMyCalendar('2026-10-07').blocks.map((b) => b.id)).toEqual(['early', 'late']);
  });

  it('maps nothing when the week holds nothing', () => {
    expect(eventsFor([])).toEqual([]);
  });
});

describe('the week strip drag', () => {
  it('pages on a long drag or a flick, and springs back otherwise', () => {
    expect(pageOf(-100, 0, 300)).toBe(1);
    expect(pageOf(100, 0, 300)).toBe(-1);
    expect(pageOf(-10, 0, 300)).toBe(0);
    expect(pageOf(-20, -600, 300)).toBe(1);
  });
});
