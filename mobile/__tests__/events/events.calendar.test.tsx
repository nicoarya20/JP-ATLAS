// Events ② calendar (port of prototype events.calendar.test / the calendar half of
// events.filter.test), against the fake `/api/app/events`: Month opens on today, a tapped date shows
// its agenda, the arrows step months and weeks across month ends, dots follow the query. Plus the
// W3c screen-reader names (day counts, agenda cards, Month / Week radios) and the Reset of a month
// the filters empty.
//
// The shown month is a server read now (`?from=&to=`, GAP-A9), so stepping a month refetches: every
// assertion about the grid waits for that answer. Recurring occurrences are gone with recurrence
// itself (GAP-A4), so an event appears on its own date and nowhere else.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { pageFor } from '../helpers/events-api-fixtures';
import { answerEvents, eventCalls, openEvents, resetEventStores } from '../helpers/events-router';

resetEventStores();

const grid = () => within(screen.getByTestId('cal-grid'));
/** Day numbers in the grid, in order. */
const dates = () =>
  grid()
    .getAllByRole('button')
    .map((b) => Number(within(b).getByText(/^\d+$/).props.children));
/** Day numbers that carry a dot. */
const dotted = () =>
  grid()
    .getAllByRole('button')
    .filter((b) => within(b).queryAllByTestId('cal-dot').length)
    .map((b) => Number(within(b).getByText(/^\d+$/).props.children));
const dots = (iso: string) =>
  within(screen.getByTestId(`cal-${iso}`)).queryAllByTestId('cal-dot').length;
/** A date by its spoken name, with or without its ", 2 events" count. */
const day = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}(, |$)`) });
const agendaHead = () => screen.getByTestId('agenda-head').props.children;
const tap = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const radio = (name: string) => fireEvent.press(screen.getByRole('radio', { name }));
const filterBy = async (type: string) => {
  await fireEvent.press(screen.getByRole('button', { name: 'Filter and sort' }));
  const sheet = within(screen.getByTestId('filter-sheet'));
  await fireEvent.press(sheet.getByRole('button', { name: type }));
  await fireEvent.press(sheet.getByText('Apply'));
  await drawn();
};

/** The grid is drawn from a server read; wait for it rather than assert on the loading frame. */
const drawn = () =>
  waitFor(() => expect(screen.queryByTestId('calendar-loading')).not.toBeOnTheScreen());

const openCalendar = async (role: 'pm' | 'member' = 'pm') => {
  await openEvents('/events?view=calendar', role);
  await drawn();
};

/** The windows the calendar asked for, as `from…to`. */
const windows = () =>
  eventCalls()
    .filter((c) => c.path === '/api/app/events' && c.search.get('from'))
    .map((c) => `${c.search.get('from')}…${c.search.get('to')}`);

describe('events calendar', () => {
  it('opens on Month with today picked, and asks the server for the whole month', async () => {
    await openCalendar();
    expect(screen.getByRole('tab', { name: 'Calendar' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Month' })).toBeChecked();
    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(dates()).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(day('Wed, Oct 7')).toBeSelected();
    expect(agendaHead()).toBe('Wed, Oct 7 · 1 event');
    expect(screen.getByText('Onboarding design review')).toBeOnTheScreen();
    // One read covers both halves of today, which the Upcoming/Past tabs could not (A9).
    expect(windows()).toEqual(['2026-10-01…2026-10-31']);
  });

  it('draws a dot per date, two for more than one, past events included', async () => {
    await openCalendar();
    for (const d of ['01', '06', '08', '09', '25', '30']) expect(dots(`2026-10-${d}`)).toBe(1);
    expect(dots('2026-10-02')).toBe(0);
  });

  it('shows the tapped date’s agenda without asking again', async () => {
    await openCalendar();
    const before = windows().length;
    await fireEvent.press(day('Thu, Oct 8'));
    expect(day('Thu, Oct 8')).toBeSelected();
    expect(day('Wed, Oct 7')).not.toBeSelected();
    expect(agendaHead()).toBe('Thu, Oct 8 · 1 event');
    expect(screen.getByText('Progress presentation to PT Sinar')).toBeOnTheScreen();
    expect(screen.queryByText('Onboarding design review')).not.toBeOnTheScreen();
    // Picking a date inside the shown month is not a new window.
    expect(windows()).toHaveLength(before);
  });

  it('says so when the tapped date has no events', async () => {
    await openCalendar();
    await fireEvent.press(day('Fri, Oct 2'));
    expect(agendaHead()).toBe('Fri, Oct 2 · 0 events');
    expect(screen.getByText('No events on this day.')).toBeOnTheScreen();
  });

  it('Week shows the picked date’s Mon–Sun row and asks for just that week', async () => {
    await openCalendar();
    await radio('Week');
    await drawn();
    expect(dates()).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(screen.getByText('Oct 5 – 11')).toBeOnTheScreen();
    expect(screen.queryByText('October 2026')).not.toBeOnTheScreen();
    expect(day('Wed, Oct 7')).toBeSelected();
    expect(windows().at(-1)).toBe('2026-10-05…2026-10-11');
    await radio('Month');
    await drawn();
    expect(dates()).toHaveLength(31);
  });

  it('month arrows open the next and previous months, picking the 1st', async () => {
    await openCalendar();
    await tap('Next month');
    await drawn();
    expect(screen.getByText('November 2026')).toBeOnTheScreen();
    expect(dates()).toHaveLength(30);
    expect(dotted()).toEqual([]);
    expect(agendaHead()).toBe('Sun, Nov 1 · 0 events');
    expect(windows().at(-1)).toBe('2026-11-01…2026-11-30');
    await tap('Previous month');
    await drawn();
    // Back into today's month puts today back, as the prototype does.
    expect(day('Wed, Oct 7')).toBeSelected();
  });

  it('week arrows step a week into the next and previous months', async () => {
    await openCalendar();
    await radio('Week');
    await drawn();
    await tap('Next week');
    await drawn();
    expect(dates()).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(agendaHead()).toBe('Wed, Oct 14 · 0 events');
    await tap('Previous week');
    await drawn();
    await tap('Previous week');
    await drawn();
    expect(dates()).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(screen.getByText('Sep 28 – Oct 4')).toBeOnTheScreen();
    // A week crossing a month end is one window, not two reads.
    expect(windows().at(-1)).toBe('2026-09-28…2026-10-04');
  });

  it('opens an event from its agenda, always at its detail', async () => {
    await openCalendar();
    await fireEvent.press(day('Thu, Oct 1'));
    expect(agendaHead()).toBe('Thu, Oct 1 · 1 event');
    await fireEvent.press(screen.getByRole('button', { name: /^Atlas kickoff, / }));
    // Never the Results screen: that flow has no server data (GAP-A8).
    expect(screen).toHavePathname('/events/kickoff');
  });

  it('keeps the query: a Review filter is sent as a kind and leaves only the reviews', async () => {
    await openCalendar();
    await filterBy('Review');
    expect(
      screen.getByRole('button', { name: 'Filter and sort' }).props.accessibilityValue,
    ).toEqual({ text: 'Filters on' });
    await waitFor(() => expect(dotted()).toEqual([7, 9]));
    expect(agendaHead()).toBe('Wed, Oct 7 · 1 event');
    expect(screen.queryByText('Daily stand-up')).not.toBeOnTheScreen();
    expect(
      eventCalls().some((c) => c.search.get('from') && c.search.get('kind') === 'review'),
    ).toBe(true);
  });

  it('names each date with its event count and each agenda card with all it shows', async () => {
    await openCalendar();
    expect(screen.getByRole('button', { name: 'Wed, Oct 7, 1 event' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Fri, Oct 2' })).toBeOnTheScreen();
    const review = screen.getByRole('button', { name: /^Onboarding design review, / });
    expect(review.props.accessibilityLabel).toBe(
      'Onboarding design review, Wed, Oct 7, 2:00–3:00 PM, Meeting Room 2, Review, Today',
    );
  });

  it('keeps List / Calendar as tabs and makes Month / Week a radio group', async () => {
    await openCalendar();
    expect(screen.getByTestId('events-view').props.accessibilityRole).toBe('tablist');
    const views = screen.getByTestId('calendar-view').props;
    expect([views.accessibilityRole, views.accessibilityLabel]).toEqual([
      'radiogroup',
      'Calendar view',
    ]);
    expect(screen.queryByRole('tab', { name: 'Month' })).not.toBeOnTheScreen();
    await radio('Week');
    await drawn();
    expect(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Month' })).not.toBeChecked();
  });

  it('offers Reset filters when the filters empty the shown month', async () => {
    await openCalendar();
    await filterBy('Important');
    await waitFor(() => expect(dotted()).toEqual([8]));
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
    await tap('Next month');
    await drawn();
    expect(screen.getByText('No events match these filters.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    await drawn();
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
    expect(screen.getByTestId('agenda-head')).toBeOnTheScreen();
  });

  it('an empty month without filters shows no Reset', async () => {
    await openCalendar();
    await tap('Previous month');
    await drawn();
    expect(dotted()).toEqual([]);
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
  });

  it('says so when a window holds more events than one read can carry', async () => {
    answerEvents((call) =>
      call.search.get('from') ? { body: { ...pageFor(call.search), nextCursor: 'more' } } : null,
    );
    await openCalendar();
    expect(screen.getByText(/more events than can be shown at once/)).toBeOnTheScreen();
  });

  it('offers Try again when the window cannot be read', async () => {
    answerEvents((call) =>
      call.search.get('from')
        ? {
            status: 500,
            body: { error: 'Server bermasalah.', code: 'INTERNAL', status: 500, requestId: 'r1' },
          }
        : null,
    );
    await openEvents('/events?view=calendar');
    expect(await screen.findByTestId('calendar-failed')).toBeOnTheScreen();
    expect(screen.getByText('Server bermasalah.')).toBeOnTheScreen();
  });
});
