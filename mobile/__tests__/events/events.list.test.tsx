// Events ① list and ①b Filter & sort through the real route tree, against the fake
// `/api/app/events` (helpers/events-api-fixtures.ts): upcoming events by schedule, the filter
// sheet's draft, the dot, group by type, Reset filters, and the search text as a server query.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { PAST_IDS, SERVER_EVENTS } from '../helpers/events-api-fixtures';
import { answerEvents, eventCalls, openEvents, resetEventStores } from '../helpers/events-router';
import { listItem, page } from '../helpers/events-server';

resetEventStores();

const UPCOMING = SERVER_EVENTS.filter((e) => !PAST_IDS.includes(e.id)).map((e) => e.id);
const card = (id: string) => screen.queryByTestId(`event-card-${id}`);
const shown = () => SERVER_EVENTS.filter((e) => card(e.id)).map((e) => e.id);
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
const apply = () => fireEvent.press(sheet().getByText('Apply'));
const search = () => screen.getByLabelText('Search event title…');

async function openFilter() {
  await fireEvent.press(filterButton());
  expect(screen.getByRole('header', { name: 'Filter & sort' })).toBeOnTheScreen();
}

/** The list's own calls, as query objects. */
const asked = () =>
  eventCalls()
    .filter((c) => c.path === '/api/app/events')
    .map((c) => Object.fromEntries(c.search));

const listed = async (url = '/events', role: 'pm' | 'member' = 'pm') => {
  await openEvents(url, role);
  await waitFor(() => expect(screen.queryByTestId('events-loading')).not.toBeOnTheScreen());
};

describe('events list', () => {
  it('shows a loading state before the first answer', async () => {
    await openEvents('/events');
    // The list is asked for on mount; nothing is drawn until it answers.
    expect(screen.getByTestId('events-loading')).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByTestId('events-loading')).not.toBeOnTheScreen());
  });

  it('opens on the upcoming events by schedule, without the filter dot', async () => {
    await listed();
    expect(screen.getByTestId('screen-events')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'List' })).toBeSelected();
    expect(shown()).toEqual(UPCOMING);
    expect(heads()).toContain('Today · Wed, Oct 7');
    expect(filterOn()).toBe(false);
    expect(asked()).toEqual([{ tab: 'upcoming', limit: '30' }]);
  });

  it('asks the server for the search text instead of narrowing what is loaded', async () => {
    await listed();
    await act(async () => {
      fireEvent.changeText(search(), 'sinar');
    });
    // Typing settles first, so a word is one request and not one per keystroke.
    await waitFor(() => expect(shown()).toEqual(['sinar']));
    expect(asked().at(-1)).toEqual({ tab: 'upcoming', q: 'sinar', limit: '30' });
  });

  it('opens the tapped card’s own detail', async () => {
    await listed();
    await fireEvent.press(screen.getByTestId('event-card-sinar'));
    expect(screen).toHavePathname('/events/sinar');
    expect(await screen.findByText('Progress presentation to PT Sinar')).toBeOnTheScreen();
  });

  it('shows the empty state with New event when the first unfiltered page is empty', async () => {
    answerEvents((call) => (call.path === '/api/app/events' ? { body: page([]) } : null));
    await listed('/events', 'member');
    expect(screen.getByTestId('events-empty')).toBeOnTheScreen();
    const empty = within(screen.getByTestId('events-empty'));
    await fireEvent.press(empty.getByRole('button', { name: 'New event' }));
    expect(screen).toHavePathname('/events/new');
  });

  it("hides the empty state's New event when the server says this account may not create one", async () => {
    answerEvents((call) =>
      call.path === '/api/app/events' ? { body: page([], { caps: { createEvent: false } }) } : null,
    );
    await listed();
    const empty = within(screen.getByTestId('events-empty'));
    expect(empty.queryByRole('button', { name: 'New event' })).not.toBeOnTheScreen();
    // The tab bar's own "+" is still there: it lives in the shared navigation, which this wave may
    // not change. Noted in the Gelombang 1 hand-over as the one control `caps.createEvent` misses.
    expect(screen.queryByRole('button', { name: 'New event' })).toBeOnTheScreen();
  });

  it('offers Try again when the list cannot be read, and shows the server’s own words', async () => {
    answerEvents((call) =>
      call.path === '/api/app/events'
        ? {
            status: 500,
            body: {
              error: 'Server sedang bermasalah.',
              code: 'INTERNAL',
              status: 500,
              requestId: 'r1',
            },
          }
        : null,
    );
    await listed();
    expect(screen.getByTestId('events-failed')).toBeOnTheScreen();
    expect(screen.getByText('Server sedang bermasalah.')).toBeOnTheScreen();
    const before = asked().length;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(asked().length).toBe(before + 1);
  });

  it('loads a further page when the server says there is one', async () => {
    answerEvents((call) => {
      if (call.path !== '/api/app/events') return null;
      return call.search.get('cursor')
        ? { body: page([listItem({ id: 'extra', title: 'One more' })]) }
        : { body: page([listItem({ id: 'first', title: 'First' })], { nextCursor: 'c1' }) };
    });
    await listed();
    await fireEvent.press(screen.getByTestId('events-load-more'));
    expect(await screen.findByText('One more')).toBeOnTheScreen();
    expect(screen.getByText('First')).toBeOnTheScreen();
    expect(screen.queryByTestId('events-load-more')).not.toBeOnTheScreen();
  });

  it('names a card by everything it shows, and offers no second action', async () => {
    await listed();
    expect(card('sinar')?.props.accessibilityLabel).toBe(
      'Progress presentation to PT Sinar, Thu, Oct 8, 10:00–11:00 AM, Online, Important, Upcoming',
    );
    expect(card('sinar')?.props.accessibilityActions).toBeUndefined();
  });
});

describe('events filter & sort', () => {
  it('has Show, Event type, Project and Group by, the default draft picked', async () => {
    await listed();
    await openFilter();
    for (const h of ['Show', 'Event type', 'Project', 'Group by'])
      expect(sheet().getByRole('header', { name: h })).toBeOnTheScreen();
    expect(sheet().getByRole('button', { name: 'Upcoming' })).toBeSelected();
    expect(sheet().getAllByRole('button', { name: 'All' })[0]).toBeSelected();
  });

  it('Past asks the server for the past tab, and those events read Done', async () => {
    await listed();
    await openFilter();
    await press('Past');
    await act(async () => {
      apply();
    });
    await waitFor(() => expect(shown()).toEqual(PAST_IDS));
    expect(asked().at(-1)).toEqual({ tab: 'past', limit: '30' });
    expect(within(card('kickoff') as never).getByText('Done')).toBeOnTheScreen();
    expect(filterOn()).toBe(true);
  });

  it('one type becomes a kind in the query, and lights the dot', async () => {
    await listed();
    await openFilter();
    await press('Meeting');
    await act(async () => {
      apply();
    });
    await waitFor(() => expect(shown()).toEqual(['rehearsal']));
    expect(asked().at(-1)).toEqual({ tab: 'upcoming', kind: 'meeting', limit: '30' });
    expect(filterOn()).toBe(true);
  });

  it('groups the list by type without asking the server again', async () => {
    await listed();
    const before = asked().length;
    await openFilter();
    await fireEvent.press(sheet().getByLabelText('Type'));
    await act(async () => {
      apply();
    });
    expect(heads()).toEqual(['Meeting', 'Review', 'Important', 'Team event']);
    expect(asked()).toHaveLength(before);
    expect(filterOn()).toBe(false);
  });

  it('offers Reset filters when nothing matches; the search alone says so', async () => {
    await listed();
    await act(async () => {
      fireEvent.changeText(search(), 'nothing here');
    });
    expect(await screen.findByText('No events match this search.')).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    });
    await waitFor(() => expect(shown()).toEqual(UPCOMING));
  });

  it('Reset puts the draft back to upcoming, every type, by schedule', async () => {
    await listed();
    await openFilter();
    await press('Past');
    await press('Meeting');
    await fireEvent.press(sheet().getByLabelText('Type'));
    await fireEvent.press(sheet().getByText('Reset'));
    expect(sheet().getByRole('button', { name: 'Upcoming' })).toBeSelected();
    expect(sheet().getByRole('button', { name: 'Meeting' })).not.toBeSelected();
    expect(sheet().getByLabelText('Schedule')).toBeChecked();
  });

  it('offers the projects of the loaded events, and leaves Show off the calendar’s sheet', async () => {
    await listed();
    await openFilter();
    // Built from what is loaded: mobile has no project list of its own yet.
    expect(sheet().getByLabelText('Project').props.accessibilityValue?.text).toBe('All projects');
    await fireEvent.press(sheet().getByText('Apply'));
    await listed('/events?view=calendar');
    await openFilter();
    expect(sheet().queryByRole('header', { name: 'Show' })).not.toBeOnTheScreen();
    expect(sheet().getByRole('header', { name: 'Event type' })).toBeOnTheScreen();
  });
});
