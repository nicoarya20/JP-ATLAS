import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetAuthClient, setAuthHeaders } from '@/api';
import { sessionStore } from '@/session';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import type { Role } from '../../src/data/sample';
import { getLeave, getSettings, LEAVE } from '../../src/data/settings';
import { LeaveScreen } from '../../src/screens/settings/leave.screen';
import { ProfileEditScreen } from '../../src/screens/settings/profile-edit.screen';
import { SettingsScreen } from '../../src/screens/settings/settings.screen';
import { serveAuth } from '../helpers/auth-server';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const ADMIN: Role = 'admin';
const PM: Role = 'pm';

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  setParams({});
  resetAuthClient();
  setAuthHeaders(null);
});

afterEach(() => {
  server?.restore();
  server = null;
});

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

describe('settings data', () => {
  test('only an Admin gets the team settings', () => {
    expect(getSettings('admin').team).toBe(true);
    expect(getSettings('pm').team).toBe(false);
  });

  test('the leave copy per role, which the Create sheet reads as LEAVE[role].title', () => {
    expect([LEAVE.member.title, LEAVE.pm.title, LEAVE.admin.title]).toEqual([
      'Request leave',
      'Request leave',
      'Set leave',
    ]);
    expect(getLeave('admin')).toMatchObject({ save: 'Save leave', notice: 'Leave saved' });
  });
});

describe('SettingsScreen', () => {
  test('Edit profile and the leave action open their screens', async () => {
    await show(<SettingsScreen role={PM} />);
    await fireEvent.press(screen.getByText('Edit profile'));
    expect(router.push).toHaveBeenCalledWith('/more/settings/profile');
    await fireEvent.press(screen.getByText('Request leave'));
    expect(router.push).toHaveBeenCalledWith('/leave');
    expect(screen.queryByText('Team settings (Admin only)')).not.toBeOnTheScreen();
  });

  test('Admin: the team settings group', async () => {
    await show(<SettingsScreen role={ADMIN} />);
    expect(screen.getByText('Team settings (Admin only)')).toBeOnTheScreen();
    // Named after what it opens; the chevron is an icon, not a "›" read aloud.
    await fireEvent.press(screen.getByRole('button', { name: 'View roles and permissions' }));
    expect(screen.getByText('Roles and permissions — not in the prototype yet')).toBeOnTheScreen();
  });

  // Phase 2: confirming really ends the session, and the gate takes it from there (no navigation here).
  test('Sign out asks first (T2); Cancel stays, confirming ends the session', async () => {
    server = serveAuth({ '/sign-out': { body: { success: true } } });
    await show(<SettingsScreen role={PM} />);
    await fireEvent.press(screen.getByText('Sign out'));
    const dialog = within(screen.getByTestId('sign-out-dialog'));
    expect(dialog.getByText("You'll be signed out of this account.")).toBeOnTheScreen();
    await fireEvent.press(dialog.getByText('Cancel'));
    expect(server.calls).toHaveLength(0);
    expect(sessionStore.get().status).toBe('signed-in');

    await fireEvent.press(screen.getByText('Sign out'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    await waitFor(() => expect(sessionStore.get().status).toBe('signed-out'));
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

describe('LeaveScreen', () => {
  test.each<[Role, string, string, string]>([
    ['member', 'Request leave', 'Send request', 'Leave request sent'],
    ['pm', 'Request leave', 'Save', 'Leave request sent'],
    ['admin', 'Set leave', 'Save leave', 'Leave saved'],
  ])('%s: "%s", saved with "%s"', async (role, title, save, notice) => {
    await show(<LeaveScreen role={role} />);
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(screen.getByText(LEAVE[role].hint)).toBeOnTheScreen();
    expect(screen.getByTestId('leave-from')).toBeOnTheScreen();
    // The dates are named by their buttons; the labels above them are not read again as headers.
    expect(screen.getAllByLabelText('From date')).toHaveLength(1);
    expect(screen.queryByRole('header', { name: 'From date' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByText(save));
    expect(screen.getByText(notice)).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
