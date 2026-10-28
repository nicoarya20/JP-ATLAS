// Events ③a / ③b New event and Edit against stubbed `/api/app/events*`: New is for whoever whoami's `caps.createEvent`
// lets and opens the saved event; Edit (for whoever `can.update` lets) sends only what changed, then the guests who
// join and leave, taking guests off behind a T2 confirmation. The link must be a web address; the guest search and
// the server's refusals say why in the form.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import type { AuthReply, AuthRoutes } from '../helpers/auth-server';
import {
  eventsPage,
  PEOPLE,
  recording,
  reviewDetail,
  reviewItem,
  type Sent,
} from '../helpers/events-fixtures';
import { eventsServer, openEvents } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';
import { whoamiAs } from '../helpers/whoami-fixtures';

const server = eventsServer();
drainToastTimers();

const DETAIL = '/api/app/events/e-review';
const NEW = reviewDetail({ id: 'e-new', title: 'Design sync' });
let sent: Sent[] = [];
beforeEach(() => {
  sent = [];
});

/**
 * The review and the new event to read, guest candidates, the projects to pick, and every write recorded and answered
 * with `reply`. `extra` goes first (whoami, a refusing people search).
 */
const serve = ({
  reply = { body: NEW } as AuthReply,
  detail = reviewDetail(),
  extra = {} as AuthRoutes,
} = {}) => {
  const writes = (prefix: string) => recording(sent, prefix, () => reply)[prefix];
  const readOr =
    (prefix: string, body: unknown): AuthRoutes[string] =>
    (url, init) => {
      const w = writes(prefix);
      return init?.method && init.method !== 'GET' && typeof w === 'function'
        ? w(url, init)
        : { body };
    };
  server.use({
    ...extra,
    '/api/app/events/people': { body: { items: PEOPLE } },
    [`${DETAIL}/participants`]: writes(`${DETAIL}/participants`),
    [DETAIL]: readOr(DETAIL, detail),
    '/api/app/events/e-new': { body: NEW },
    '/api/app/events?': { body: eventsPage([reviewItem()]) },
    '/api/app/projects?': { body: { items: [{ id: 'p-atlas', name: 'Atlas Project' }] } },
    '/api/app/events': readOr('/api/app/events', eventsPage([])),
    // Again last: a key `extra` shares with the defaults keeps its early place and gets its own answer back.
    ...extra,
  });
};

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
const save = () => fireEvent.press(screen.getByTestId('event-save'));
const addGuest = async (name: string) => {
  if (screen.queryByTestId('event-add-guest'))
    await fireEvent.press(screen.getByTestId('event-add-guest'));
  await fireEvent.press(await screen.findByRole('button', { name: `Add ${name}` }));
};
const openEdit = async () => {
  await openEvents('/events/e-review');
  await fireEvent.press(await screen.findByTestId('event-edit'));
  await screen.findByTestId('event-form');
};

describe('New event', () => {
  it('Save waits for a title; it sends the form and opens the new event', async () => {
    serve();
    await openEvents('/events/new');
    expect(await screen.findByText('New event')).toBeOnTheScreen();
    expect(screen.getByTestId('event-save')).toBeDisabled();
    expect(screen.getByText('Set automatically: reminder 1 day & 30 min before')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('event-title'), ' Design sync ');
    expect(screen.getByTestId('event-save')).toBeEnabled();
    // The creator is fixed; a picked guest can be taken off again.
    expect(screen.queryByRole('button', { name: 'Remove Nico Arya' })).not.toBeOnTheScreen();
    await addGuest('Dodi Saputra');
    await addGuest('Rina Putri');
    await press('Remove Dodi Saputra');
    await press('Add more details');
    await fireEvent.press(screen.getByTestId('event-project'));
    await fireEvent.press(await screen.findByText('Atlas Project'));
    await save();
    expect(await screen.findByText('Event saved')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/e-new'));
    expect(sent).toEqual([
      {
        method: 'POST',
        url: '/api/app/events',
        body: {
          title: 'Design sync',
          // Today 9:00–10:00 AM in the team's zone (UTC+7).
          startsAt: '2026-10-07T02:00:00.000Z',
          endsAt: '2026-10-07T03:00:00.000Z',
          kind: 'meeting',
          locationType: 'offline',
          locationText: null,
          meetingUrl: null,
          agenda: null,
          projectId: 'p-atlas',
          participantIds: ['u-rina'],
        },
      },
    ]);
  });

  it('an online event needs a web address for its link', async () => {
    serve();
    await openEvents('/events/new');
    await fireEvent.changeText(await screen.findByTestId('event-title'), 'Design sync');
    await fireEvent.press(screen.getByRole('radio', { name: 'Online' }));
    await fireEvent.changeText(screen.getByTestId('event-link'), 'meet.example.com/abc');
    expect(screen.getByText('Start the link with http:// or https://.')).toBeOnTheScreen();
    expect(screen.getByTestId('event-save')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('event-link'), 'https://meet.example.com/abc');
    expect(screen.queryByText('Start the link with http:// or https://.')).not.toBeOnTheScreen();
    expect(screen.getByTestId('event-save')).toBeEnabled();
  });

  it('a refusal stays on the form and says why', async () => {
    serve({
      reply: { status: 400, body: { error: 'Judul terlalu panjang.', code: 'VALIDATION' } },
    });
    await openEvents('/events/new');
    await fireEvent.changeText(await screen.findByTestId('event-title'), 'Design sync');
    await save();
    expect(await screen.findByTestId('event-save-error')).toHaveTextContent(
      'Judul terlalu panjang.',
    );
    expect(screen).toHavePathname('/events/new');
  });

  it('whoever may not create events goes back to Events', async () => {
    const me = whoamiAs('member');
    serve({
      extra: { '/api/app/whoami': { body: { ...me, caps: { ...me.caps, createEvent: false } } } },
    });
    await openEvents('/events/new');
    await waitFor(() => expect(screen).toHavePathname('/events'));
  });

  it('a guest search the server refuses says why', async () => {
    serve({
      extra: {
        '/api/app/events/people': {
          status: 403,
          body: { error: 'Hanya pengelola proyek yang bisa mencari orang.', code: 'FORBIDDEN' },
        },
      },
    });
    await openEvents('/events/new');
    await fireEvent.press(await screen.findByTestId('event-add-guest'));
    expect(await screen.findByTestId('guest-picker-failed')).toHaveTextContent(
      /Hanya pengelola proyek yang bisa mencari orang\./,
    );
  });
});

describe('Edit event', () => {
  it('fills the form, keeps the project, and sends only what changed', async () => {
    serve();
    await openEdit();
    expect(screen.getByText('Edit event')).toBeOnTheScreen();
    expect(screen.getByTestId('event-title').props.value).toBe('Onboarding design review');
    expect(button('Hide details')).toBeOnTheScreen();
    expect(screen.getByTestId('event-project-locked').props.value).toBe('Atlas Project');
    // The creator is fixed; the other guests can be taken off.
    const guests = within(screen.getByTestId('event-guests'));
    expect(guests.getByText('Nico Arya')).toBeOnTheScreen();
    expect(guests.queryByRole('button', { name: 'Remove Nico Arya' })).not.toBeOnTheScreen();
    expect(guests.getByRole('button', { name: 'Remove Rina Putri' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('event-title'), 'Onboarding review v2');
    await save();
    expect(await screen.findByText('Event updated')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/e-review'));
    expect(sent).toEqual([
      { method: 'PATCH', url: DETAIL, body: { title: 'Onboarding review v2' } },
    ]);
  });

  it('adds a guest, and takes one off only once that is confirmed', async () => {
    serve({ reply: { body: {} } });
    await openEdit();
    await press('Remove Rina Putri');
    await addGuest('Ayu Lestari');
    await save();
    const dialog = within(await screen.findByTestId('event-remove-guests'));
    expect(dialog.getByText('Remove guest?')).toBeOnTheScreen();
    expect(
      dialog.getByText(
        'Rina Putri will be taken off the guest list and stop getting its reminders.',
      ),
    ).toBeOnTheScreen();
    expect(sent).toEqual([]);
    await fireEvent.press(dialog.getByRole('button', { name: 'Remove and save' }));
    expect(await screen.findByText('Event updated')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'POST', url: `${DETAIL}/participants`, body: { userIds: ['u-ayu'] } },
      { method: 'DELETE', url: `${DETAIL}/participants/u-rina`, body: undefined },
    ]);
  });

  it.each([
    ['whoever may not edit', reviewDetail({ can: { update: 'IMPERSONATING' } })],
    [
      'a canceled event',
      reviewDetail({ canceledAt: '2026-10-06T03:00:00.000Z', cancelReason: 'Moved' }),
    ],
  ])('%s goes back to the event', async (_, detail) => {
    serve({ detail });
    await openEvents('/events/new?event=e-review');
    await waitFor(() => expect(screen).toHavePathname('/events/e-review'));
  });
});
