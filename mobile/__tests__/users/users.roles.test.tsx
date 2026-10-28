// Users ② Roles against a stubbed `/api/admin/users*`: approved accounts by name, read-only where the server's policy
// would refuse (yourself, a Super-admin, an Admin unless you are a Super-admin), and the T2 role change, Deactivate
// (ban) and Reactivate (unban), each sent to its own route and read back. Plus the row rules on their own.
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { forgetAllResources } from '../../src/data/resource';
import { usersListOf } from '../../src/data/users.admin.api';
import { accountRow, signUpCard } from '../../src/data/users.admin.view';
import { UsersScreen } from '../../src/screens/users/users.screen';
import { serveAuth } from '../helpers/auth-server';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';
import { ACCOUNTS, adminUser, usersQuery, usersServer } from '../helpers/users-fixtures';
import { whoamiAs, whoamiRoute } from '../helpers/whoami-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  usersListOf('approval').reset();
  usersListOf('roles').reset();
  setParams({ tab: 'roles' });
});
afterEach(() => {
  server?.restore();
  server = null;
});

async function show(admin = usersServer()) {
  server = serveAuth({ ...whoamiRoute('admin'), ...admin.routes });
  await render(<UsersScreen />, { wrapper: Providers });
  await screen.findByTestId('role-row-u-rina');
  return admin;
}
const row = (id: string) => within(screen.getByTestId(`role-row-${id}`));
const dialog = () => within(screen.getByTestId('users-confirm'));

describe('Roles tab', () => {
  test('every approved account by name; read-only where the server would refuse', async () => {
    await show();
    expect(screen.getByText('5 users')).toBeOnTheScreen();
    const asked = server?.calls.filter((u) => u.includes('/api/admin/users?')).map(usersQuery);
    expect(asked).toEqual([{ approval: 'approved', sort: 'name', page: '1', limit: '25' }]);
    // Me, a Super-admin, another Admin: role and status shown, nothing to press.
    expect(row('u-nico').getByText('Nico Arya (You)')).toBeOnTheScreen();
    for (const [id, name, role] of [
      ['u-nico', 'Nico Arya', 'Admin'],
      ['u-ayu', 'Ayu Lestari', 'Super-admin'],
      ['u-dewi', 'Dewi Kusuma', 'Admin'],
    ]) {
      expect(row(id as string).getByText(role as string)).toBeOnTheScreen();
      expect(screen.queryByLabelText(`Account role: ${name}`)).not.toBeOnTheScreen();
      expect(screen.queryByLabelText(`Deactivate ${name}`)).not.toBeOnTheScreen();
    }
    expect(screen.getByLabelText('Account role: Rina Wulandari')).toBeOnTheScreen();
    // Deactivated: no role picker, Reactivate instead.
    expect(row('u-dodi').getByText('Deactivated')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Account role: Dodi Hartono')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Reactivate Dodi Hartono')).toBeOnTheScreen();
  });

  test('a role change names from and to, posts the new role and shows it once read back', async () => {
    const admin = await show();
    await fireEvent.press(screen.getByLabelText('Account role: Rina Wulandari'));
    const options = await screen.findAllByText('Project Manager');
    await fireEvent.press(options[options.length - 1]);
    expect(dialog().getByText("Change Rina Wulandari's role?")).toBeOnTheScreen();
    expect(
      dialog().getByText(
        'Rina Wulandari goes from Member to Project Manager. Role changes take effect at the next sign-in.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByText('Role changed to Project Manager')).toBeOnTheScreen();
    expect(admin.writes).toEqual([
      {
        url: expect.stringMatching(/\/api\/admin\/users\/u-rina\/role$/),
        body: { role: 'project_manager' },
      },
    ]);
  });

  test('Deactivate asks first (danger) and bans; Reactivate asks first and unbans', async () => {
    const admin = await show();
    await fireEvent.press(screen.getByLabelText('Deactivate Rina Wulandari'));
    expect(dialog().getByText('Deactivate Rina Wulandari?')).toBeOnTheScreen();
    expect(
      dialog().getByText(
        'Rina Wulandari (Member) is signed out everywhere and can no longer sign in.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByText('User deactivated')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Reactivate Rina Wulandari')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Reactivate Dodi Hartono'));
    expect(
      dialog().getByText('Dodi Hartono can sign in again with the role they had.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByText('User reactivated')).toBeOnTheScreen();
    expect(admin.writes.map((w) => [w.url.split('/users/')[1], w.body])).toEqual([
      ['u-rina/ban', {}],
      ['u-dodi/unban', {}],
    ]);
  });

  test('a refused change stays in the dialog with the server’s sentence; the row keeps its role', async () => {
    const admin = usersServer();
    admin.refuseWith({
      status: 403,
      body: { error: 'Akun ini dilindungi.', code: 'TARGET_PROTECTED' },
    });
    await show(admin);
    await fireEvent.press(screen.getByLabelText('Deactivate Rina Wulandari'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await dialog().findByText('Akun ini dilindungi.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Deactivate Rina Wulandari')).toBeOnTheScreen();
  });
});

describe('Users rows', () => {
  const me = (role: 'admin' | 'super-admin') => ({ ...whoamiAs('admin'), role });

  test('an Admin gives Member or Project Manager; a Super-admin may also give Admin', () => {
    const rina = ACCOUNTS().find((u) => u.id === 'u-rina');
    const dewi = ACCOUNTS().find((u) => u.id === 'u-dewi');
    if (!rina || !dewi) throw new Error('fixture accounts changed');
    expect(accountRow(rina, me('admin')).options.map((o) => o.label)).toEqual([
      'Member',
      'Project Manager',
    ]);
    expect(accountRow(dewi, me('admin')).editable).toBe(false);
    const asSuper = accountRow(dewi, me('super-admin'));
    expect(asSuper.editable).toBe(true);
    expect(asSuper.options.map((o) => o.value)).toEqual(['member', 'project_manager', 'admin']);
  });

  test('a legacy or missing role reads as Member; a sign-up says when it asked, in the team zone', () => {
    expect(accountRow(adminUser({ role: 'user' }), null).roleLabel).toBe('Member');
    expect(accountRow(adminUser({ role: null }), null).role).toBe('member');
    expect(signUpCard(adminUser({ createdAt: '2026-10-06T14:05:00.000Z' })).asked).toBe(
      'Oct 6 · 9:05 PM',
    );
  });
});
