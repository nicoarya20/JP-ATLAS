import { resetArchive } from '../../src/data/archive.store';
import {
  getEventDetail,
  getEventForm,
  getEventsCalendar,
  getEventsList,
  stepCalendar,
} from '../../src/data/events';
import { BASE_QUERY, GROUP_TYPE, TYPE_FILTERS } from '../../src/data/events.query';
import { getEventResults, getOutcomes } from '../../src/data/events.results';
import {
  archiveEvent,
  cancelEvent,
  confirmOutcomes,
  resetEvents,
} from '../../src/data/events.store';
import { moveTask, resetTasks } from '../../src/data/tasks.store';

// What each Events screen gets, per role, on the prototype's sample day (Wed, Oct 7, 2026).

afterEach(() => {
  resetEvents();
  resetTasks();
  resetArchive();
});

const cards = (role: 'member' | 'pm' | 'admin', query = BASE_QUERY, search = '') =>
  getEventsList(role, { query, search }).groups.flatMap((g) => g.data);
const dots = (role: 'member' | 'pm', picked = '2026-10-07', query = BASE_QUERY) =>
  Object.fromEntries(
    getEventsCalendar(role, { view: 'month', picked, query })
      .days.filter((d) => d.dots)
      .map((d) => [d.day, d.dots]),
  );

describe('events list', () => {
  test('cards carry the time tile, status, route and results button', () => {
    const past = { ...BASE_QUERY, when: 1 };
    const [kickoff, daily] = cards('pm', past);
    expect(kickoff).toMatchObject({
      when: 'Thu 1',
      status: 'Done',
      results: 'view',
      href: '/events/kickoff/results',
    });
    expect(daily).toMatchObject({
      when: '9:00',
      results: 'check',
      href: '/events/daily/outcomes/3',
    });
    expect(cards('member', past)[1]?.results).toBe('view');
    const sprint = cards('pm').find((c) => c.event.id === 'sprint');
    expect(sprint).toMatchObject({
      when: 'Fri 9',
      status: 'Upcoming',
      results: null,
      href: '/events/sprint',
    });
  });

  test('applies query and search, and reports the filter dot', () => {
    const list = getEventsList('pm', { query: { ...BASE_QUERY, group: GROUP_TYPE } });
    expect(list.groups.map((g) => g.title)).toEqual([
      'Meeting',
      'Review',
      'Important',
      'Team event',
    ]);
    expect(list.filtered).toBe(false);
    expect(list.empty).toBe(false);
    const sinar = getEventsList('pm', { query: { ...BASE_QUERY, project: 'sinar' } });
    expect([sinar.groups, sinar.filtered, sinar.empty]).toEqual([[], true, false]);
    expect(cards('pm', BASE_QUERY, 'pantry').map((c) => c.event.id)).toEqual(['party']);
  });
});

describe('events calendar', () => {
  test('month grid: dots for one or two-plus events, a recurring event on each date', () => {
    expect(dots('pm')).toEqual({ 1: 1, 7: 2, 8: 1, 9: 1, 13: 1, 15: 1, 23: 1 });
    expect(dots('member')).toEqual({ 1: 1, 7: 2, 9: 1, 15: 1, 23: 1 });
    expect(dots('pm', '2026-11-01')).toEqual({ 6: 1, 20: 1 });
  });

  test('opens on today with its agenda by start time; Show is ignored, type is kept', () => {
    const c = getEventsCalendar('pm', { view: 'month', query: { ...BASE_QUERY, when: 1 } });
    expect([c.title, c.lead, c.days.length, c.agendaDate]).toEqual([
      'October 2026',
      3,
      31,
      'Wed, Oct 7',
    ]);
    expect(c.days.find((d) => d.selected)?.label).toBe('Wed, Oct 7');
    expect(c.agenda.map((a) => [a.event.id, a.status])).toEqual([
      ['daily', 'Done'],
      ['review', 'Today'],
    ]);
    expect(c.filtered).toBe(false);
    const review = TYPE_FILTERS.indexOf('Review');
    const typed = getEventsCalendar('pm', {
      view: 'month',
      query: { ...BASE_QUERY, type: review },
    });
    expect(typed.agenda.map((a) => a.event.id)).toEqual(['review']);
    expect(typed.filtered).toBe(true);
  });

  test('week view and the arrows', () => {
    const w = getEventsCalendar('pm', { view: 'week', picked: '2026-10-28', query: BASE_QUERY });
    expect([w.title, w.lead, w.days.length]).toEqual(['Oct 26 – Nov 1', 0, 7]);
    expect(stepCalendar('week', '2026-10-07', 1)).toBe('2026-10-14');
    expect(stepCalendar('month', '2026-10-07', -1)).toBe('2026-09-01');
    expect(stepCalendar('month', '2026-09-01', 1)).toBe('2026-10-07');
  });

  test('one canceled occurrence keeps the later dates Upcoming', () => {
    cancelEvent('sprint', 'Holiday', 'Nico', { once: true });
    const on = (picked: string) =>
      getEventsCalendar('pm', { view: 'month', picked, query: BASE_QUERY }).agenda[0]?.status;
    expect([on('2026-10-09'), on('2026-10-23')]).toEqual(['Canceled', 'Upcoming']);
  });
});

describe('event detail and form', () => {
  test('editor, ⋯ menu and access note per role', () => {
    expect(getEventDetail('pm', 'review')).toMatchObject({
      editor: true,
      menu: ['cancel', 'archive'],
      access: null,
      status: 'Today',
      project: 'Atlas Project',
    });
    expect(getEventDetail('admin', 'review')).toMatchObject({ editor: true, access: 'admin' });
    expect(getEventDetail('member', 'review')).toMatchObject({
      editor: false,
      menu: [],
      access: 'member',
    });
    expect(getEventDetail('pm', 'sprint')?.access).toBe('creator');
    cancelEvent('review', 'Room taken', 'Rina');
    expect(getEventDetail('pm', 'review')?.menu).toEqual(['archive']);
    expect(getEventDetail('pm', 'nope')).toBeNull();
  });

  test('attendees start with the creator and mark the note-taker', () => {
    expect(getEventDetail('pm', 'review')?.attendees).toEqual([
      { name: 'Rina', creator: true, noteTaker: false },
      { name: 'Nico', creator: false, noteTaker: false },
      { name: 'Dodi', creator: false, noteTaker: true },
    ]);
  });

  test('an archived event still opens', () => {
    archiveEvent('review', 'Rina');
    expect(getEventDetail('pm', 'review')?.event.title).toBe('Onboarding design review');
  });

  test('form: a blank meeting tomorrow, or the event filled in', () => {
    expect(getEventForm('member')).toEqual({
      creator: 'Dodi',
      fields: {
        title: '',
        date: '2026-10-08',
        start: '10:00 AM',
        end: '11:00 AM',
        mode: 'In person',
        place: '',
        attendees: ['Dodi'],
        type: 'Meeting',
        project: 'atlas',
        agenda: [],
        repeat: '',
      },
    });
    expect(getEventForm('pm', 'sprint')?.fields).toMatchObject({
      date: '2026-10-09',
      start: '1:00 PM',
      end: '2:00 PM',
      repeat: 'every 2 weeks',
      place: 'Meeting Room 1',
    });
    expect(getEventForm('pm', 'sinar')?.fields.place).toBe('');
    expect(getEventForm('pm', 'nope')).toBeNull();
  });
});

describe('meeting outcomes', () => {
  test('a Member only reads the stand-up drafts', () => {
    expect(getOutcomes('member', 'daily')).toMatchObject({
      readOnly: true,
      project: 'Atlas Project',
    });
    expect(getOutcomes('pm', 'daily')?.minutes.tasks.map((t) => t.due)).toEqual(['2026-10-09', '']);
    expect(getOutcomes('pm', 'nope')).toBeNull();
  });

  test('the kickoff results read their tasks live from Tasks', () => {
    const r = getEventResults('kickoff');
    expect(r?.tasks.map((t) => [t.no, t.status])).toEqual([
      [8, 'Done'],
      [12, 'In progress'],
      [14, 'To do'],
    ]);
    expect(r).toMatchObject({ done: 1, confirmed: 'Confirmed by Nico · Oct 1, 2026, 11:40 AM' });
    moveTask(14, 'Done');
    expect(getEventResults('kickoff')?.done).toBe(2);
    expect(getEventResults('review')).toBeNull();
  });

  test('Step 3 results list the tasks it created', () => {
    const nos = confirmOutcomes(
      'daily',
      [{ title: 'Fix login', who: 'Rina', due: '2026-10-09' }],
      'Nico',
    );
    expect(getEventResults('daily')).toMatchObject({
      confirmed: 'Confirmed by Nico · Oct 7',
      tasks: [{ no: nos[0], title: 'Fix login', status: 'To do', who: 'Rina', exists: true }],
      done: 0,
      source: ['Source: voice recording', 'Written by Dodi (note-taker) · last edited 9:20 AM'],
    });
  });
});
