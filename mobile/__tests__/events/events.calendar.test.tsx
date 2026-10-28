// Events ② calendar against a stubbed `GET /api/app/events?from=&to=`: Month opens on today (the server's) with one
// request for the month, a tapped date shows its agenda, the arrows ask for the next window, past events count too,
// the type filter goes to the server, and a month the filters empty offers Reset. Plus the screen-reader names.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { EventListItemWire } from '../../src/data/events.wire';
import {
  eventsPage,
  partyItem,
  reviewDetail,
  reviewItem,
  syncItem,
} from '../helpers/events-fixtures';
import { eventsServer, openEvents } from '../helpers/events-router';
import { sheetGone } from '../helpers/sheet-gone';

const server = eventsServer();

const EVENTS: EventListItemWire[] = [
  reviewItem({
    id: 'e-kickoff',
    title: 'Atlas kickoff',
    kind: 'meeting',
    startsAt: '2026-10-01T02:00:00.000Z',
    endsAt: '2026-10-01T03:00:00.000Z',
  }),
  reviewItem({
    id: 'e-daily',
    title: 'Atlas daily stand-up',
    kind: 'meeting',
    startsAt: '2026-10-07T02:00:00.000Z',
    endsAt: '2026-10-07T02:15:00.000Z',
  }),
  reviewItem(),
  syncItem(),
  partyItem(),
  partyItem({
    id: 'e-demo',
    title: 'Demo day',
    startsAt: '2026-11-06T02:00:00.000Z',
    endsAt: '2026-11-06T03:00:00.000Z',
  }),
];

/** The calendar windows asked so far: "from–to kind". */
const windows = () =>
  server
    .calls()
    .filter((u) => u.includes('from='))
    .map((u) => {
      const p = new URL(u).searchParams;
      return [p.get('from'), p.get('to'), p.get('kind')].filter(Boolean).join(' ');
    });

beforeEach(() =>
  server.use({
    '/api/app/events/e-kickoff': {
      body: reviewDetail({ id: 'e-kickoff', title: 'Atlas kickoff' }),
    },
    '/api/app/events?': (url) => {
      const p = new URL(url).searchParams;
      const from = p.get('from') ?? '';
      const to = p.get('to') ?? '';
      const kind = p.get('kind');
      // The team zone is UTC+7: every fixture starts between 02:00Z and 11:00Z, so the UTC date is the team's date.
      const items = EVENTS.filter((e) => {
        const day = e.startsAt.slice(0, 10);
        return day >= from && day <= to && (!kind || e.kind === kind);
      });
      return { body: eventsPage(items) };
    },
  }),
);

const grid = () => within(screen.getByTestId('cal-grid'));
const dates = () =>
  grid()
    .getAllByRole('button')
    .map((b) => Number(within(b).getByText(/^\d+$/).props.children));
const dotted = () =>
  grid()
    .getAllByRole('button')
    .filter((b) => within(b).queryAllByTestId('cal-dot').length)
    .map((b) => Number(within(b).getByText(/^\d+$/).props.children));
const day = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}(, |$)`) });
const agendaHead = () => screen.getByTestId('agenda-head').props.children;
const tap = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const radio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const filterBy = async (type: string) => {
  await fireEvent.press(screen.getByRole('button', { name: 'Filter and sort' }));
  const sheet = within(screen.getByTestId('filter-sheet'));
  expect(sheet.queryByRole('button', { name: 'Past' })).not.toBeOnTheScreen();
  await fireEvent.press(sheet.getByRole('button', { name: type }));
  await fireEvent.press(sheet.getByText('Apply'));
  await sheetGone();
};
const openCalendar = async () => {
  await openEvents('/events?view=calendar');
  await screen.findByTestId('agenda-head');
};

describe('events calendar', () => {
  it('opens on Month with today picked, asking for the whole month once', async () => {
    await openCalendar();
    expect(screen.getByRole('tab', { name: 'Calendar' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Month' })).toBeChecked();
    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(dates()).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(windows()).toEqual(['2026-10-01 2026-10-31']);
    expect(day('Wed, Oct 7')).toBeSelected();
    expect(agendaHead()).toBe('Wed, Oct 7 · 2 events');
    // By start: the stand-up at 9:00 AM before the review at 2:00 PM.
    const agenda = screen.getAllByTestId(/^agenda-e-/).map((c) => c.props.testID);
    expect(agenda).toEqual(['agenda-e-daily', 'agenda-e-review']);
  });

  it('draws one dot for one event, two for more, past events too', async () => {
    await openCalendar();
    expect(dotted()).toEqual([1, 7, 8, 20]);
    expect(within(screen.getByTestId('cal-2026-10-07')).getAllByTestId('cal-dot')).toHaveLength(2);
  });

  it('shows the tapped date’s agenda, or says it has none', async () => {
    await openCalendar();
    await fireEvent.press(day('Thu, Oct 8'));
    expect(agendaHead()).toBe('Thu, Oct 8 · 1 event');
    expect(screen.getByText('Client sync')).toBeOnTheScreen();
    await fireEvent.press(day('Fri, Oct 2'));
    expect(agendaHead()).toBe('Fri, Oct 2 · 0 events');
    expect(screen.getByText('No events on this day.')).toBeOnTheScreen();
  });

  it('the arrows ask for the next window: a month, or a Mon–Sun week', async () => {
    await openCalendar();
    await tap('Next month');
    expect(screen.getByText('November 2026')).toBeOnTheScreen();
    await waitFor(() => expect(dotted()).toEqual([6]));
    expect(agendaHead()).toBe('Sun, Nov 1 · 0 events');
    // Back in today's month, today is picked again: its week is Oct 5–11.
    await tap('Previous month');
    await radio('Week');
    expect(screen.getByText('Oct 5 – 11')).toBeOnTheScreen();
    expect(dates()).toEqual([5, 6, 7, 8, 9, 10, 11]);
    await waitFor(() => expect(dotted()).toEqual([7, 8]));
    await tap('Previous week');
    expect(dates()).toEqual([28, 29, 30, 1, 2, 3, 4]);
    await waitFor(() => expect(dotted()).toEqual([1]));
    expect(windows()).toEqual([
      '2026-10-01 2026-10-31',
      '2026-11-01 2026-11-30',
      '2026-10-05 2026-10-11',
      '2026-09-28 2026-10-04',
    ]);
  });

  it('opens an event from its agenda', async () => {
    await openCalendar();
    await fireEvent.press(day('Thu, Oct 1'));
    await fireEvent.press(screen.getByRole('button', { name: /^Atlas kickoff, / }));
    expect(screen).toHavePathname('/events/e-kickoff');
  });

  it('a type filter goes to the server; a month it empties offers Reset filters', async () => {
    await openCalendar();
    await filterBy('Team event');
    await waitFor(() => expect(dotted()).toEqual([20]));
    expect(windows()).toContain('2026-10-01 2026-10-31 team');
    await filterBy('Important');
    expect(await screen.findByText('No events match these filters.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    await waitFor(() => expect(dotted()).toEqual([1, 7, 8, 20]));
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
  });

  it('an empty month without filters shows no Reset', async () => {
    await openCalendar();
    await tap('Previous month');
    await waitFor(() => expect(windows()).toContain('2026-09-01 2026-09-30'));
    expect(dotted()).toEqual([]);
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
  });

  it('names each date with its count and each agenda card with all it shows', async () => {
    await openCalendar();
    expect(screen.getByRole('button', { name: 'Wed, Oct 7, 2 events' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Fri, Oct 2' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^Onboarding design review, / }).props.accessibilityLabel,
    ).toBe(
      'Onboarding design review, Wed, Oct 7, 2:00–3:00 PM, In person · Meeting Room 2, Review, Today',
    );
    const views = screen.getByTestId('calendar-view').props;
    expect([views.accessibilityRole, views.accessibilityLabel]).toEqual([
      'radiogroup',
      'Calendar view',
    ]);
  });

  it('a failed month says so; Try again asks again', async () => {
    let fail = true;
    server.use({
      '/api/app/events?': () =>
        fail
          ? { status: 500, body: { error: 'Server sedang sibuk.', code: 'INTERNAL' } }
          : { body: eventsPage([reviewItem()]) },
    });
    await openEvents('/events?view=calendar');
    expect(await screen.findByTestId('calendar-failed')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('agenda-head')).toBeOnTheScreen();
  });
});
