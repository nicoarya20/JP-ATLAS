// Events ① list and ①b Filter & sort against a stubbed `GET /api/app/events`: the page the filters and the search ask
// for, grouped by schedule or type, "Load more", the empty and failed states, and the filter dot.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { AuthReply } from '../helpers/auth-server';
import {
  eventsPage,
  partyItem,
  reviewDetail,
  reviewItem,
  syncItem,
} from '../helpers/events-fixtures';
import { eventsServer, openEvents } from '../helpers/events-router';
import { sheetGone } from '../helpers/sheet-gone';
import { whoamiAs } from '../helpers/whoami-fixtures';

const server = eventsServer();

const ALL = [reviewItem(), syncItem(), partyItem()];
/** List requests made so far, without the path. */
const asked = () =>
  server
    .calls()
    .filter((u) => u.includes('/api/app/events?'))
    .map((u) => u.slice(u.indexOf('?') + 1));
const serveList = (answer: (query: string) => AuthReply) =>
  server.use({
    '/api/app/events/e-review': { body: reviewDetail() },
    '/api/app/events?': (url) => answer(url.slice(url.indexOf('?') + 1)),
    '/api/app/projects?': { body: { items: [{ id: 'p-atlas', name: 'Atlas Project' }] } },
  });

const card = (id: string) => screen.queryByTestId(`event-card-${id}`);
const heads = () =>
  screen
    .getAllByRole('header')
    .map((h) => h.props.children)
    .filter((t) => t !== 'Events');
const filterButton = () => screen.getByRole('button', { name: 'Filter and sort' });
const filterOn = () => filterButton().props.accessibilityValue?.text === 'Filters on';
const sheet = () => within(screen.getByTestId('filter-sheet'));
const pick = (name: string) => fireEvent.press(sheet().getByRole('button', { name }));
const apply = async () => {
  await fireEvent.press(sheet().getByText('Apply'));
  await sheetGone();
};

describe('events list', () => {
  it('asks for the upcoming page and groups it by schedule, without the filter dot', async () => {
    serveList(() => ({ body: eventsPage(ALL) }));
    await openEvents('/events');
    expect(await screen.findByTestId('event-card-e-review')).toBeOnTheScreen();
    expect(asked()).toEqual(['tab=upcoming&limit=25']);
    expect(heads()).toEqual(['Today · Wed, Oct 7', 'Tomorrow · Thu, Oct 8', 'Later']);
    expect(screen.getByLabelText('Search event title…')).toBeOnTheScreen();
    expect(filterOn()).toBe(false);
    const party = within(screen.getByTestId('event-card-e-party'));
    expect(party.getByTestId('event-note')).toHaveTextContent('Minutes confirmed');
    // Today and tomorrow show the start time, later days the day.
    expect(
      within(screen.getByTestId('event-card-e-review')).getByText('2:00 PM'),
    ).toBeOnTheScreen();
    expect(party.getByText('Tue 20')).toBeOnTheScreen();
  });

  it('opens the tapped card’s own detail', async () => {
    serveList(() => ({ body: eventsPage(ALL) }));
    await openEvents('/events');
    await fireEvent.press(await screen.findByTestId('event-card-e-review'));
    expect(screen).toHavePathname('/events/e-review');
    expect(await screen.findByText('Onboarding design review')).toBeOnTheScreen();
  });

  it('the search goes to the server once typing pauses; nothing found says so', async () => {
    serveList((q) => ({ body: eventsPage(q.includes('q=') ? [] : ALL) }));
    await openEvents('/events');
    await screen.findByTestId('event-card-e-review');
    await fireEvent.changeText(screen.getByLabelText('Search event title…'), 'zzz');
    await waitFor(() => expect(asked()).toContain('tab=upcoming&q=zzz&limit=25'));
    expect(await screen.findByText('No events match this search.')).toBeOnTheScreen();
  });

  it('Filter & sort asks for past reviews, shows the dot; Reset filters asks for the default again', async () => {
    serveList((q) => ({ body: eventsPage(q.startsWith('tab=past') ? [] : ALL) }));
    await openEvents('/events');
    await screen.findByTestId('event-card-e-review');
    await fireEvent.press(filterButton());
    await pick('Past');
    await pick('Review');
    await apply();
    expect(await screen.findByText('No events match these filters.')).toBeOnTheScreen();
    expect(asked()).toContain('tab=past&kind=review&limit=25');
    expect(filterOn()).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByTestId('event-card-e-review')).toBeOnTheScreen();
    expect(filterOn()).toBe(false);
  });

  it('the project filter offers the projects the viewer can see, and asks for the one picked', async () => {
    serveList(() => ({ body: eventsPage(ALL) }));
    await openEvents('/events');
    await screen.findByTestId('event-card-e-review');
    await fireEvent.press(filterButton());
    const project = sheet().getByLabelText('Project');
    expect(project.props.accessibilityValue).toEqual({ text: 'All projects' });
    await waitFor(() =>
      expect(server.calls().some((u) => u.includes('/api/app/projects?scope=all'))).toBe(true),
    );
    await fireEvent.press(project);
    await fireEvent.press(await screen.findByText('Atlas Project'));
    await apply();
    await waitFor(() => expect(asked()).toContain('tab=upcoming&projectId=p-atlas&limit=25'));
    expect(filterOn()).toBe(true);
  });

  it('Group by Type heads each kind in form order', async () => {
    serveList(() => ({ body: eventsPage(ALL) }));
    await openEvents('/events');
    await screen.findByTestId('event-card-e-review');
    await fireEvent.press(filterButton());
    await fireEvent.press(sheet().getByLabelText('Type'));
    await apply();
    expect(heads()).toEqual(['Meeting', 'Review', 'Team event']);
    // Grouping is not a filter: no new request, no dot.
    expect(asked()).toEqual(['tab=upcoming&limit=25']);
    expect(filterOn()).toBe(false);
  });

  it('Load more appends the next page', async () => {
    serveList((q) =>
      q.includes('cursor=c1')
        ? { body: eventsPage([partyItem()]) }
        : { body: eventsPage([reviewItem(), syncItem()], { nextCursor: 'c1' }) },
    );
    await openEvents('/events');
    await screen.findByTestId('event-card-e-review');
    expect(card('e-party')).toBeNull();
    await fireEvent.press(screen.getByTestId('events-more'));
    expect(await screen.findByTestId('event-card-e-party')).toBeOnTheScreen();
    expect(asked()).toContain('tab=upcoming&limit=25&cursor=c1');
    expect(screen.queryByTestId('events-more')).not.toBeOnTheScreen();
  });

  it('no events at all offers New event to whoever may create one', async () => {
    serveList(() => ({ body: eventsPage([]) }));
    await openEvents('/events');
    const empty = within(await screen.findByTestId('events-empty'));
    expect(empty.getByText('No events yet')).toBeOnTheScreen();
    await fireEvent.press(await empty.findByRole('button', { name: 'New event' }));
    expect(screen).toHavePathname('/events/new');
  });

  it('without createEvent the empty state has no New event', async () => {
    serveList(() => ({ body: eventsPage([]) }));
    server.use({
      '/api/app/events?': { body: eventsPage([]) },
      '/api/app/whoami': {
        body: { ...whoamiAs('member'), caps: { ...whoamiAs('member').caps, createEvent: false } },
      },
    });
    await openEvents('/events');
    expect(await screen.findByTestId('events-empty')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'New event' })).not.toBeOnTheScreen();
  });

  it('a failed list says so; Try again asks again', async () => {
    let fail = true;
    serveList(() =>
      fail
        ? { status: 500, body: { error: 'Server sedang sibuk.', code: 'INTERNAL' } }
        : { body: eventsPage(ALL) },
    );
    await openEvents('/events');
    expect(await screen.findByTestId('events-failed')).toBeOnTheScreen();
    expect(screen.getByText('Server sedang sibuk.')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('event-card-e-review')).toBeOnTheScreen();
  });
});
