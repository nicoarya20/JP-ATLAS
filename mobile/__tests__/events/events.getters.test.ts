// What each Events screen gets from the server's answer: the cards, the calendar grid, the detail's
// capabilities, and the form the Edit screen opens with. The day is Wed, 7 Oct 2026 (K1).

import {
  getEventDetail,
  getEventForm,
  getEventsCalendar,
  getEventsList,
  stepCalendar,
  windowKeyOf,
} from '@/data/events';
import { eventDetailResource, syncEventsList, syncEventsWindow } from '@/data/events.api';
import { BASE_QUERY, GROUP_TYPE } from '@/data/events.query';

import { apiError, detailItem, listItem, page, serveEventsApi } from '../helpers/events-server';

let answer: (call: { path: string; search: URLSearchParams }) => unknown;

const server = serveEventsApi((call) => {
  const reply = answer(call);
  return reply && typeof reply === 'object' && 'status' in (reply as object)
    ? (reply as { status: number; body: unknown })
    : { body: reply };
});

beforeEach(() => {
  answer = () => page([listItem()]);
});

const cards = (query = BASE_QUERY) => getEventsList('pm', { query }).groups.flatMap((g) => g.data);

describe('the list', () => {
  test('is empty and asks for nothing before the server has answered', () => {
    expect(getEventsList('pm', { query: BASE_QUERY })).toEqual({
      groups: [],
      empty: false,
      more: false,
      createEvent: false,
    });
    expect(server.calls()).toHaveLength(0);
  });

  test('cards carry the time tile, the status pill and the route to the detail', async () => {
    answer = () =>
      page([
        listItem(),
        listItem({
          id: 'e-later',
          startsAt: '2026-10-09T02:00:00.000Z',
          endsAt: '2026-10-09T03:00:00.000Z',
        }),
      ]);
    await syncEventsList({ tab: 'upcoming' });
    expect(cards()[0]).toMatchObject({
      when: '2:00', // the start time, because it is in the Today group
      status: 'Today',
      href: '/events/e-review',
    });
    expect(cards()[1]).toMatchObject({
      when: 'Fri 9',
      status: 'Upcoming',
      href: '/events/e-later',
    });
  });

  test('a past page is Done, because that is the cut the server made', async () => {
    await syncEventsList({ tab: 'past' });
    expect(cards({ ...BASE_QUERY, when: 1 })[0]?.status).toBe('Done');
  });

  test('a canceled event reads Canceled whichever tab it came in', async () => {
    answer = () =>
      page([listItem({ canceledAt: '2026-10-06T03:00:00.000Z', cancelReason: 'Ruang dipakai.' })]);
    await syncEventsList({ tab: 'upcoming' });
    expect(cards()[0]?.status).toBe('Canceled');
  });

  test('groups by type when the query says so', async () => {
    answer = () => page([listItem(), listItem({ id: 'e-two', kind: 'team' })]);
    await syncEventsList({ tab: 'upcoming' });
    const data = getEventsList('pm', { query: { ...BASE_QUERY, group: GROUP_TYPE } });
    expect(data.groups.map((g) => g.title)).toEqual(['Review', 'Team event']);
  });

  test('"nothing yet" is only concluded from an unfiltered first page', async () => {
    answer = () => page([]);
    await syncEventsList({ tab: 'upcoming' });
    expect(getEventsList('pm', { query: BASE_QUERY }).empty).toBe(true);
    await syncEventsList({ tab: 'upcoming', q: 'nothing' });
    // A filtered page with no rows is "no match", a different screen; never "no events yet".
    expect(getEventsList('pm', { query: BASE_QUERY }).empty).toBe(false);
  });

  test('passes through whether a further page exists and whether I may create events', async () => {
    answer = () => page([listItem()], { nextCursor: 'c1', caps: { createEvent: false } });
    await syncEventsList({ tab: 'upcoming' });
    expect(getEventsList('pm', { query: BASE_QUERY })).toMatchObject({
      more: true,
      createEvent: false,
    });
  });
});

describe('the calendar', () => {
  test('asks for the whole shown month, both halves of today', () => {
    expect(windowKeyOf('month', '2026-10-07', BASE_QUERY)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
      kind: undefined,
      projectId: undefined,
    });
    expect(windowKeyOf('week', '2026-10-07', BASE_QUERY)).toMatchObject({
      from: '2026-10-05',
      to: '2026-10-11',
    });
  });

  test("draws dots and the picked day's agenda from the window", async () => {
    answer = () =>
      page([
        listItem(),
        listItem({
          id: 'e-2',
          startsAt: '2026-10-07T01:00:00.000Z',
          endsAt: '2026-10-07T02:00:00.000Z',
        }),
        listItem({
          id: 'e-3',
          startsAt: '2026-10-09T07:00:00.000Z',
          endsAt: '2026-10-09T08:00:00.000Z',
        }),
      ]);
    await syncEventsWindow(windowKeyOf('month', '2026-10-07', BASE_QUERY));
    const data = getEventsCalendar('pm', {
      view: 'month',
      picked: '2026-10-07',
      query: BASE_QUERY,
    });
    expect(data.title).toBe('October 2026');
    expect(data.days.filter((d) => d.dots).map((d) => [d.day, d.dots])).toEqual([
      [7, 2],
      [9, 1],
    ]);
    expect(data.days.find((d) => d.day === 9)?.label).toBe('Fri, Oct 9, 1 event');
    // The agenda is ordered by the instant, so 08:00 comes before 14:00.
    expect(data.agenda.map((a) => a.event.id)).toEqual(['e-2', 'e-review']);
    expect(data.agenda[0]).toMatchObject({ href: '/events/e-2', status: 'Today' });
    expect(data.agendaDate).toBe('Wed, Oct 7');
  });

  test('offers Reset filters when the filters leave the window empty', async () => {
    answer = () => page([]);
    const filtered = { ...BASE_QUERY, project: 'p-sinar' };
    await syncEventsWindow(windowKeyOf('month', '2026-10-07', filtered));
    const data = getEventsCalendar('pm', { view: 'month', picked: '2026-10-07', query: filtered });
    expect(data).toMatchObject({ filtered: true, hiddenByFilters: true });
    // Nothing is claimed before the answer arrives.
    const unfiltered = getEventsCalendar('pm', { view: 'month', query: BASE_QUERY });
    expect(unfiltered.hiddenByFilters).toBe(false);
  });

  test('the arrows move a week by 7 days and a month to its 1st', () => {
    expect(stepCalendar('week', '2026-10-07', 1)).toBe('2026-10-14');
    expect(stepCalendar('month', '2026-10-07', 1)).toBe('2026-11-01');
    // Back into today's month puts today back, as the prototype does.
    expect(stepCalendar('month', '2026-11-01', -1)).toBe('2026-10-07');
  });
});

describe('the detail', () => {
  beforeEach(() => {
    answer = () => detailItem();
  });

  test('is null until the event has been read', () => {
    expect(getEventDetail('pm', 'e-review')).toBeNull();
  });

  test('shows the facts, the guests creator-first, and the project', async () => {
    await eventDetailResource('e-review').ensure();
    const d = getEventDetail('pm', 'e-review');
    expect(d).toMatchObject({ status: 'Today', project: 'Atlas' });
    expect(d?.attendees).toEqual([
      { name: 'Rina', userId: 'u-rina', creator: true },
      { name: 'Nico', userId: 'u-nico', creator: false },
    ]);
    expect(d?.event.remindersMinutes).toEqual([1440, 30]);
  });

  test('a personal event has no project rather than a borrowed one', async () => {
    answer = () => detailItem({ project: null });
    await eventDetailResource('solo').ensure();
    expect(getEventDetail('pm', 'solo')?.project).toBeNull();
  });

  test('every control follows can{}: absent hides, a code disables with the reason', async () => {
    answer = () => detailItem({ can: { update: 'IMPERSONATING', cancel: 'IMPERSONATING' } });
    await eventDetailResource('e-review').ensure();
    const d = getEventDetail('pm', 'e-review');
    expect(d?.edit).toBe('disabled');
    expect(d?.editReason).toMatch(/menyamar/);
    // `trash` was not sent, so Move to Archive is not offered at all.
    expect(d?.menu).toEqual([
      { action: 'cancel', enabled: false, reason: expect.stringMatching(/menyamar/) },
    ]);
    expect(d?.writeNote).toBe('hidden');
  });

  test('no capabilities at all means no menu and no Edit', async () => {
    answer = () => detailItem({ can: {} });
    await eventDetailResource('e-review').ensure();
    expect(getEventDetail('pm', 'e-review')).toMatchObject({ edit: 'hidden', menu: [] });
  });

  test('the permission sentence comes from can.update and the creator, not from a role', async () => {
    // A guest: update was not sent, and the creator is someone else.
    answer = () => detailItem({ can: { writeNote: true } });
    await eventDetailResource('guest').ensure();
    expect(getEventDetail('member', 'guest')?.access).toBe('guest');
    // A manager who did not create it: update is allowed.
    answer = () => detailItem({ id: 'managed' });
    await eventDetailResource('managed').ensure();
    expect(getEventDetail('member', 'managed')?.access).toBe('manager');
    // Its creator, matched by userId and not by name (K4).
    answer = () => detailItem({ creator: { id: 'u-nico', name: 'Nico' } });
    await eventDetailResource('mine').ensure();
    expect(getEventDetail('pm', 'mine')?.access).toBe('creator');
  });
});

describe('the form', () => {
  test('a new event opens blank, tomorrow, with me as its one guest', () => {
    const form = getEventForm('pm');
    expect(form).toMatchObject({ editing: false, save: 'enabled', creatorId: 'u-nico' });
    expect(form?.fields).toMatchObject({
      title: '',
      date: '2026-10-08',
      start: '10:00 AM',
      end: '11:00 AM',
      mode: 'In person',
      project: null,
      agenda: '',
    });
    expect(form?.fields.guests).toEqual([{ userId: 'u-nico', name: 'Nico' }]);
  });

  test('an edit fills in the event, its clock times and its guests by id', async () => {
    answer = () => detailItem();
    await eventDetailResource('e-review').ensure();
    const form = getEventForm('pm', 'e-review');
    expect(form).toMatchObject({ editing: true, save: 'enabled', creatorId: 'u-rina' });
    expect(form?.fields).toMatchObject({
      title: 'Onboarding design review',
      date: '2026-10-07',
      start: '2:00 PM',
      end: '3:00 PM',
      place: 'Meeting Room 2',
      meetingUrl: '',
      project: 'p-atlas',
      agenda: 'New onboarding flow\nFeedback from the trial users',
    });
    expect(form?.fields.guests.map((g) => g.userId)).toEqual(['u-rina', 'u-nico']);
  });

  test('an online event fills the link, not the place', async () => {
    answer = () =>
      detailItem({ locationType: 'online', locationText: null, meetingUrl: 'https://meet/x' });
    await eventDetailResource('online').ensure();
    expect(getEventForm('pm', 'online')?.fields).toMatchObject({
      mode: 'Online',
      place: '',
      meetingUrl: 'https://meet/x',
    });
  });

  test("Save is disabled with the server's reason when update is denied", async () => {
    answer = () => detailItem({ can: { update: 'PROJECT_IN_TRASH' } });
    await eventDetailResource('frozen').ensure();
    expect(getEventForm('pm', 'frozen')).toMatchObject({
      save: 'disabled',
      saveReason: expect.stringMatching(/Sampah/),
    });
  });

  test('is null while the event it edits has not been read, and after a 404', async () => {
    expect(getEventForm('pm', 'unknown')).toBeNull();
    answer = () => apiError('NOT_FOUND', 'Acara tidak ditemukan.', 404);
    await eventDetailResource('gone').ensure();
    expect(getEventForm('pm', 'gone')).toBeNull();
  });
});
