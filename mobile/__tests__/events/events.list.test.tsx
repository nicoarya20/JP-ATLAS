// Events ① list and ①b Filter & sort (port of prototype events.filter.test / events.items.test): upcoming events by
// schedule, the filter sheet's draft, the dot, group by type, Reset filters, the search, results buttons per role.
import { fireEvent, screen, within } from '@testing-library/react-native';

import { archiveEvent } from '../../src/data/events.store';
import { EVENTS } from '../../src/data/sample/events';
import { openEvents, resetEventStores } from '../helpers/events-router';

resetEventStores();

const PAST = ['kickoff', 'daily'];
const UPCOMING = EVENTS.filter((e) => !PAST.includes(e.id));
const card = (id: string) => screen.queryByTestId(`event-card-${id}`);
const shown = () => EVENTS.filter((e) => card(e.id)).map((e) => e.id);
/** The list's group headings (the Events title is a header too). */
const heads = () =>
  screen
    .getAllByRole('header')
    .map((h) => h.props.children)
    .filter((t) => t !== 'Events');
const filterButton = () => screen.getByRole('button', { name: 'Filter and sort' });
const filterOn = () => filterButton().props.accessibilityValue?.text === 'Filters on';
const sheet = () => within(screen.getByTestId('filter-sheet'));
const press = (name: string) => fireEvent.press(sheet().getByRole('button', { name }));

async function openFilter() {
  await fireEvent.press(filterButton());
  expect(screen.getByRole('header', { name: 'Filter & sort' })).toBeOnTheScreen();
}
const apply = () => fireEvent.press(sheet().getByText('Apply'));

describe('events list', () => {
  it('opens on the upcoming events by schedule, without the filter dot', async () => {
    await openEvents('/events');
    expect(screen.getByTestId('screen-events')).toBeOnTheScreen();
    expect(screen.getByLabelText('Search title or location…')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'List' })).toBeSelected();
    expect(shown()).toEqual(UPCOMING.map((e) => e.id));
    expect(heads()).toContain('Today · Wed, Oct 7');
    expect(filterOn()).toBe(false);
  });

  it('marks a repeating event and leaves the results button off upcoming cards', async () => {
    await openEvents('/events');
    const sprint = card('sprint');
    expect(sprint && within(sprint).getByTestId('event-repeat')).toBeOnTheScreen();
    expect(screen.queryByText('View results')).not.toBeOnTheScreen();
    expect(screen.queryByText('Check results')).not.toBeOnTheScreen();
  });

  it('the search narrows the list by title or location', async () => {
    await openEvents('/events');
    await fireEvent.changeText(screen.getByLabelText('Search title or location…'), 'sinar');
    expect(shown()).toEqual(['sinar']);
  });

  it('opens the tapped card’s own detail', async () => {
    await openEvents('/events');
    await fireEvent.press(screen.getByTestId('event-card-sinar'));
    expect(screen).toHavePathname('/events/sinar');
    expect(screen.getByTestId('screen-event')).toBeOnTheScreen();
    expect(screen.getByText('Progress presentation to PT Sinar')).toBeOnTheScreen();
  });

  it('the Member empty state offers New event', async () => {
    for (const e of EVENTS) archiveEvent(e.id, 'Nico');
    await openEvents('/events', 'member');
    expect(screen.getByTestId('events-empty')).toBeOnTheScreen();
    expect(screen.getByText('No events yet')).toBeOnTheScreen();
    const empty = within(screen.getByTestId('events-empty'));
    await fireEvent.press(empty.getByRole('button', { name: 'New event' }));
    expect(screen).toHavePathname('/events/new');
  });
});

describe('events results buttons', () => {
  const pastList = async (role: 'pm' | 'member') => {
    await openEvents('/events', role);
    await openFilter();
    await press('Past');
    await apply();
  };

  it('PM: View results on the confirmed kickoff, Check results on the unconfirmed stand-up', async () => {
    await pastList('pm');
    expect(shown()).toEqual(PAST);
    const kickoff = card('kickoff');
    const daily = card('daily');
    expect(kickoff && within(kickoff).getByText('View results')).toBeOnTheScreen();
    expect(daily && within(daily).getByText('Check results')).toBeOnTheScreen();
    expect(filterOn()).toBe(true);
    // one stop per card: the results button is the card's named action, not a second element
    expect(daily?.props.accessibilityActions).toEqual([
      { name: 'activate' },
      { name: 'results', label: 'Check results' },
    ]);
    expect(screen.queryByRole('button', { name: 'Check results' })).not.toBeOnTheScreen();
    await fireEvent(daily as never, 'accessibilityAction', {
      nativeEvent: { actionName: 'results' },
    });
    expect(screen).toHavePathname('/events/daily/outcomes/3');
  });

  it('PM: the visible Check results button opens the same screen', async () => {
    await pastList('pm');
    await fireEvent.press(screen.getByText('Check results'));
    expect(screen).toHavePathname('/events/daily/outcomes/3');
  });

  it('Member: View results on both, which opens the stand-up’s outcomes to read', async () => {
    await pastList('member');
    expect(screen.getAllByText('View results')).toHaveLength(2);
    expect(screen.queryByText('Check results')).not.toBeOnTheScreen();
  });
});

describe('events filter & sort', () => {
  it('has Show, Event type, Project and Group by, the default draft picked', async () => {
    await openEvents('/events');
    await openFilter();
    for (const h of ['Show', 'Event type', 'Project', 'Group by'])
      expect(sheet().getByRole('header', { name: h })).toBeOnTheScreen();
    expect(sheet().getByRole('button', { name: 'Upcoming' })).toBeSelected();
    expect(sheet().getAllByRole('button', { name: 'All' })[0]).toBeSelected();
  });

  it('narrows to one type and lights the dot, and keeps upcoming on top of it', async () => {
    await openEvents('/events');
    await openFilter();
    await press('Meeting');
    await apply();
    expect(screen).toHavePathname('/events');
    expect(shown()).toEqual(['rehearsal']);
    expect(filterOn()).toBe(true);
  });

  it('groups the list by type in form order', async () => {
    await openEvents('/events');
    await openFilter();
    await fireEvent.press(sheet().getByLabelText('Type'));
    await apply();
    expect(heads()).toEqual(['Meeting', 'Review', 'Important', 'Team event']);
    expect(shown().sort()).toEqual(UPCOMING.map((e) => e.id).sort());
    expect(filterOn()).toBe(false);
  });

  it('offers Reset filters when no event matches; the search alone says so', async () => {
    await openEvents('/events');
    await fireEvent.changeText(screen.getByLabelText('Search title or location…'), 'nothing here');
    expect(screen.getByText('No events match this search.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    expect(shown()).toEqual(UPCOMING.map((e) => e.id));
  });

  it('says "these filters" once a filter is on, search or not', async () => {
    await openEvents('/events');
    await openFilter();
    await press('Important');
    await apply();
    await fireEvent.changeText(screen.getByLabelText('Search title or location…'), 'nothing here');
    expect(screen.getByText('No events match these filters.')).toBeOnTheScreen();
    expect(screen.queryByText('No events match this search.')).not.toBeOnTheScreen();
  });

  it('names a card by everything it shows', async () => {
    await openEvents('/events');
    expect(card('sinar')?.props.accessibilityLabel).toMatch(
      /^Progress presentation to PT Sinar, Thu, Oct 8, .+–.+, .+, Important, (Upcoming|Today)$/,
    );
    expect(card('sinar')?.props.accessibilityActions).toBeUndefined();
  });

  it('Reset puts the draft back to upcoming, every type, by schedule', async () => {
    await openEvents('/events');
    await openFilter();
    await press('Past');
    await press('Meeting');
    await fireEvent.press(sheet().getByLabelText('Type'));
    await fireEvent.press(sheet().getByText('Reset'));
    expect(sheet().getByRole('button', { name: 'Upcoming' })).toBeSelected();
    expect(sheet().getByRole('button', { name: 'Meeting' })).not.toBeSelected();
    expect(sheet().getByLabelText('Schedule')).toBeChecked();
  });

  it('leaves Show off the calendar’s sheet', async () => {
    await openEvents('/events?view=calendar');
    await openFilter();
    expect(sheet().queryByRole('header', { name: 'Show' })).not.toBeOnTheScreen();
    expect(sheet().getByRole('header', { name: 'Event type' })).toBeOnTheScreen();
  });
});
