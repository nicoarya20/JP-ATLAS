// The profile modal against a stubbed `/api/app/profile`, `/whoami`, `/profile/notifications` and
// `/inbox/count`. The note bubble and the presence dot are gone: the server stores neither.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { sessionStore } from '@/session';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { ProfileScreen } from '../../src/screens/profile/profile.screen';
import { profileBody, type Reply, serveAppApi, whoami } from '../helpers/team-trash-server';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

drainToastTimers();

let prefs: Reply = { body: { eventReminder: true, inboxNews: true } };
let signOut: Reply = { body: { success: true } };

serveAppApi(({ path, method }) => {
  if (path === '/api/app/profile') return { body: profileBody() };
  if (path === '/api/app/profile/notifications') return prefs;
  if (path === '/api/app/whoami') return { body: whoami() };
  if (path === '/api/app/inbox/count') return { body: { action: 3, infoUnread: 1 } };
  if (path.includes('/sign-out')) return signOut;
  return { status: 500, body: { error: `no stub for ${path} (${method})`, code: 'X', status: 500 } };
});

beforeEach(() => {
  prefs = { body: { eventReminder: true, inboxNews: true } };
  signOut = { body: { success: true } };
  jest.clearAllMocks();
  resetAuthClient();
  setAuthHeaders(null);
});

/** Renders and lets the four requests the modal makes land. */
const show = async () => {
  await render(<ProfileScreen />, { wrapper: GluestackUIProvider });
  await act(async () => {});
};

describe('ProfileScreen', () => {
  it('shows the name and the job, department and account role line', async () => {
    await show();
    expect(screen.getByRole('header', { name: 'Nico Pratama' })).toBeOnTheScreen();
    expect(screen.getByText('Project Manager · Product · Project Manager')).toBeOnTheScreen();
  });

  it('claims no presence and offers no note, since the server keeps neither', async () => {
    await show();
    expect(screen.queryByTestId('presence-dot', { includeHiddenElements: true })).not.toBeOnTheScreen();
    expect(screen.queryByTestId('profile-note')).not.toBeOnTheScreen();
    expect(screen.queryByText(/Teammates see you as/)).not.toBeOnTheScreen();
  });

  it('counts the Inbox from the count endpoint', async () => {
    await show();
    expect(screen.getByLabelText('Inbox, 3')).toBeOnTheScreen();
  });

  it('closes the modal before a tab, and opens My calendar inside it', async () => {
    await show();
    await fireEvent.press(screen.getByText('Edit profile'));
    expect(router.dismiss).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith({
      pathname: '/more/settings/profile',
      params: { from: 'profile' },
    });
    await fireEvent.press(screen.getByLabelText('My tasks'));
    expect(router.navigate).toHaveBeenCalledWith('/tasks');
    await fireEvent.press(screen.getByLabelText('Inbox, 3'));
    expect(router.navigate).toHaveBeenCalledWith('/more/inbox');
    await fireEvent.press(screen.getByLabelText('Settings'));
    expect(router.navigate).toHaveBeenCalledWith('/more/settings');
    await fireEvent.press(screen.getByLabelText('My calendar'));
    expect(router.push).toHaveBeenCalledWith('/profile/calendar');
    expect(router.dismiss).toHaveBeenCalledTimes(4);
  });

  it('offers the two switches the server keeps, and says which cards always arrive', async () => {
    prefs = { body: { eventReminder: true, inboxNews: false } };
    await show();
    expect(screen.getByRole('switch', { name: 'Event reminders' })).toHaveProp('value', true);
    expect(screen.getByRole('switch', { name: 'Inbox news' })).toHaveProp('value', false);
    expect(screen.queryByRole('switch', { name: 'Mute notifications' })).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        'Cards that need your answer always arrive; only these two kinds can be turned off.',
      ),
    ).toBeOnTheScreen();
  });

  it('saves a flipped switch to the server', async () => {
    await show();
    prefs = { body: { eventReminder: false, inboxNews: true } };
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Event reminders' }), 'valueChange', false);
    });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Event reminders' })).toHaveProp('value', false),
    );
  });

  it("reports a failed save with the server's own sentence, and keeps the stored value", async () => {
    await show();
    prefs = { status: 500, body: { error: 'Gagal menyimpan.', code: 'INTERNAL', status: 500 } };
    await act(async () => {
      fireEvent(screen.getByRole('switch', { name: 'Inbox news' }), 'valueChange', false);
    });
    expect(await screen.findByText('Could not save that: Gagal menyimpan.')).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Inbox news' })).toHaveProp('value', true);
  });

  it('copies the email, or says why it could not', async () => {
    const copy = jest.mocked(Clipboard.setStringAsync);
    await show();
    copy.mockResolvedValueOnce(true);
    await fireEvent.press(screen.getByLabelText('Copy email'));
    expect(copy).toHaveBeenCalledWith('nico@kantor.id');
    expect(await screen.findByText('Email copied')).toBeOnTheScreen();
    copy.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByLabelText('Copy email'));
    expect(
      await screen.findByText('Could not copy the email: the clipboard refused it'),
    ).toBeOnTheScreen();
    copy.mockRejectedValueOnce(new Error('No clipboard'));
    await fireEvent.press(screen.getByLabelText('Copy email'));
    expect(await screen.findByText('Could not copy the email: No clipboard')).toBeOnTheScreen();
  });

  it('asks before signing out (T2), then really ends the session', async () => {
    await show();
    await fireEvent.press(screen.getByText('Sign out'));
    expect(within(screen.getByTestId('sign-out-dialog')).getByText('Sign out?')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('confirm-action')));
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
  });
});
