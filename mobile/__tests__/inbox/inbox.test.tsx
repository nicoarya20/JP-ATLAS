import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { inboxInfoResource } from '../../src/data/inbox.api';
import { InboxScreen } from '../../src/screens/inbox/inbox.screen';
import { RespondTab } from '../../src/screens/inbox/respond.tab';
import { serveAuth } from '../helpers/auth-server';
import { ACTION_PAGE, INFO_PAGE, inboxRoutes, loadInbox } from '../helpers/inbox-fixtures';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth>;

const serve = (routes = inboxRoutes()) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  setParams({});
  jest.clearAllMocks();
});
afterEach(() => server?.restore());

const show = () => render(<InboxScreen />, { wrapper: GluestackUIProvider });
/** The screen with both lanes already in the store, as the gate's own fetch would leave them. */
const showLoaded = async (routes = inboxRoutes()) => {
  serve(routes);
  await loadInbox();
  return show();
};

describe('Needs your response', () => {
  test("renders one card per server card, with the server's button", async () => {
    await showLoaded();
    expect(screen.getByText('Needs your response (3)')).toBeOnTheScreen();
    expect(screen.getByTestId('inbox-card-n-assigned')).toBeOnTheScreen();
    // The kind this build does not know is not drawn at all.
    expect(screen.queryByTestId('inbox-card-n-unknown')).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByLabelText('Buka tugas: Nico Arya menugaskan "Prepare test data" kepada Anda.'),
    );
    expect(router.push).toHaveBeenCalledWith('/tasks/16');
  });

  test('the tab lives in the URL', async () => {
    await showLoaded();
    await fireEvent.press(screen.getByText('Latest updates'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'updates' });
  });

  test('nothing to respond to: the empty state points to the updates', async () => {
    const onUpdates = jest.fn();
    await render(<RespondTab cards={[]} onUpdates={onUpdates} />, { wrapper: GluestackUIProvider });
    expect(screen.getByText('All caught up')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('View latest updates'));
    expect(onUpdates).toHaveBeenCalledTimes(1);
  });

  test('the tab row is named for screen readers', async () => {
    await showLoaded();
    // A tablist container is not an accessibility element itself, so it is found by testID.
    expect(screen.getByTestId('inbox-tabs')).toHaveAccessibleName('Inbox sections');
  });
});

describe('Latest updates', () => {
  beforeEach(() => setParams({ tab: 'updates' }));

  test("shows the server's day headings, Older included, and says a page is not the whole lane", async () => {
    await showLoaded();
    for (const day of ['Today', 'Yesterday', 'Older']) {
      expect(screen.getByText(day)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('inbox-more-updates')).toBeOnTheScreen();
  });

  test('Mark all as read clears the dots and says so', async () => {
    await showLoaded({ ...inboxRoutes(), '/api/app/inbox/read-all': { body: { updated: 2 } } });
    expect(screen.getAllByLabelText('Unread').length).toBeGreaterThan(0);

    server.use({
      ...inboxRoutes({
        info: { items: INFO_PAGE.items.map((i) => ({ ...i, read: true })), nextCursor: null },
      }),
      '/api/app/inbox/read-all': { body: { updated: 2 } },
    });
    await fireEvent.press(screen.getByText('Mark all as read'));

    expect(await screen.findByText('All marked as read')).toBeOnTheScreen();
    expect(screen.queryAllByLabelText('Unread')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    expect(screen.getByTestId('all-read')).toHaveTextContent('Everything here is read');
  });

  test("a failed Mark all says why in the server's own words and leaves the dots", async () => {
    await showLoaded({
      ...inboxRoutes(),
      '/api/app/inbox/read-all': {
        status: 429,
        body: { error: 'Terlalu banyak permintaan. Coba lagi sebentar.', code: 'RATE_LIMITED' },
      },
    });
    await fireEvent.press(screen.getByText('Mark all as read'));

    expect(
      await screen.findByText('Terlalu banyak permintaan. Coba lagi sebentar.'),
    ).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Unread').length).toBeGreaterThan(0);
  });

  test('View opens the item and marks that one card read', async () => {
    await showLoaded({
      ...inboxRoutes(),
      '/api/app/inbox/n-commented/read': { body: { ok: true } },
    });
    await fireEvent.press(screen.getByLabelText('View: Rina Hapsari mengomentari tugas #14.'));
    expect(router.push).toHaveBeenCalledWith('/tasks/14');
    await act(async () => {
      await Promise.resolve();
    });
    expect(server.calls.filter((u) => u.includes('/n-commented/read'))).toHaveLength(1);
  });

  test('no news at all: an empty state instead of a blank tab', async () => {
    await showLoaded(inboxRoutes({ info: { items: [], nextCursor: null } }));
    expect(screen.getByTestId('updates-empty')).toBeOnTheScreen();
    expect(screen.getByText('No updates yet')).toBeOnTheScreen();
  });
});

describe('before the lane arrives', () => {
  test('says it is loading, then shows the cards', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = () => resolve();
    });
    serve({ ...inboxRoutes(), '/api/app/inbox?lane=action': { body: ACTION_PAGE, wait: held } });
    await show();

    expect(screen.getByTestId('inbox-loading')).toBeOnTheScreen();

    await act(async () => {
      release();
      await held;
    });
    expect(await screen.findByTestId('inbox-card-n-assigned')).toBeOnTheScreen();
  });

  test('a lane that failed says why and offers to try again', async () => {
    serve({
      ...inboxRoutes(),
      '/api/app/inbox?lane=action': { throws: new TypeError('Network request failed') },
    });
    await show();

    expect(await screen.findByTestId('inbox-failed')).toBeOnTheScreen();
    expect(screen.getByText(/Cannot reach the server/)).toBeOnTheScreen();

    server.use(inboxRoutes());
    await fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByTestId('inbox-card-n-assigned')).toBeOnTheScreen();
  });

  test('one failing lane leaves the other one working', async () => {
    serve({
      ...inboxRoutes(),
      '/api/app/inbox?lane=info': { throws: new TypeError('Network request failed') },
    });
    await show();
    expect(await screen.findByTestId('inbox-card-n-assigned')).toBeOnTheScreen();
    expect(inboxInfoResource.peek().phase).toBe('failed');
  });
});
