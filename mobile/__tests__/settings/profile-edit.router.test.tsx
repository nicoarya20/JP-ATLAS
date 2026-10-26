// Where Edit profile returns to, on the app's real route tree (W3d #15). The helper stubs both screens, so the test
// replays their router calls: the profile modal's leaveTo, then the edit screen's close.
import { act, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { EDIT_FROM_PROFILE } from '../../src/screens/settings/profile-edit.screen';
import { openApp } from '../helpers/app-router';

describe('Edit profile opened from the profile modal', () => {
  it('goes back over the tabs, then reopens the modal', async () => {
    await openApp('/tasks');
    await act(() => router.push('/profile'));
    await act(() => {
      router.dismiss();
      router.navigate(EDIT_FROM_PROFILE);
    });
    expect(screen).toHaveSegments(['(tabs)', 'more', 'settings', 'profile']);
    expect(screen).toHaveSearchParams({ from: 'profile' });

    await act(() => {
      router.back();
      router.navigate('/profile');
    });
    expect(screen).toHavePathname('/profile');
    expect(screen.getByTestId('screen-profile')).toBeOnTheScreen();
  });
});
