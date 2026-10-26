import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { sessionStore } from '@/session';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { getProfileState, resetProfile } from '../../src/data/profile.store';
import type { Role } from '../../src/data/sample';
import { ProfileScreen } from '../../src/screens/profile/profile.screen';
import { serveAuth } from '../helpers/auth-server';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const PM: Role = 'pm';

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;

beforeEach(() => {
  resetProfile();
  jest.clearAllMocks();
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  server?.restore();
  server = null;
});

const show = () => render(<ProfileScreen role={PM} />, { wrapper: GluestackUIProvider });

describe('ProfileScreen', () => {
  test('hero: name, role line, Online', async () => {
    await show();
    expect(screen.getByRole('header', { name: 'Nico Pratama' })).toBeOnTheScreen();
    expect(screen.getByText('Project Manager · Product')).toBeOnTheScreen();
    expect(screen.getByText('Online')).toBeOnTheScreen();
    // Decorative: the text says it, so the dot is hidden from screen readers.
    expect(screen.getByTestId('presence-dot', { includeHiddenElements: true })).not.toBeVisible();
  });

  test('rows into the tabs close the modal first; My calendar opens inside it', async () => {
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

  test('switches: mute notifications and show me as online', async () => {
    await show();
    await fireEvent(
      screen.getByRole('switch', { name: 'Mute notifications' }),
      'valueChange',
      true,
    );
    expect(getProfileState().muted).toBe(true);
    expect(screen.getByText('Teammates see you as Online')).toBeOnTheScreen();
    await fireEvent(
      screen.getByRole('switch', { name: 'Show me as online' }),
      'valueChange',
      false,
    );
    expect(getProfileState().online).toBe(false);
    expect(screen.getByText('Teammates see you as Offline')).toBeOnTheScreen();
  });

  test('Copy email: copied, refused, or failed with the reason', async () => {
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

  test('the note: add, save on submit, then shown as the bubble', async () => {
    await show();
    await fireEvent.press(screen.getByTestId('profile-note'));
    const input = screen.getByTestId('profile-note-input');
    await fireEvent.changeText(input, 'Heads down until noon');
    await fireEvent(input, 'submitEditing');
    expect(getProfileState().note).toBe('Heads down until noon');
    expect(screen.getByLabelText('Note: Heads down until noon. Edit note')).toBeOnTheScreen();
  });

  // Phase 2: confirming really ends the session, and the gate takes it from there (no navigation here).
  test('Sign out asks first (T2), then really ends the session', async () => {
    server = serveAuth({ '/sign-out': { body: { success: true } } });
    await show();
    await fireEvent.press(screen.getByText('Sign out'));
    expect(within(screen.getByTestId('sign-out-dialog')).getByText('Sign out?')).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByTestId('confirm-action')));
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
  });
});
