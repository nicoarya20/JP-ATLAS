// Edit profile's photo (GAP P-5) against `POST /api/app/avatar`: picking only stages the photo, Save uploads it before
// the fields and the session takes the server's URL, a photo the server would refuse is stopped before uploading, a
// refused upload keeps the form open in English, and a cancelled picker changes nothing.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';

import { apiUrl } from '../../src/api/client';
import { forgetAllResources } from '../../src/data/resource';
import { ProfileEditScreen } from '../../src/screens/settings/profile-edit.screen';
import { sessionStore } from '../../src/session/session.state';
import { type AuthReply, serveAuth } from '../helpers/auth-server';
import { profileWire } from '../helpers/profile-fixtures';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { APPROVED_USER, seedSession } from '../helpers/session-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';
import { whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

drainToastTimers();

const pick = launchImageLibraryAsync as jest.Mock;
const PROFILE = '/api/app/profile';
const AVATAR = '/api/app/avatar';
const STORED = '/api/storage/avatars/u-nico/5f1c.jpg'; // test-only

/** A cropped photo as the picker hands it back. */
const asset = (over: Record<string, unknown> = {}) => ({
  canceled: false,
  assets: [
    {
      uri: 'file:///tmp/crop.jpg',
      fileName: 'crop.jpg',
      mimeType: 'image/jpeg',
      fileSize: 300_000,
      ...over,
    },
  ],
});

type Call = { method: string; path: string; body: unknown };

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  jest.clearAllMocks();
  setParams({});
  seedSession(APPROVED_USER);
});
afterEach(() => {
  server?.restore();
  server = null;
});

/** The form over a stubbed profile; `avatar` answers the upload. Every write is logged in order. */
async function show(avatar: AuthReply = { body: { image: STORED } }) {
  const calls: Call[] = [];
  const log = (path: string, init?: RequestInit) =>
    calls.push({ method: init?.method ?? 'GET', path, body: init?.body });
  server = serveAuth({
    ...whoamiRoute('pm'),
    '/api/app/team': { body: { items: [] } },
    [AVATAR]: (_url, init) => {
      log(AVATAR, init);
      return avatar;
    },
    [PROFILE]: (_url, init) => {
      if (init?.method !== 'PATCH') return { body: profileWire() };
      log(PROFILE, init);
      return { body: profileWire() };
    },
  });
  await render(<ProfileEditScreen />, { wrapper: Providers });
  await screen.findByLabelText(/^Full name/);
  return calls;
}
const choose = () => act(async () => fireEvent.press(screen.getByText(/^(Add|Change) photo$/)));
const save = () => act(async () => fireEvent.press(screen.getByText('Save')));
const photoUri = () =>
  screen.queryByTestId('profile-edit-photo', { includeHiddenElements: true })?.props.source?.uri;

describe('Edit profile photo', () => {
  test('no photo yet: Add photo; a server path is loaded from the server', async () => {
    await show();
    expect(screen.getByText('Add photo')).toBeOnTheScreen();
    expect(photoUri()).toBeUndefined();

    await act(async () => seedSession({ ...APPROVED_USER, image: STORED }));
    expect(screen.getByText('Change photo')).toBeOnTheScreen();
    expect(photoUri()).toBe(apiUrl(STORED));
  });

  test('a picked photo is only shown until Save, which uploads it before the fields', async () => {
    pick.mockResolvedValue(asset());
    const calls = await show();
    await choose();
    expect(pick).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1] }),
    );
    expect(photoUri()).toBe('file:///tmp/crop.jpg');
    expect(screen.getByText('Your new photo is saved when you press Save.')).toBeOnTheScreen();
    expect(calls).toEqual([]);

    await save();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      `POST ${AVATAR}`,
      `PATCH ${PROFILE}`,
    ]);
    expect(calls[0]?.body).toBeInstanceOf(FormData);
    expect(sessionStore.get().user?.image).toBe(STORED);
    expect(await screen.findByText('Profile saved')).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('Cancel after picking uploads nothing', async () => {
    pick.mockResolvedValue(asset());
    const calls = await show();
    await choose();
    await fireEvent.press(screen.getByText('Cancel'));
    expect(calls).toEqual([]);
    expect(sessionStore.get().user?.image).toBeNull();
  });

  test.each([
    ['over 2 MB', { fileSize: 3 * 1024 * 1024 }, 'This photo is over 2 MB. Pick a smaller one.'],
    [
      'not an image the server takes',
      { mimeType: 'image/heic' },
      'Use a PNG, JPEG, WEBP or GIF photo.',
    ],
  ])('a photo %s is stopped before uploading', async (_name, over, message) => {
    pick.mockResolvedValue(asset(over));
    const calls = await show();
    await choose();
    expect(screen.getByTestId('profile-photo-error')).toHaveTextContent(message);
    expect(photoUri()).toBeUndefined();
    await save();
    expect(calls.map((c) => c.path)).toEqual([PROFILE]);
  });

  test('a refused upload stays on the form in English; the fields are not sent', async () => {
    pick.mockResolvedValue(asset());
    const calls = await show({
      status: 415,
      body: { error: 'Format foto harus PNG, JPEG, WEBP, atau GIF.', code: 'UNSUPPORTED_TYPE' },
    });
    await choose();
    await save();
    expect(await screen.findByTestId('profile-edit-error')).toHaveTextContent(
      'Use a PNG, JPEG, WEBP or GIF photo.',
    );
    expect(calls.map((c) => c.path)).toEqual([AVATAR]);
    expect(sessionStore.get().user?.image).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('a closed picker changes nothing; a picker that fails to open says so', async () => {
    pick.mockResolvedValueOnce({ canceled: true, assets: null });
    await show();
    await choose();
    expect(photoUri()).toBeUndefined();
    expect(screen.queryByTestId('profile-photo-error')).not.toBeOnTheScreen();

    pick.mockRejectedValueOnce(new Error('no activity'));
    await choose();
    expect(screen.getByTestId('profile-photo-error')).toHaveTextContent(
      "Couldn't open your photos. Try again.",
    );
  });
});
