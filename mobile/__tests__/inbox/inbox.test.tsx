// The Inbox screens against a stubbed `/api/app/inbox`: the server's cards in the server's words, loading and failure,
// opening a card marks it read, "Mark all as read" for real, and "Load more". The data layer is
// __tests__/data/inbox.api.test.ts.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { forgetAllResources } from '../../src/data/resource';
import { InboxScreen } from '../../src/screens/inbox/inbox.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { card, counts, news, page, query } from '../helpers/inbox-fixtures';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  setParams({});
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

const show = () => render(<InboxScreen />, { wrapper: GluestackUIProvider });

/** A promise the test resolves itself, to look at a screen while a request is out. */
function gate() {
  let open = () => {};
  const wait = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { wait, open };
}

describe('Needs your response', () => {
  test("the server's count on the tab and its cards in its words; the button opens the task and marks it read", async () => {
    const s = serve({
      '/api/app/inbox/count': { body: counts(1) },
      '/api/app/inbox?lane=action': { body: page([card()]) },
      '/api/app/inbox/n-1/read': { body: { ok: true } },
    });
    await show();
    expect(await screen.findByText('Needs your response (1)')).toBeOnTheScreen();
    expect(screen.getByText('Rina Wulandari menugaskan #12 kepada Anda')).toBeOnTheScreen();
    expect(screen.getByText('#12 · Atlas Project · 14:05')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByLabelText('Lihat tugas: Rina Wulandari menugaskan #12 kepada Anda'),
    );
    expect(router.push).toHaveBeenCalledWith('/tasks/12');
    expect(s.calls.some((u) => u.endsWith('/api/app/inbox/n-1/read'))).toBe(true);
  });

  test('without the count the tab names no number, rather than counting the cards on hand', async () => {
    serve({
      '/api/app/inbox/count': { throws: new TypeError('Network request failed') },
      '/api/app/inbox?lane=action': { body: page([card()]) },
    });
    await show();
    expect(await screen.findByText('Needs your response')).toBeOnTheScreen();
  });

  test('a card for a page the app does not have shows no button', async () => {
    serve({
      '/api/app/inbox/count': { body: counts(1) },
      '/api/app/inbox?lane=action': { body: page([card({ href: '/app/inbox' })]) },
    });
    await show();
    await screen.findByText('Rina Wulandari menugaskan #12 kepada Anda');
    expect(screen.queryByRole('button', { name: /^Lihat tugas/ })).not.toBeOnTheScreen();
  });

  test('loading, then a failure in the server words with "Try again"', async () => {
    const g = gate();
    serve({
      '/api/app/inbox/count': { body: counts(0) },
      '/api/app/inbox?lane=action': {
        status: 500,
        body: { error: 'Server sedang bermasalah.', code: 'INTERNAL' },
        wait: g.wait,
      },
    });
    await show();
    expect(screen.getByTestId('inbox-loading-action')).toBeOnTheScreen();
    await act(async () => g.open());
    expect(await screen.findByText('Server sedang bermasalah.')).toBeOnTheScreen();

    server?.use({
      '/api/app/inbox/count': { body: counts(0) },
      '/api/app/inbox?lane=action': { body: page([]) },
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('All caught up')).toBeOnTheScreen();
  });

  test('nothing to respond to: the empty state points to the updates, and the tab lives in the URL', async () => {
    serve({
      '/api/app/inbox/count': { body: counts(0) },
      '/api/app/inbox?lane=action': { body: page([]) },
    });
    await show();
    await fireEvent.press(await screen.findByText('View latest updates'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'updates' });
    expect(screen.getByTestId('inbox-tabs')).toHaveAccessibleName('Inbox sections');
  });

  test('"Load more" appends the next page and goes once the server has no more', async () => {
    const s = serve({
      '/api/app/inbox/count': { body: counts(2) },
      '/api/app/inbox?lane=action': (url) =>
        query(url).cursor
          ? { body: page([card({ id: 'n-2', sentence: 'Kartu kedua' })]) }
          : { body: page([card()], 'cur-1') },
    });
    await show();
    await fireEvent.press(await screen.findByTestId('inbox-more-action'));
    expect(await screen.findByText('Kartu kedua')).toBeOnTheScreen();
    expect(screen.queryByTestId('inbox-more-action')).not.toBeOnTheScreen();
    expect(s.calls.filter((u) => u.includes('cursor=cur-1'))).toHaveLength(1);
  });
});

describe('Latest updates', () => {
  beforeEach(() => setParams({ tab: 'updates' }));

  test('by the server day buckets, with the unread dot and the excerpt', async () => {
    serve({
      '/api/app/inbox/count': { body: counts(0, 1) },
      '/api/app/inbox?lane=info': {
        body: page([
          news(),
          news({
            id: 'i-2',
            read: true,
            group: 'older',
            sentence: 'Acara Sprint review dibatalkan',
            href: '/app/events/e-1',
            button: 'Lihat acara',
            actor: null,
            payload: { title: 'Sprint review' },
          }),
        ]),
      },
    });
    await show();
    expect(await screen.findByText('Today')).toBeOnTheScreen();
    expect(screen.getByText('Older')).toBeOnTheScreen();
    expect(screen.getByText('Sudah saya cek, aman.')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Unread')).toHaveLength(1);
    await fireEvent.press(screen.getByLabelText('Lihat acara: Acara Sprint review dibatalkan'));
    expect(router.push).toHaveBeenCalledWith('/events/e-1');
  });

  test('"Mark all as read" posts, says how many, and then is off with the reason', async () => {
    let read = false;
    const s = serve({
      '/api/app/inbox/count': () => ({ body: counts(0, read ? 0 : 2) }),
      '/api/app/inbox?lane=info': () => ({
        body: page([news({ read }), news({ id: 'i-2', read })]),
      }),
      '/api/app/inbox/read-all': () => {
        read = true;
        return { body: { updated: 2 } };
      },
    });
    await show();
    const button = await screen.findByRole('button', { name: 'Mark all as read' });
    expect(button).toBeEnabled();
    await fireEvent.press(button);
    expect(await screen.findByText('2 updates marked as read')).toBeOnTheScreen();
    expect(await screen.findByTestId('all-read')).toHaveTextContent('Everything here is read');
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    expect(screen.queryAllByLabelText('Unread')).toHaveLength(0);
    expect(s.calls.filter((u) => u.endsWith('/read-all'))).toHaveLength(1);
  });

  test('a failed "Mark all as read" shows the server sentence and leaves the dots', async () => {
    serve({
      '/api/app/inbox/count': { body: counts(0, 1) },
      '/api/app/inbox?lane=info': { body: page([news()]) },
      '/api/app/inbox/read-all': {
        status: 429,
        body: { error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMITED' },
      },
    });
    await show();
    await fireEvent.press(await screen.findByRole('button', { name: 'Mark all as read' }));
    expect(
      await screen.findByText('Terlalu banyak permintaan. Coba lagi sebentar.'),
    ).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Unread')).toHaveLength(1);
  });

  test('an unread card the app cannot open can still be marked read', async () => {
    let read = false;
    serve({
      '/api/app/inbox/count': () => ({ body: counts(0, read ? 0 : 1) }),
      '/api/app/inbox?lane=info': () => ({
        body: page([
          news({
            read,
            href: '/app/settings',
            kind: 'leave_recorded',
            sentence: 'Cuti Anda dicatat oleh Ayu',
          }),
        ]),
      }),
      '/api/app/inbox/i-1/read': () => {
        read = true;
        return { body: { ok: true } };
      },
    });
    await show();
    await fireEvent.press(await screen.findByLabelText('Mark as read: Cuti Anda dicatat oleh Ayu'));
    expect(await screen.findByTestId('all-read')).toBeOnTheScreen();
    expect(screen.queryAllByLabelText('Unread')).toHaveLength(0);
  });

  test('no news yet: an empty state, not a blank tab', async () => {
    serve({
      '/api/app/inbox/count': { body: counts(0, 0) },
      '/api/app/inbox?lane=info': { body: page([]) },
    });
    await show();
    expect(await screen.findByText('No updates yet')).toBeOnTheScreen();
  });
});
