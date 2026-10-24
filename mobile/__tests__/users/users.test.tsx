import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import type { Role } from '../../src/data/sample';
import { decide, getApproval, getRoles, resetDecisions } from '../../src/data/users';
import { UsersScreen } from '../../src/screens/users/users.screen';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

beforeEach(() => {
  resetDecisions();
  setParams({});
  jest.clearAllMocks();
});

const show = (role: Role = 'admin') =>
  render(<UsersScreen role={role} />, { wrapper: GluestackUIProvider });
const dialog = () => within(screen.getByTestId('users-confirm'));

describe('users data', () => {
  test('approval chips and the two sign-ups; Budi opens with the reason being written', () => {
    const d = getApproval();
    expect(d.chips).toEqual(['Pending 2', 'Approved 6', 'Rejected 1', 'Deactivated 0']);
    expect(d.waiting).toBe('2 waiting');
    expect(d.people.map((u) => [u.key, u.draft !== undefined])).toEqual([
      ['sari', false],
      ['budi', true],
    ]);
  });

  test('a decision takes the sign-up off the list and into the counts', () => {
    decide('sari', 'approved');
    decide('budi', 'rejected');
    const d = getApproval();
    expect(d.people).toEqual([]);
    expect(d.chips).toEqual(['Pending 0', 'Approved 7', 'Rejected 2', 'Deactivated 0']);
    expect(d.waiting).toBe('0 waiting');
  });

  test('deciding on someone not waiting throws with context', () => {
    expect(() => decide('nobody', 'approved')).toThrow(
      'Cannot decide on sign-up nobody: it is not waiting for approval',
    );
  });

  test('roles: six approved users, the Admin is me', () => {
    const d = getRoles();
    expect(d.count).toBe('6 users');
    expect(d.people.filter((p) => p.you).map((p) => p.person.key)).toEqual(['ayu']);
  });
});

describe('UsersScreen', () => {
  test('only an Admin gets in; others go home', async () => {
    await show('pm');
    expect(screen.getByTestId('redirect')).toHaveTextContent('/');
    expect(screen.queryByTestId('screen-users')).not.toBeOnTheScreen();
  });

  test('Approval: Approve asks first, naming the person and the starting role', async () => {
    await show();
    expect(screen.getByText('Pending 2')).toBeOnTheScreen();
    await fireEvent.press(within(screen.getByTestId('pending-sari')).getByText('Approve'));
    expect(dialog().getByText('Approve Sari Wulandari?')).toBeOnTheScreen();
    expect(
      dialog().getByText('Sari Wulandari joins as Member and can sign in to Home.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(screen.getByText('User approved as Member')).toBeOnTheScreen();
  });

  test('Approval: a new starting role carries into the dialog', async () => {
    await show();
    await fireEvent.press(screen.getByLabelText('Starting role'));
    await fireEvent.press(await screen.findByText('Project Manager'));
    await fireEvent.press(within(screen.getByTestId('pending-sari')).getByText('Approve'));
    expect(
      dialog().getByText('Sari Wulandari joins as Project Manager and can sign in to Home.'),
    ).toBeOnTheScreen();
  });

  test('Approval: Reject user asks first; Cancel in the dialog keeps the card', async () => {
    await show();
    await fireEvent.press(within(screen.getByTestId('pending-budi')).getByText('Reject user'));
    expect(dialog().getByText('Reject Budi Santoso?')).toBeOnTheScreen();
    await fireEvent.press(dialog().getByText('Cancel'));
    expect(screen.queryByTestId('users-confirm')).not.toBeOnTheScreen();
    expect(screen.queryByText('User rejected')).not.toBeOnTheScreen();
  });

  test('a confirmed Approve takes the card off the list and updates the counts', async () => {
    await show();
    await fireEvent.press(screen.getByLabelText('Approve Sari Wulandari'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(screen.queryByTestId('pending-sari')).not.toBeOnTheScreen();
    expect(screen.getByText('Pending 1')).toBeOnTheScreen();
    expect(screen.getByText('Approved 7')).toBeOnTheScreen();
    expect(screen.getByText('1 waiting')).toBeOnTheScreen();
  });

  test('Reject on a waiting card opens the reason first; a reason is required', async () => {
    await show();
    const card = () => within(screen.getByTestId('pending-sari'));
    await fireEvent.press(screen.getByLabelText('Reject Sari Wulandari'));
    expect(card().getByLabelText('Reason for rejecting (required)')).toBeOnTheScreen();
    await fireEvent.press(card().getByText('Reject user'));
    expect(card().getByText('Write a reason first')).toBeOnTheScreen();
    expect(screen.queryByTestId('users-confirm')).not.toBeOnTheScreen();
    await fireEvent.changeText(
      card().getByLabelText('Reason for rejecting (required)'),
      'Not on the employee list.',
    );
    await fireEvent.press(card().getByText('Reject user'));
    expect(dialog().getByText('Reject Sari Wulandari?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(screen.queryByTestId('pending-sari')).not.toBeOnTheScreen();
    expect(screen.getByText('Rejected 2')).toBeOnTheScreen();
    expect(screen.getByText('User rejected')).toBeOnTheScreen();
  });

  test('Cancel on the rejecting card goes back to Approve / Reject', async () => {
    await show();
    await fireEvent.press(screen.getByLabelText('Cancel rejecting Budi Santoso'));
    expect(screen.getByText('Rejection canceled')).toBeOnTheScreen();
    expect(screen.getByLabelText('Approve Budi Santoso')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Cancel rejecting Budi Santoso')).not.toBeOnTheScreen();
  });

  test('every sign-up decided: the empty state', async () => {
    decide('sari', 'approved');
    decide('budi', 'rejected');
    await show();
    expect(screen.getByTestId('approval-empty')).toBeOnTheScreen();
    expect(screen.getByText('No one is waiting for approval.')).toBeOnTheScreen();
  });

  test('"Starting role" is read once, as the picker\'s name; the tab row is named', async () => {
    await show();
    expect(screen.queryByText('Starting role')).not.toBeOnTheScreen();
    expect(
      within(screen.getByTestId('pending-sari')).getByLabelText('Starting role'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('users-tabs')).toHaveAccessibleName('Users sections');
  });

  test('the tab lives in the URL', async () => {
    await show();
    await fireEvent.press(screen.getByText('Roles'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'roles' });
  });

  test('Roles: my own row has no picker; changing a role names from and to', async () => {
    setParams({ tab: 'roles' });
    await show();
    expect(screen.queryByLabelText('Account role: Ayu Lestari')).not.toBeOnTheScreen();
    expect(screen.queryByLabelText('Deactivate Ayu Lestari')).not.toBeOnTheScreen();
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
    expect(screen.getByText('Role changed to Project Manager')).toBeOnTheScreen();
  });

  test('Roles: Deactivate asks first, naming the person and their role', async () => {
    setParams({ tab: 'roles' });
    await show();
    await fireEvent.press(screen.getByLabelText('Deactivate Dodi Hartono'));
    expect(dialog().getByText('Deactivate Dodi Hartono?')).toBeOnTheScreen();
    expect(dialog().getByText('Dodi Hartono (Member) can no longer sign in.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(screen.getByText('User deactivated')).toBeOnTheScreen();
  });
});
