// Events ② calendar (port of prototype events.calendar.test / the calendar half of events.filter.test): Month opens on
// today, a tapped date shows its agenda, the arrows step months and weeks across month ends, dots follow the query.
// Plus the W3c screen-reader names (day counts, agenda cards, Month / Week radios) and the filtered-out month's Reset.
import { fireEvent, screen, within } from '@testing-library/react-native';

import { openEvents, resetEventStores } from '../helpers/events-router';

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
};

describe('events calendar', () => {
  it('opens on Month with today picked and its agenda', async () => {
    await openEvents('/events?view=calendar');
    expect(screen.getByRole('tab', { name: 'Calendar' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Month' })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeOnTheScreen();
    expect(screen.getByText('October 2026')).toBeOnTheScreen();
    expect(dates()).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    expect(day('Wed, Oct 7')).toBeSelected();
    expect(agendaHead()).toBe('Wed, Oct 7 · 2 events');
    expect(screen.getByText('Onboarding design review')).toBeOnTheScreen();
    expect(screen.getByText('Atlas daily stand-up')).toBeOnTheScreen();
  });

  it('draws one dot for one event, two for more, past events too', async () => {
    await openEvents('/events?view=calendar');
    for (const d of ['01', '08', '09', '13', '15', '23']) expect(dots(`2026-10-${d}`)).toBe(1);
    expect(dots('2026-10-07')).toBe(2);
    expect(dots('2026-10-02')).toBe(0);
  });

  it('shows the tapped date’s agenda, a recurring event on each of its dates', async () => {
    await openEvents('/events?view=calendar');
    await fireEvent.press(day('Thu, Oct 8'));
    expect(day('Thu, Oct 8')).toBeSelected();
    expect(day('Wed, Oct 7')).not.toBeSelected();
    expect(agendaHead()).toBe('Thu, Oct 8 · 1 event');
    expect(screen.getByText('Progress presentation to PT Sinar')).toBeOnTheScreen();
    expect(screen.queryByText('Onboarding design review')).not.toBeOnTheScreen();
    await fireEvent.press(day('Fri, Oct 23'));
    expect(screen.getByText('Atlas sprint review')).toBeOnTheScreen();
  });

  it('says so when the tapped date has no events', async () => {
    await openEvents('/events?view=calendar');
    await fireEvent.press(day('Fri, Oct 2'));
    expect(agendaHead()).toBe('Fri, Oct 2 · 0 events');
    expect(screen.getByText('No events on this day.')).toBeOnTheScreen();
  });

  it('Week shows only the picked date’s Mon–Sun row', async () => {
    await openEvents('/events?view=calendar');
    await radio('Week');
    expect(dates()).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(screen.getByText('Oct 5 – 11')).toBeOnTheScreen();
    expect(screen.queryByText('October 2026')).not.toBeOnTheScreen();
    expect(day('Wed, Oct 7')).toBeSelected();
    await radio('Month');
    expect(dates()).toHaveLength(31);
  });

  it('month arrows open the next and previous months, picking the 1st', async () => {
    await openEvents('/events?view=calendar');
    await tap('Next month');
    expect(screen.getByText('November 2026')).toBeOnTheScreen();
    expect(dates()).toHaveLength(30);
    expect(dotted()).toEqual([6, 20]);
    expect(agendaHead()).toBe('Sun, Nov 1 · 0 events');
    await tap('Previous month');
    await tap('Previous month');
    expect(screen.getByText('September 2026')).toBeOnTheScreen();
    expect(dotted()).toEqual([]);
    await tap('Next month');
    expect(day('Wed, Oct 7')).toBeSelected();
  });

  it('week arrows step a week into the next and previous months', async () => {
    await openEvents('/events?view=calendar');
    await radio('Week');
    await tap('Next week');
    expect(dates()).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(agendaHead()).toBe('Wed, Oct 14 · 0 events');
    await tap('Previous week');
    await tap('Previous week');
    expect(dates()).toEqual([28, 29, 30, 1, 2, 3, 4]);
    expect(screen.getByText('Sep 28 – Oct 4')).toBeOnTheScreen();
    for (let i = 0; i < 5; i++) await tap('Next week');
    expect(dates()).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(dotted()).toEqual([6]);
  });

  it('opens the done kickoff’s results from its agenda', async () => {
    await openEvents('/events?view=calendar');
    await fireEvent.press(day('Thu, Oct 1'));
    expect(agendaHead()).toBe('Thu, Oct 1 · 1 event');
    await fireEvent.press(screen.getByRole('button', { name: /^Atlas kickoff, / }));
    expect(screen).toHavePathname('/events/kickoff/results');
  });

  it('keeps the query: a Review filter leaves only the reviews’ dots and agenda', async () => {
    await openEvents('/events?view=calendar');
    await filterBy('Review');
    expect(
      screen.getByRole('button', { name: 'Filter and sort' }).props.accessibilityValue,
    ).toEqual({
      text: 'Filters on',
    });
    expect(dotted()).toEqual([7, 9, 23]);
    expect(agendaHead()).toBe('Wed, Oct 7 · 1 event');
    expect(screen.queryByText('Atlas daily stand-up')).not.toBeOnTheScreen();
  });

  it('a Member sees only the events they attend', async () => {
    await openEvents('/events?view=calendar', 'member');
    await fireEvent.press(day('Thu, Oct 8'));
    expect(screen.queryByText('Progress presentation to PT Sinar')).not.toBeOnTheScreen();
  });

  it('names each date with its event count and each agenda card with all it shows', async () => {
    await openEvents('/events?view=calendar');
    expect(screen.getByRole('button', { name: 'Wed, Oct 7, 2 events' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Thu, Oct 8, 1 event' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fri, Oct 2' })).toBeOnTheScreen();
    const review = screen.getByRole('button', { name: /^Onboarding design review, / });
    expect(review.props.accessibilityLabel).toMatch(
      /^Onboarding design review, Wed, Oct 7, .+, .+, Review, (Upcoming|Today|Done)$/,
    );
  });

  it('keeps List / Calendar as tabs and makes Month / Week a radio group', async () => {
    await openEvents('/events?view=calendar');
    expect(screen.getByTestId('events-view').props.accessibilityRole).toBe('tablist');
    const views = screen.getByTestId('calendar-view').props;
    expect([views.accessibilityRole, views.accessibilityLabel]).toEqual([
      'radiogroup',
      'Calendar view',
    ]);
    expect(screen.queryByRole('tab', { name: 'Month' })).not.toBeOnTheScreen();
    await radio('Week');
    expect(screen.getByRole('radio', { name: 'Week' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Month' })).not.toBeChecked();
  });

  it('offers Reset filters when the filters hide every event of the shown month', async () => {
    await openEvents('/events?view=calendar');
    await filterBy('Important');
    expect(dotted()).toEqual([8]);
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
    await tap('Next month');
    expect(dotted()).toEqual([]);
    expect(screen.getByText('No events match these filters.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    expect(dotted()).toEqual([6, 20]);
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
    expect(screen.getByTestId('agenda-head')).toBeOnTheScreen();
  });

  it('an empty month without filters shows no Reset', async () => {
    await openEvents('/events?view=calendar');
    await tap('Previous month');
    expect(dotted()).toEqual([]);
    expect(screen.queryByTestId('no-match')).not.toBeOnTheScreen();
  });
});
