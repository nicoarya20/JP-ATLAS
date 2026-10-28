// Settings ② Edit profile against `GET/PATCH /api/app/profile`: the form starts from the server, Role (whoami) and
// Email are read-only, Save sends the four fields and closes, a refusal stays on the form, fields stop at the server's
// limits, and no Change photo (GAP P-5).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { forgetAllResources } from '../../src/data/resource';
import { ProfileEditScreen } from '../../src/screens/settings/profile-edit.screen';
import { type AuthReply, serveAuth } from '../helpers/auth-server';
import { recording, type Sent } from '../helpers/events-fixtures';
import { profileWire } from '../helpers/profile-fixtures';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';
import { whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  jest.clearAllMocks();
  setParams({});
});
afterEach(() => {
  server?.restore();
  server = null;
});

const PROFILE = '/api/app/profile';

/** The form over a stubbed profile; `patch` answers Save (each request recorded in the returned log). */
async function show(
  patch: (s: Sent) => AuthReply = (s) => ({ body: { ...profileWire(), ...(s.body as object) } }),
) {
  const sent: Sent[] = [];
  const saves = recording(sent, PROFILE, patch)[PROFILE];
  server = serveAuth({
    ...whoamiRoute('pm'),
    [PROFILE]: (url, init) =>
      init?.method === 'PATCH' && typeof saves === 'function'
        ? saves(url, init)
        : { body: profileWire() },
  });
  await render(<ProfileEditScreen />, { wrapper: Providers });
  await screen.findByLabelText(/^Full name/);
  return sent;
}
const save = () => act(async () => fireEvent.press(screen.getByText('Save')));

describe('ProfileEditScreen', () => {
  test('starts from the server; role and email are read-only with the reason; no Change photo', async () => {
    await show();
    expect(screen.getByLabelText(/^Full name/)).toHaveDisplayValue('Nico');
    expect(screen.getByLabelText('Job title')).toHaveDisplayValue('Designer');
    expect(screen.getByLabelText('Division')).toHaveDisplayValue('Product');
    // Read-only, yet still read out by a screen reader (a disabled gluestack input is hidden from it).
    expect(await screen.findByDisplayValue('Project Manager')).toBeOnTheScreen();
    expect(screen.getByLabelText('Role')).toHaveProp('readOnly', true);
    expect(screen.getByLabelText('Email')).toHaveProp('readOnly', true);
    expect(screen.getByLabelText('Email')).toHaveDisplayValue('nico@kantor.id');
    expect(
      screen.getByText("Email comes from your Google account and can't be changed."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/photo/i)).not.toBeOnTheScreen();
  });

  test('Save sends the four fields, says so and closes', async () => {
    const sent = await show();
    await fireEvent.changeText(screen.getByLabelText('Nickname (for greetings)'), 'Nic');
    await fireEvent.changeText(screen.getByLabelText('Division'), '');
    await save();
    expect(sent).toEqual([
      {
        method: 'PATCH',
        url: PROFILE,
        body: { displayName: 'Nico', nickname: 'Nic', jobTitle: 'Designer', department: '' },
      },
    ]);
    expect(await screen.findByText('Profile saved')).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('a refusal stays on the form with the server’s reason; nothing closes', async () => {
    await show(() => ({
      status: 400,
      body: { error: 'Nama terlalu panjang.', code: 'VALIDATION' },
    }));
    await save();
    expect(await screen.findByTestId('profile-edit-error')).toHaveTextContent(
      'Nama terlalu panjang.',
    );
    expect(screen.queryByText('Profile saved')).not.toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('a blank full name is refused before anything is sent', async () => {
    const sent = await show();
    await fireEvent.changeText(screen.getByLabelText(/^Full name/), '   ');
    await save();
    expect(screen.getByText('Enter your full name.')).toBeOnTheScreen();
    expect(sent).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
  });

  test('fields stop at the server’s limits', async () => {
    await show();
    await fireEvent.changeText(screen.getByLabelText('Nickname (for greetings)'), 'n'.repeat(40));
    expect(screen.getByLabelText('Nickname (for greetings)')).toHaveDisplayValue('n'.repeat(30));
  });

  test('Cancel closes without saving', async () => {
    const sent = await show();
    await fireEvent.press(screen.getByText('Cancel'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  test.each(['Cancel', 'Save'])(
    'opened from the profile modal, %s goes back to it',
    async (button) => {
      setParams({ from: 'profile' });
      await show();
      await act(async () => fireEvent.press(screen.getByText(button)));
      expect(router.back).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith('/profile');
    },
  );

  test('a profile that could not be read says why', async () => {
    server = serveAuth({
      ...whoamiRoute('pm'),
      [PROFILE]: { status: 503, body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' } },
    });
    await render(<ProfileEditScreen />, { wrapper: Providers });
    expect(await screen.findByTestId('profile-edit-failed')).toBeOnTheScreen();
    expect(screen.getByText('Sedang pemeliharaan.')).toBeOnTheScreen();
  });
});
