// Events ④ detail and ⑩ Cancel event against a stubbed `GET /api/app/events/:id`: the facts, the guests with the
// creator first, the project link or "Personal event", what the event's `can{}` offers (a deny code says why), Cancel
// event with its required reason, Move to Trash at once (T1) with Undo, and the missing / failed states.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import type { EventDetailWire } from '../../src/data/events.wire';
import type { AuthReply, AuthRoutes } from '../helpers/auth-server';
import {
  eventsPage,
  NICO,
  recording,
  reviewDetail,
  reviewItem,
  type Sent,
  syncItem,
} from '../helpers/events-fixtures';
import { eventsServer, openEvents } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';

const server = eventsServer();
drainToastTimers();

const DETAIL = '/api/app/events/e-review';
let sent: Sent[] = [];
beforeEach(() => {
  sent = [];
});

/**
 * The review's detail (`detail`, or what `read` answers on each read), the list behind it, and `writes` for the
 * requests a screen sends. A write to the detail path itself (DELETE) is recorded and answered with `del`.
 */
const serve = ({
  detail = reviewDetail(),
  read,
  writes = {},
  del = { body: { trash: { kind: 'event', id: 'e-review', label: 'Onboarding design review' } } },
}: {
  detail?: EventDetailWire;
  read?: () => AuthReply;
  writes?: AuthRoutes;
  del?: AuthReply;
} = {}) => {
  const record = recording(sent, DETAIL, () => del)[DETAIL];
  server.use({
    ...writes,
    [DETAIL]: (url, init) =>
      init?.method === 'DELETE' && typeof record === 'function'
        ? record(url, init)
        : (read?.() ?? { body: detail }),
    '/api/app/events?': { body: eventsPage([reviewItem()]) },
  });
};

const facts = () => within(screen.getByTestId('event-facts'));
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const menuItem = async (name: string) => {
  await fireEvent.press(await screen.findByTestId('event-actions'));
  await fireEvent.press(await screen.findByText(name));
};
const openReview = async () => {
  await openEvents('/events/e-review');
  await screen.findByTestId('event-facts');
};

describe('event detail', () => {
  it('shows the facts, the guests with the creator first, the agenda and who created it', async () => {
    serve();
    await openReview();
    expect(screen.getByText('Onboarding design review')).toBeOnTheScreen();
    expect(facts().getByText('Wed, Oct 7 · 2:00–3:00 PM')).toBeOnTheScreen();
    expect(facts().getByText('In person · Meeting Room 2')).toBeOnTheScreen();
    expect(facts().queryByTestId('event-link')).not.toBeOnTheScreen();
    expect(screen.getByText('Attendees (3)')).toBeOnTheScreen();
    const names = screen
      .getAllByText(/^(Nico Arya|Rina Putri|Dodi Saputra)$/)
      .map((t) => t.props.children);
    expect(names).toEqual(['Nico Arya', 'Rina Putri', 'Dodi Saputra']);
    expect(screen.getAllByText('Creator')).toHaveLength(1);
    expect(screen.getByText('Walk through the flow')).toBeOnTheScreen();
    expect(screen.getByText('Decide the copy')).toBeOnTheScreen();
    expect(screen.getByText('No minutes yet.')).toBeOnTheScreen();
    expect(screen.getByText('Created by Nico Arya · Updated Oct 6')).toBeOnTheScreen();
  });

  it('the project opens its overview', async () => {
    serve();
    await openReview();
    await fireEvent.press(facts().getByTestId('event-project'));
    expect(screen).toHavePathname('/projects/p-atlas');
    expect(screen.getByTestId('screen-project')).toBeOnTheScreen();
  });

  it('a personal online event opens its meeting link, and says so when the phone cannot', async () => {
    const { participants: _, ...sync } = syncItem();
    serve({ detail: reviewDetail({ ...sync, participants: [NICO] }) });
    const open = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('no app'));
    await openReview();
    expect(facts().getByText('Personal event')).toBeOnTheScreen();
    await fireEvent.press(facts().getByTestId('event-link'));
    expect(open).toHaveBeenCalledWith('https://meet.example.com/abc');
    expect(
      await screen.findByText("Couldn't open the meeting link. Copy it from the event instead."),
    ).toBeOnTheScreen();
    open.mockRestore();
  });

  it('Edit opens the form on this event', async () => {
    serve();
    await openReview();
    await fireEvent.press(screen.getByTestId('event-edit'));
    expect(screen).toHavePathname('/events/new');
    expect(screen).toHaveSearchParams({ event: 'e-review' });
  });

  it('a deny code greys out Edit and keeps the menu item, saying why', async () => {
    serve({ detail: reviewDetail({ can: { update: 'IMPERSONATING', trash: 'SOME_NEW_CODE' } }) });
    await openReview();
    expect(screen.getByTestId('event-edit')).toBeDisabled();
    expect(
      screen.getByText(
        'This is turned off while you act as another user. Stop acting as them first.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('event-actions'));
    expect(screen.queryByText('Cancel event')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Move to Trash'));
    expect(await screen.findByText("You can't do this right now.")).toBeOnTheScreen();
    expect(sent).toEqual([]);
  });

  it('a guest who may do nothing gets neither Edit nor the menu', async () => {
    serve({ detail: reviewDetail({ can: {} }) });
    await openReview();
    expect(screen.queryByTestId('event-edit')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('event-actions')).not.toBeOnTheScreen();
  });

  it('a canceled event shows who canceled it and why, without Edit or Cancel event', async () => {
    serve({
      detail: reviewDetail({
        canceledAt: '2026-10-06T03:00:00.000Z',
        canceledBy: NICO,
        cancelReason: 'Client moved it',
      }),
    });
    await openReview();
    const box = within(screen.getByTestId('event-canceled'));
    expect(box.getByText('Canceled by Nico Arya')).toBeOnTheScreen();
    expect(box.getByText('Client moved it')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-edit')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('event-actions'));
    expect(screen.queryByText('Cancel event')).not.toBeOnTheScreen();
    expect(screen.getByText('Move to Trash')).toBeOnTheScreen();
  });

  it('an event that is gone says so', async () => {
    server.use({
      [DETAIL]: { status: 404, body: { error: 'Acara tidak ditemukan.', code: 'NOT_FOUND' } },
    });
    await openEvents('/events/e-review');
    expect(await screen.findByText('Event not found')).toBeOnTheScreen();
  });

  it('a failed read offers Try again', async () => {
    let fail = true;
    serve({
      read: () =>
        fail
          ? { status: 500, body: { error: 'Server sedang sibuk.', code: 'INTERNAL' } }
          : { body: reviewDetail() },
    });
    await openEvents('/events/e-review');
    expect(await screen.findByTestId('event-failed')).toBeOnTheScreen();
    fail = false;
    await fireEvent.press(button('Try again'));
    expect(await screen.findByTestId('event-facts')).toBeOnTheScreen();
  });
});

describe('Cancel event', () => {
  const cancelWrites = (reply: AuthReply) => recording(sent, `${DETAIL}/cancel`, () => reply);

  it('needs a reason, sends it, and the detail comes back canceled', async () => {
    let canceled = false;
    serve({
      writes: cancelWrites({ body: reviewDetail() }),
      read: () => ({
        body: canceled
          ? reviewDetail({
              canceledAt: '2026-10-07T03:00:00.000Z',
              canceledBy: NICO,
              cancelReason: 'Client moved it',
            })
          : reviewDetail(),
      }),
    });
    await openReview();
    await menuItem('Cancel event');
    expect(screen).toHavePathname('/events/e-review/cancel');
    const sheet = within(await screen.findByTestId('event-cancel'));
    expect(
      sheet.getByText(
        'The event stays visible, marked Canceled. All attendees (Nico Arya, Rina Putri, Dodi Saputra) are notified.',
      ),
    ).toBeOnTheScreen();
    expect(sheet.getByTestId('sheet-confirm')).toBeDisabled();
    await fireEvent.changeText(sheet.getByTestId('cancel-reason'), '   ');
    expect(sheet.getByTestId('sheet-confirm')).toBeDisabled();
    await fireEvent.changeText(sheet.getByTestId('cancel-reason'), ' Client moved it ');
    canceled = true;
    await fireEvent.press(sheet.getByTestId('sheet-confirm'));
    expect(await screen.findByText('Event canceled')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/e-review'));
    expect(await screen.findByTestId('event-canceled')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'POST', url: `${DETAIL}/cancel`, body: { reason: 'Client moved it' } },
    ]);
  });

  it('a refusal stays on the sheet', async () => {
    serve({
      writes: cancelWrites({
        status: 409,
        body: { error: 'Acara sudah dibatalkan.', code: 'CONFLICT' },
      }),
    });
    await openEvents('/events/e-review/cancel');
    const sheet = within(await screen.findByTestId('event-cancel'));
    await fireEvent.changeText(sheet.getByTestId('cancel-reason'), 'Client moved it');
    await fireEvent.press(sheet.getByTestId('sheet-confirm'));
    expect(await screen.findByTestId('cancel-error')).toHaveTextContent('Acara sudah dibatalkan.');
    expect(screen).toHavePathname('/events/e-review/cancel');
  });

  it('whoever may not cancel goes back to the event', async () => {
    serve({ detail: reviewDetail({ can: { update: true } }) });
    await openEvents('/events/e-review/cancel');
    await waitFor(() => expect(screen).toHavePathname('/events/e-review'));
  });
});

describe('Move to Trash', () => {
  it('moves at once; the list comes back with Undo, which restores the event', async () => {
    serve({
      writes: recording(sent, '/api/app/trash/event/e-review/restore', () => ({
        body: { id: 'e-review' },
      })),
    });
    await openEvents('/events');
    await fireEvent.press(await screen.findByTestId('event-card-e-review'));
    await screen.findByTestId('event-facts');
    await menuItem('Move to Trash');
    await waitFor(() => expect(screen).toHavePathname('/events'));
    expect(screen.getByText('Event moved to Trash')).toBeOnTheScreen();
    await fireEvent.press(button('Undo'));
    expect(await screen.findByText('Event restored')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'DELETE', url: DETAIL, body: undefined },
      { method: 'POST', url: '/api/app/trash/event/e-review/restore', body: undefined },
    ]);
  });

  it('a refusal stays on the event and says why', async () => {
    serve({
      del: {
        status: 403,
        body: { error: 'Hanya pembuat acara yang bisa menghapusnya.', code: 'FORBIDDEN' },
      },
    });
    await openReview();
    await menuItem('Move to Trash');
    expect(
      await screen.findByText('Hanya pembuat acara yang bisa menghapusnya.'),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname('/events/e-review');
  });
});
