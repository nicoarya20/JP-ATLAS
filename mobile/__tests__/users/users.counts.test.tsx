// A Users decision reaches every count of sign-ups waiting (W3e): the Inbox approvals card and its tab count, and the
// Inbox and Users badges the More panel and profile read. The More panel itself is covered in
// navigation/tab-bar.more.test.tsx. Home no longer shows approvals: it reads GET /api/app/home, which has no count of
// them (GAP H-5); they come back to Home with the Inbox wiring.
import { fireEvent, render, screen } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetEvents } from '../../src/data/events.store';
import { getProfile } from '../../src/data/profile';
import type { Role } from '../../src/data/sample';
import { resetTasks } from '../../src/data/tasks.store';
import { decide, resetDecisions } from '../../src/data/users';
import { InboxScreen } from '../../src/screens/inbox/inbox.screen';
import { moreTiles, tileLabel } from '../../src/screens/more/more.tiles';
import { UsersScreen } from '../../src/screens/users/users.screen';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const ADMIN: Role = 'admin';

drainToastTimers();

beforeEach(() => {
  resetDecisions();
  setParams({});
});
afterEach(() => {
  resetTasks();
  resetEvents();
});

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });
const tiles = () => moreTiles(ADMIN).map(tileLabel);

describe('Users decisions in every count', () => {
  test('approving Sari in Users drops each count to one', async () => {
    const users = await show(<UsersScreen role={ADMIN} />);
    await fireEvent.press(screen.getByLabelText('Approve Sari Wulandari'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    await users.unmount();

    await show(<InboxScreen role={ADMIN} />);
    expect(screen.getByText('Needs your response (3)')).toBeOnTheScreen();
    expect(screen.getByText('1 new user awaiting approval')).toBeOnTheScreen();

    expect(tiles()).toEqual(['Inbox, 3 new', 'Team', 'Users, 1 new', 'Archive', 'Settings']);
  });

  test('with no one left, the approvals card and the Users badge go; Inbox counts two', async () => {
    decide('sari', 'approved');
    decide('budi', 'rejected');

    await show(<InboxScreen role={ADMIN} />);
    expect(screen.getByText('Needs your response (2)')).toBeOnTheScreen();
    expect(screen.queryByTestId('inbox-card-approvals')).not.toBeOnTheScreen();

    expect(tiles()).toEqual(['Inbox, 2 new', 'Team', 'Users', 'Archive', 'Settings']);
    expect(getProfile(ADMIN).inbox).toBe(2);
  });
});
