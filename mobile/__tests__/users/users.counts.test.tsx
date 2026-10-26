// A Users decision reaches the Users badge the More panel reads, and the screen that is already open
// redraws with it (W3e). The More panel itself is covered in navigation/tab-bar.more.test.tsx.
//
// Home's Awaiting chip, its approval row and the Inbox approvals card left this file with Fase 2:
// those counts come from the server now, not from the sample's sign-ups, so Home no longer has an
// Awaiting chip at all (phase2-gap-disembunyikan.md, Home A-9/A-13) and the Inbox shows one card per
// account exactly as the server sends it (__tests__/data/inbox.test.ts, __tests__/inbox/inbox.test.tsx).
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import type { Role } from '../../src/data/sample';
import { decide, resetDecisions } from '../../src/data/users';
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

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });
const tiles = () => moreTiles(ADMIN).map(tileLabel);

describe('Users decisions in every count', () => {
  test('approving Sari in Users drops the badge to one', async () => {
    await show(<UsersScreen role={ADMIN} />);
    await fireEvent.press(screen.getByLabelText('Approve Sari Wulandari'));
    await fireEvent.press(screen.getByTestId('confirm-action'));

    expect(tiles()).toEqual(['Inbox', 'Team', 'Users, 1 new', 'Archive', 'Settings']);
  });

  test('with no one left the Users badge goes', () => {
    decide('sari', 'approved');
    decide('budi', 'rejected');

    expect(tiles()).toEqual(['Inbox', 'Team', 'Users', 'Archive', 'Settings']);
  });

  test('a screen already open redraws when a decision is taken', async () => {
    await show(<UsersScreen role={ADMIN} />);
    expect(screen.getByLabelText('Approve Sari Wulandari')).toBeOnTheScreen();

    await act(() => decide('sari', 'approved'));

    expect(screen.queryByLabelText('Approve Sari Wulandari')).not.toBeOnTheScreen();
  });
});
