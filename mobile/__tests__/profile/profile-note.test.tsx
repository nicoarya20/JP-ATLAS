// The status note beside the photo (GAP P-1) against `GET/PATCH /api/app/profile`: it starts from the server, Done
// saves it trimmed and says so, a blank note clears it, an unchanged one sends nothing, a refusal brings the old note
// back with the reason, and nothing is offered before the profile is in.
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { forgetAllResources } from '../../src/data/resource';
import { ProfileScreen } from '../../src/screens/profile/profile.screen';
import { type AuthReply, serveAuth } from '../helpers/auth-server';
import { counts } from '../helpers/inbox-fixtures';
import { profileWire } from '../helpers/profile-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';
import { whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

const PROFILE = '/api/app/profile';

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

/**
 * The profile modal over a server holding `note`; PATCH stores what it is sent unless `refuse` answers instead. Returns
 * the PATCH bodies in order.
 */
async function show(note: string | null, refuse?: AuthReply) {
  let current = note;
  const patches: unknown[] = [];
  server = serveAuth({
    ...whoamiRoute('pm'),
    '/api/app/inbox/count': { body: counts(0) },
    '/api/app/team': { body: { items: [] } },
    [PROFILE]: (_url, init) => {
      if (init?.method !== 'PATCH') return { body: profileWire({ note: current }) };
      const body = JSON.parse(String(init.body)) as { note: string };
      patches.push(body);
      if (refuse) return refuse;
      current = body.note.trim() || null;
      return { body: profileWire({ note: current }) };
    },
  });
  await render(<ProfileScreen />, { wrapper: GluestackUIProvider });
  await screen.findByTestId('profile-note');
  return patches;
}
const type = async (text: string) => {
  await fireEvent.press(screen.getByTestId('profile-note'));
  await fireEvent.changeText(screen.getByTestId('profile-note-input'), text);
  await act(async () => fireEvent(screen.getByTestId('profile-note-input'), 'submitEditing'));
};

describe('Profile note', () => {
  test('no note yet: the bubble invites one; Done saves it trimmed and says so', async () => {
    const patches = await show(null);
    expect(screen.getByRole('button', { name: 'Add a note' })).toHaveTextContent('+ Add a note');
    await type('  Back from leave ');
    expect(patches).toEqual([{ note: 'Back from leave' }]);
    expect(await screen.findByText('Note saved')).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Note: Back from leave. Edit note' }),
    ).toBeOnTheScreen();
  });

  test('the input stops at the server’s 60 characters', async () => {
    await show(null);
    await fireEvent.press(screen.getByTestId('profile-note'));
    expect(screen.getByTestId('profile-note-input')).toHaveProp('maxLength', 60);
  });

  test('a blank note clears it; an unchanged one sends nothing', async () => {
    const patches = await show('In a workshop');
    expect(
      screen.getByRole('button', { name: 'Note: In a workshop. Edit note' }),
    ).toBeOnTheScreen();
    await type('In a workshop');
    expect(patches).toEqual([]);

    await type('   ');
    expect(patches).toEqual([{ note: '' }]);
    expect(await screen.findByText('Note cleared')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Add a note' })).toBeOnTheScreen();
  });

  test('a refusal brings the old note back with the server’s reason', async () => {
    await show('In a workshop', {
      status: 503,
      body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
    });
    await type('Back tomorrow');
    expect(await screen.findByText('Note not saved. Sedang pemeliharaan.')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Note: In a workshop. Edit note' }),
    ).toBeOnTheScreen();
  });

  test('nothing to edit before the profile is in', async () => {
    server = serveAuth({
      ...whoamiRoute('pm'),
      '/api/app/inbox/count': { body: counts(0) },
      [PROFILE]: { status: 503, body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' } },
    });
    await render(<ProfileScreen />, { wrapper: GluestackUIProvider });
    await screen.findByLabelText('Inbox');
    expect(screen.queryByTestId('profile-note')).not.toBeOnTheScreen();
  });
});
