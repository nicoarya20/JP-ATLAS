import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { AccountScreen } from '../../src/screens/auth/account.screen';
import { DeniedScreen } from '../../src/screens/auth/denied.screen';
import { LoginScreen } from '../../src/screens/auth/login.screen';
import { PendingScreen } from '../../src/screens/auth/pending.screen';
import { signOut } from '../../src/screens/auth/sign-out';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

beforeEach(() => jest.clearAllMocks());

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

describe('sign-in flow', () => {
  test('Sign in with Google opens the account chooser', async () => {
    await show(<LoginScreen />);
    expect(screen.getByRole('header', { name: 'Sign in to your account' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Sign in with Google'));
    expect(router.push).toHaveBeenCalledWith('/account');
  });

  test('the office account waits for approval; the Gmail account is denied', async () => {
    await show(<AccountScreen />);
    await fireEvent.press(screen.getByLabelText('Budi Santoso, budi@kantor.id'));
    expect(router.replace).toHaveBeenCalledWith('/pending');
    await fireEvent.press(screen.getByLabelText('Budi Santoso, budi.santoso@gmail.com'));
    expect(router.push).toHaveBeenCalledWith('/denied');
    await fireEvent.press(screen.getByText('Use another account'));
    expect(screen.getByText('Opens Google sign-in')).toBeOnTheScreen();
  });

  test('denied: the admin’s reason, and back to the accounts', async () => {
    await show(<DeniedScreen />);
    expect(screen.getByRole('header', { name: 'Access denied' })).toBeOnTheScreen();
    expect(screen.getByText(/not a personal Gmail account/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Sign in with Google'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('denied with nothing behind it: replace with the chooser', async () => {
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await show(<DeniedScreen />);
    await fireEvent.press(screen.getByText('Sign in with Google'));
    expect(router.replace).toHaveBeenCalledWith('/account');
  });
});

describe('PendingScreen', () => {
  test('email is read-only; a blank full name is refused, a filled one is saved', async () => {
    await show(<PendingScreen />);
    expect(screen.getByText('Your account is awaiting admin approval')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email (from Google, cannot be changed)')).toHaveProp(
      'readOnly',
      true,
    );
    await fireEvent.changeText(screen.getByLabelText('Full name'), '  ');
    await fireEvent.press(screen.getByText('Save profile'));
    expect(screen.getByText('Enter your full name.')).toBeOnTheScreen();
    expect(screen.queryByText('Profile saved')).not.toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Full name'), 'Budi S.');
    await fireEvent.press(screen.getByText('Save profile'));
    expect(screen.queryByText('Enter your full name.')).not.toBeOnTheScreen();
    expect(screen.getByText('Profile saved')).toBeOnTheScreen();
  });

  test('Check status goes home', async () => {
    await show(<PendingScreen />);
    await fireEvent.press(screen.getByText('Check status'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  test('Sign out asks first (T2), then returns to the login screen', async () => {
    await show(<PendingScreen />);
    await fireEvent.press(screen.getByText('Sign out'));
    const dialog = within(screen.getByTestId('sign-out-dialog'));
    expect(dialog.getByText('Sign out?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});

describe('signOut', () => {
  test('closes any open modal first, then replaces with the login screen', () => {
    jest.mocked(router.canDismiss).mockReturnValueOnce(true);
    signOut();
    expect(router.dismissAll).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/login');
  });

  test('with no modal open, nothing to dismiss', () => {
    signOut();
    expect(router.dismissAll).not.toHaveBeenCalled();
  });
});
