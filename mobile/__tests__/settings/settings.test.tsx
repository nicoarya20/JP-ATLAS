import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { Role } from '../../src/data/sample';
import { getSettings } from '../../src/data/settings';
import { ProfileEditScreen } from '../../src/screens/settings/profile-edit.screen';
import { SettingsScreen } from '../../src/screens/settings/settings.screen';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const ADMIN: Role = 'admin';
const PM: Role = 'pm';

drainToastTimers();

beforeEach(() => {
  jest.clearAllMocks();
  setParams({});
});

const show = (ui: React.ReactElement) => render(ui, { wrapper: Providers });

describe('settings data', () => {
  test('only an Admin gets the team settings', () => {
    expect(getSettings('admin').team).toBe(true);
    expect(getSettings('pm').team).toBe(false);
  });
});

describe('SettingsScreen', () => {
  test('Edit profile opens its screen; there is no leave anywhere', async () => {
    await show(<SettingsScreen role={PM} />);
    await fireEvent.press(screen.getByText('Edit profile'));
    expect(router.push).toHaveBeenCalledWith('/more/settings/profile');
    expect(screen.queryByText(/leave/i)).not.toBeOnTheScreen();
    expect(screen.queryByText('Team settings (Admin only)')).not.toBeOnTheScreen();
  });

  test('Admin: the team settings group', async () => {
    await show(<SettingsScreen role={ADMIN} />);
    expect(screen.getByText('Team settings (Admin only)')).toBeOnTheScreen();
    expect(screen.queryByText(/leave/i)).not.toBeOnTheScreen();
    // Named after what it opens; the chevron is an icon, not a "›" read aloud.
    await fireEvent.press(screen.getByRole('button', { name: 'View roles and permissions' }));
    expect(screen.getByText('Roles and permissions — not in the prototype yet')).toBeOnTheScreen();
  });

  test('Sign out asks first (T2); Cancel stays, confirming goes to the login screen', async () => {
    await show(<SettingsScreen role={PM} />);
    await fireEvent.press(screen.getByText('Sign out'));
    const dialog = within(screen.getByTestId('sign-out-dialog'));
    expect(dialog.getByText("You'll be signed out of this account.")).toBeOnTheScreen();
    await fireEvent.press(dialog.getByText('Cancel'));
    expect(router.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Sign out'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});

describe('ProfileEditScreen', () => {
  test('role and email are read-only with the reason; Save says so and closes', async () => {
    await show(<ProfileEditScreen role={PM} />);
    expect(screen.getByLabelText(/^Full name/)).toHaveDisplayValue('Nico Pratama');
    // Read-only, yet still read out by a screen reader (a disabled gluestack input is hidden from it).
    expect(screen.getByLabelText('Role')).toHaveProp('readOnly', true);
    expect(screen.getByLabelText('Email')).toHaveProp('readOnly', true);
    expect(
      screen.getByText("Email comes from your Google account and can't be changed."),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Nickname (for greetings)'), 'Nic');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Profile saved')).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('a blank full name is refused with the reason, as on the sign-up screen', async () => {
    await show(<ProfileEditScreen role={PM} />);
    await fireEvent.changeText(screen.getByLabelText(/^Full name/), '   ');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Enter your full name.')).toBeOnTheScreen();
    expect(screen.queryByText('Profile saved')).not.toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('Cancel closes without saving', async () => {
    await show(<ProfileEditScreen role={PM} />);
    await fireEvent.press(screen.getByText('Cancel'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(screen.queryByText('Profile saved')).not.toBeOnTheScreen();
  });

  test.each(['Cancel', 'Save'])(
    'opened from the profile modal, %s goes back to it',
    async (button) => {
      setParams({ from: 'profile' });
      await show(<ProfileEditScreen role={PM} />);
      await fireEvent.press(screen.getByText(button));
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith('/profile');
    },
  );
});
