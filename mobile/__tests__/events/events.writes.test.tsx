// Cancel event and Move to Archive through the real route tree, against the fake `/api/app/events`.
//
// Both are server writes now, so what is checked is the request made, the feedback shown, and the
// refetch that follows: the screens you left are still mounted, so a write that did not invalidate
// would leave them showing the old event (`phase2-pola-data.md` rule 2).
//
// The recurring variants ("Which one?") are gone — the API has no recurrence (GAP-A4/A5) — and so is
// the local "can this still be restored?" guess: Undo asks the server and shows what it answers.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { detailFor, eventsApiFixture, pageFor } from '../helpers/events-api-fixtures';
import { answerEvents, eventCalls, openEvents, resetEventStores } from '../helpers/events-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetEventStores();
drainToastTimers();

const button = (name: string) => screen.getByRole('button', { name });
const press = (name: string) => fireEvent.press(button(name));
const openMenu = async (item: string) => {
  await fireEvent.press(screen.getByTestId('event-actions'));
  await fireEvent.press(await screen.findByText(item));
};
const wrote = (method: string) => eventCalls().filter((c) => c.method === method);

/** The fixture, with one event's answers replaced once it has been canceled or trashed. */
function serverThatRemembers() {
  const canceled = new Map<string, string>();
  const trashed = new Set<string>();
  answerEvents((call) => {
    const cancel = /^\/api\/app\/events\/([^/]+)\/cancel$/.exec(call.path);
    if (cancel?.[1] && call.method === 'POST') {
      canceled.set(cancel[1], (call.body as { reason: string }).reason);
      return eventsApiFixture(call);
    }
    const one = /^\/api\/app\/events\/([^/]+)$/.exec(call.path);
    if (one?.[1] && call.method === 'DELETE') {
      trashed.add(one[1]);
      return eventsApiFixture(call);
    }
    const restore = /^\/api\/app\/trash\/event\/([^/]+)\/restore$/.exec(call.path);
    if (restore?.[1]) {
      trashed.delete(restore[1]);
      return { body: { ok: true } };
    }
    if (one?.[1] && call.method === 'GET') {
      const reply = detailFor(one[1]);
      const reason = canceled.get(one[1]);
      if (!reason || !('body' in reply)) return reply;
      return {
        body: {
          ...(reply.body as object),
          canceledAt: '2026-10-07T03:00:00.000Z',
          cancelReason: reason,
          canceledBy: { id: 'u-nico', name: 'Nico' },
          can: { trash: true, writeNote: true },
        },
      };
    }
    if (call.path === '/api/app/events' && call.method === 'GET') {
      const answer = pageFor(call.search);
      return { body: { ...answer, items: answer.items.filter((e) => !trashed.has(e.id)) } };
    }
    return null;
  });
}

describe('cancel', () => {
  it('needs a reason, sends it, and the detail comes back canceled with only Archive left', async () => {
    serverThatRemembers();
    await openEvents('/events/review');
    await openMenu('Cancel event');
    const sheet = () => within(screen.getByTestId('event-cancel'));
    const confirm = () => sheet().getByRole('button', { name: 'Cancel event' });
    expect(confirm()).toBeDisabled();
    await fireEvent.changeText(
      screen.getByPlaceholderText("Why isn't it happening?"),
      'Client moved it',
    );
    await fireEvent.press(confirm());
    expect(await screen.findByText('Event canceled')).toBeOnTheScreen();
    await waitFor(() => expect(screen).toHavePathname('/events/review'));
    expect(wrote('POST')[0]).toMatchObject({
      path: '/api/app/events/review/cancel',
      body: { reason: 'Client moved it' },
    });
    // The detail refetched itself, so what is on screen is the server's answer, not a local guess.
    expect(await screen.findByText('Client moved it')).toBeOnTheScreen();
    expect(screen.getByText('Canceled by Nico')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('event-actions'));
    expect(await screen.findByText('Move to Archive')).toBeOnTheScreen();
    expect(screen.queryByText('Cancel event')).not.toBeOnTheScreen();
  });

  it('shows the server’s own message when it refuses, and stays open', async () => {
    answerEvents((call) =>
      call.path === '/api/app/events/review/cancel'
        ? {
            status: 403,
            body: {
              error: 'Hanya pengelola proyek ini yang bisa melakukan ini.',
              code: 'NOT_MANAGER',
              status: 403,
              requestId: 'r1',
            },
          }
        : null,
    );
    await openEvents('/events/review/cancel');
    await fireEvent.changeText(screen.getByPlaceholderText("Why isn't it happening?"), 'Nope');
    await fireEvent.press(
      within(screen.getByTestId('event-cancel')).getByRole('button', { name: 'Cancel event' }),
    );
    expect(
      await screen.findByText('Hanya pengelola proyek ini yang bisa melakukan ini.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('event-cancel')).toBeOnTheScreen();
  });

  it('is not offered at all when the server did not send the capability', async () => {
    answerEvents((call) =>
      /^\/api\/app\/events\/review$/.test(call.path)
        ? { body: { ...(detailFor('review') as { body: object }).body, can: { trash: true } } }
        : null,
    );
    await openEvents('/events/review');
    await fireEvent.press(await screen.findByTestId('event-actions'));
    expect(await screen.findByText('Move to Archive')).toBeOnTheScreen();
    expect(screen.queryByText('Cancel event')).not.toBeOnTheScreen();
  });

  it('shows the server’s reason instead of the menu item when it answered a deny code', async () => {
    answerEvents((call) =>
      /^\/api\/app\/events\/review$/.test(call.path)
        ? {
            body: {
              ...(detailFor('review') as { body: object }).body,
              can: { cancel: 'IMPERSONATING', trash: 'IMPERSONATING' },
            },
          }
        : null,
    );
    await openEvents('/events/review');
    expect(await screen.findByText(/menyamar sebagai pengguna lain/)).toBeOnTheScreen();
    expect(screen.queryByTestId('event-actions')).not.toBeOnTheScreen();
  });
});

describe('move to archive', () => {
  it('returns to the list with Undo, and Undo asks the server to restore it', async () => {
    serverThatRemembers();
    await openEvents('/events/sinar');
    await openMenu('Move to Archive');
    await fireEvent.press(
      within(screen.getByTestId('event-archive')).getByRole('button', { name: 'Move to Archive' }),
    );
    await waitFor(() => expect(screen).toHavePathname('/events'));
    expect(wrote('DELETE')[0]?.path).toBe('/api/app/events/sinar');
    await waitFor(() => expect(screen.queryByTestId('event-card-sinar')).not.toBeOnTheScreen());
    expect(screen.getByText('Event moved to Archive')).toBeOnTheScreen();
    await press('Undo');
    expect(await screen.findByText('Event restored')).toBeOnTheScreen();
    expect(wrote('POST')[0]?.path).toBe('/api/app/trash/event/sinar/restore');
    await waitFor(() => expect(screen.getByTestId('event-card-sinar')).toBeOnTheScreen());
  });

  it('Undo shows what the server says when it will not restore it', async () => {
    serverThatRemembers();
    await openEvents('/events/sinar/archive');
    await fireEvent.press(
      within(screen.getByTestId('event-archive')).getByRole('button', { name: 'Move to Archive' }),
    );
    await waitFor(() => expect(screen).toHavePathname('/events'));
    answerEvents((call) =>
      call.path === '/api/app/trash/event/sinar/restore'
        ? {
            status: 410,
            body: {
              error: 'Masa pemulihan item ini sudah lewat.',
              code: 'EXPIRED',
              status: 410,
              requestId: 'r2',
            },
          }
        : null,
    );
    await press('Undo');
    expect(await screen.findByText('Masa pemulihan item ini sudah lewat.')).toBeOnTheScreen();
    expect(screen.queryByTestId('event-card-sinar')).not.toBeOnTheScreen();
  });

  it('the sheet’s way to Cancel is its own link, named apart from the sheet’s Cancel', async () => {
    await openEvents('/events/sinar/archive');
    const sheet = within(await screen.findByTestId('event-archive'));
    const link = sheet.getByRole('link', { name: 'Cancel this event instead' });
    expect(link.props.accessibilityHint).toBe(
      'Meeting not happening? Use Cancel so attendees know why.',
    );
    expect(sheet.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
    await fireEvent.press(link);
    await waitFor(() => expect(screen).toHavePathname('/events/sinar/cancel'));
  });
});
