// A Users decision reaches every count of sign-ups waiting (W3e): the Users badge the More panel reads. The More panel
// itself is covered in navigation/tab-bar.more.test.tsx. The Inbox no longer moves with it: its approval cards are the
// server's `user_pending` cards and its badge is `GET /api/app/inbox/count`, both resolved by the server (W3-Inbox).
// Home no longer shows approvals: it reads GET /api/app/home, which has no count of them (GAP H-5).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetEvents } from '../../src/data/events.store';
import { inboxCountResource } from '../../src/data/inbox.api';
import { getProfile } from '../../src/data/profile';
import { forgetAllResources } from '../../src/data/resource';
import type { Role } from '../../src/data/sample';
import { resetTasks } from '../../src/data/tasks.store';
import { decide, resetDecisions } from '../../src/data/users';
import { moreTiles, tileLabel } from '../../src/screens/more/more.tiles';
import { UsersScreen } from '../../src/screens/users/users.screen';
import { serveAuth } from '../helpers/auth-server';
import { counts } from '../helpers/inbox-fixtures';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const ADMIN: Role = 'admin';

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
  resetDecisions();
  setParams({});
});
afterEach(() => {
  server?.restore();
  server = null;
  resetTasks();
  resetEvents();
});

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });
const tiles = () => moreTiles(ADMIN).map(tileLabel);

describe('Users decisions in every count', () => {
  test('approving Sari in Users drops the Users badge to one', async () => {
    const users = await show(<UsersScreen role={ADMIN} />);
    await fireEvent.press(screen.getByLabelText('Approve Sari Wulandari'));
    await fireEvent.press(screen.getByTestId('confirm-action'));
    await users.unmount();

    // No Inbox count asked for yet: no badge, rather than one made up from local decisions.
    expect(tiles()).toEqual(['Inbox', 'Team', 'Users, 1 new', 'Archive', 'Settings']);
  });

  test('with no one left the Users badge goes; the Inbox badge stays what the server counts', async () => {
    server = serveAuth({ '/api/app/inbox/count': { body: counts(2) } });
    await inboxCountResource.ensure();
    decide('sari', 'approved');
    decide('budi', 'rejected');

    expect(tiles()).toEqual(['Inbox, 2 new', 'Team', 'Users', 'Archive', 'Settings']);
    expect(getProfile(ADMIN).inbox).toBe(2);
  });
});
