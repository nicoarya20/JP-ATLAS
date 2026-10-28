// Users ① Approval against a stubbed `/api/admin/users*` (deliberately the Admin console's API): who gets in, the
// counts from `/users/stats`, the sign-ups oldest first, Approve / Reject asking first (T2) and sending the decision,
// a refusal shown in the server's words, the search sent once typing pauses, and "Load more".
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { forgetAllResources } from '../../src/data/resource';
import { usersListOf } from '../../src/data/users.admin.api';
import { UsersScreen } from '../../src/screens/users/users.screen';
import { serveAuth } from '../helpers/auth-server';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';
import { adminUser, usersQuery, usersServer } from '../helpers/users-fixtures';
import { whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  usersListOf('approval').reset();
  usersListOf('roles').reset();
  setParams({});
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

/** The Users screen as an Admin, over `admin` (a fresh server state unless given). */
async function show(admin = usersServer(), role: 'admin' | 'pm' = 'admin') {
  server = serveAuth({ ...whoamiRoute(role), ...admin.routes });
  await render(<UsersScreen />, { wrapper: Providers });
  return admin;
}
const dialog = () => within(screen.getByTestId('users-confirm'));
const card = (id: string) => within(screen.getByTestId(`pending-${id}`));
const listCalls = () =>
  (server?.calls ?? []).filter((u) => u.includes('/api/admin/users?')).map(usersQuery);

describe('UsersScreen: who gets in', () => {
  test('without the dashboard cap, Home; nothing of /api/admin is asked', async () => {
    await show(usersServer(), 'pm');
    expect(await screen.findByTestId('redirect')).toHaveTextContent('/');
    expect(screen.queryByTestId('screen-users')).not.toBeOnTheScreen();
    expect(server?.calls.some((u) => u.includes('/api/admin/'))).toBe(false);
  });

  test('waits for whoami; a failed whoami says why', async () => {
    let answer = () => {};
    const held = new Promise<void>((r) => {
      answer = r;
    });
    server = serveAuth({
      '/api/app/whoami': {
        wait: held,
        status: 503,
        body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
      },
    });
    await render(<UsersScreen />, { wrapper: Providers });
    expect(screen.getByTestId('users-loading')).toBeOnTheScreen();
    await act(async () => answer());
    expect(await screen.findByTestId('users-failed')).toBeOnTheScreen();
    expect(screen.getByText('Sedang pemeliharaan.')).toBeOnTheScreen();
  });
});

describe('UsersScreen: Approval', () => {
  test('counts, the sign-ups oldest first with when they asked, and the request that read them', async () => {
    await show();
    expect(await screen.findByText('Pending 2')).toBeOnTheScreen();
    expect(screen.getByText('Deactivated 1')).toBeOnTheScreen();
    expect(screen.getByText('2 waiting')).toBeOnTheScreen();
    expect(card('u-sari').getByText('Oct 6 · 9:41 AM')).toBeOnTheScreen();
    expect(card('u-sari').getByText('sari@kantor.id')).toBeOnTheScreen();
    expect(screen.getByTestId('pending-u-budi')).toBeOnTheScreen();
    expect(listCalls()).toEqual([{ approval: 'pending', sort: 'oldest', page: '1', limit: '25' }]);
  });

  test('Approve asks first with the starting role, sends it, and the card leaves', async () => {
    const admin = await show();
    await screen.findByTestId('pending-u-sari');
    await fireEvent.press(card('u-sari').getByLabelText('Starting role'));
    await fireEvent.press(await screen.findByText('Project Manager'));
    await fireEvent.press(screen.getByLabelText('Approve Sari Wulandari'));
    expect(dialog().getByText('Approve Sari Wulandari?')).toBeOnTheScreen();
    expect(
      dialog().getByText('Sari Wulandari joins as Project Manager and can sign in to Home.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByText('User approved as Project Manager')).toBeOnTheScreen();
    expect(admin.writes).toEqual([
      {
        url: expect.stringMatching(/\/api\/admin\/users\/u-sari\/approve$/),
        body: { role: 'project_manager' },
      },
    ]);
    expect(await screen.findByText('1 waiting')).toBeOnTheScreen();
    expect(screen.queryByTestId('pending-u-sari')).not.toBeOnTheScreen();
    expect(screen.getByText('Pending 1')).toBeOnTheScreen();
  });

  test('Reject opens the reason first; without one it says so; with one it asks, then sends it', async () => {
    const admin = await show();
    await fireEvent.press(await screen.findByLabelText('Reject Budi Santoso'));
    await fireEvent.press(card('u-budi').getByText('Reject user'));
    expect(card('u-budi').getByText('Write a reason first')).toBeOnTheScreen();
    expect(screen.queryByTestId('users-confirm')).not.toBeOnTheScreen();
    await fireEvent.changeText(
      card('u-budi').getByLabelText('Reason for rejecting (required)'),
      '  Not on the employee list. ',
    );
    await fireEvent.press(card('u-budi').getByText('Reject user'));
    expect(dialog().getByText('Reject Budi Santoso?')).toBeOnTheScreen();
    expect(
      dialog().getByText("budi@kantor.id can't sign in. Budi Santoso sees your reason."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByText('User rejected')).toBeOnTheScreen();
    expect(admin.writes.map((w) => w.body)).toEqual([{ reason: 'Not on the employee list.' }]);
    expect(admin.writes[0]?.url).toMatch(/\/u-budi\/reject$/);
  });

  test('Cancel on the rejecting card goes back to Approve / Reject; Cancel in the dialog sends nothing', async () => {
    const admin = await show();
    await fireEvent.press(await screen.findByLabelText('Reject Budi Santoso'));
    await fireEvent.press(screen.getByLabelText('Cancel rejecting Budi Santoso'));
    expect(screen.getByText('Rejection canceled')).toBeOnTheScreen();
    expect(screen.getByLabelText('Approve Budi Santoso')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('Approve Budi Santoso'));
    await fireEvent.press(dialog().getByText('Cancel'));
    expect(screen.queryByTestId('users-confirm')).not.toBeOnTheScreen();
    expect(admin.writes).toEqual([]);
  });

  test('a refusal stays in the dialog in the server’s own words (a 403 as it came)', async () => {
    const admin = usersServer();
    admin.refuseWith({
      status: 403,
      body: {
        error: 'Admin hanya boleh memberi peran Member atau Project Manager.',
        code: 'ROLE_NOT_GRANTABLE',
      },
    });
    await show(admin);
    await fireEvent.press(await screen.findByLabelText('Approve Sari Wulandari'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(
      await dialog().findByText('Admin hanya boleh memberi peran Member atau Project Manager.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('pending-u-sari')).toBeOnTheScreen();
  });

  test('no one waiting: the empty state', async () => {
    await show(usersServer({ pending: [] }));
    expect(await screen.findByTestId('approval-empty')).toBeOnTheScreen();
    expect(screen.getByText('No one is waiting for approval.')).toBeOnTheScreen();
  });

  test('the search goes to the server once typing pauses; nobody matching says so', async () => {
    await show();
    await screen.findByTestId('pending-u-sari');
    await fireEvent.changeText(screen.getByPlaceholderText('Search name or email…'), 'budi');
    expect(listCalls()).toHaveLength(1);
    await act(async () => jest.advanceTimersByTime(300));
    expect(listCalls().at(-1)).toMatchObject({ approval: 'pending', search: 'budi', page: '1' });
    expect(await screen.findByText('1 waiting')).toBeOnTheScreen();
    expect(screen.queryByTestId('pending-u-sari')).not.toBeOnTheScreen();

    await fireEvent.changeText(screen.getByPlaceholderText('Search name or email…'), 'zzz');
    await act(async () => jest.advanceTimersByTime(300));
    expect(await screen.findByText('No one matches this search.')).toBeOnTheScreen();
    expect(screen.queryByTestId('approval-empty')).not.toBeOnTheScreen();
  });

  test('Load more asks for the next page and appends it', async () => {
    const many = Array.from({ length: 26 }, (_, i) =>
      adminUser({
        id: `u-${i}`,
        name: `Person ${String(i).padStart(2, '0')}`,
        email: `p${i}@kantor.id`,
      }),
    );
    await show(usersServer({ pending: many }));
    await fireEvent.press(await screen.findByTestId('users-approval-more'));
    expect(await screen.findByTestId('pending-u-25')).toBeOnTheScreen();
    expect(screen.queryByTestId('users-approval-more')).not.toBeOnTheScreen();
    expect(listCalls().at(-1)).toMatchObject({ page: '2', limit: '25' });
  });

  test('the tab lives in the URL', async () => {
    await show();
    await fireEvent.press(await screen.findByText('Roles'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'roles' });
  });
});
