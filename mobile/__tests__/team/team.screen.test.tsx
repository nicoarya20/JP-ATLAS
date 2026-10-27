// The Team screens against a stubbed `/api/app/team`: what is drawn, what is left out where the
// server left a key out, and the states while the request is out or has failed.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { PersonScreen } from '../../src/screens/team/person.screen';
import { TeamScreen } from '../../src/screens/team/team.screen';
import {
  personBody,
  type Reply,
  serveAppApi,
  teamBody,
  teamMember,
  whoami,
} from '../helpers/team-trash-server';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

/** What the stub answers next; a test sets these before rendering. */
let team: Reply = { body: teamBody([]) };
let person: Reply = { body: personBody() };
let role = 'project_manager';
/** Set to park every answer, so a test can look at the frame before the first one lands. */
let hold: Promise<void> | null = null;

const server = serveAppApi(async ({ path }) => {
  if (hold) await hold;
  if (path === '/api/app/team') return team;
  if (path.startsWith('/api/app/team/')) return person;
  if (path === '/api/app/whoami') return { body: whoami(role) };
  return { status: 500, body: { error: `no stub for ${path}`, code: 'X', status: 500 } };
});

beforeEach(() => {
  team = { body: teamBody([]) };
  person = { body: personBody() };
  role = 'project_manager';
  hold = null;
  jest.clearAllMocks();
});

const settled = (testID: string) =>
  waitFor(() => expect(screen.queryByTestId(testID)).not.toBeOnTheScreen());

describe('TeamScreen', () => {
  it('shows a loading state before the first answer', async () => {
    team = { body: teamBody([teamMember()]) };
    let answer = () => {};
    hold = new Promise<void>((resolve) => {
      answer = resolve;
    });
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    expect(screen.getByTestId('team-loading')).toBeOnTheScreen();
    answer();
    await settled('team-loading');
    expect(screen.getByTestId('team-row-u-rina')).toBeOnTheScreen();
  });

  it('reads every line a row shows, and opens the person by account id', async () => {
    team = {
      body: teamBody([
        teamMember({
          isSelf: true,
          availability: { kind: 'on_leave', until: '2026-10-14' },
          load: { active: 3, overdue: 1, alsoElsewhere: true },
        }),
      ]),
    };
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    await settled('team-loading');
    expect(screen.getByTestId('team-row-u-rina')).toHaveAccessibleName(
      'Rina Wulandari (You), UI Designer · Atlas (Member), On leave until Oct 14, Also has open tasks on projects you do not share, 3 active, 1 overdue',
    );
    await fireEvent.press(screen.getByTestId('team-row-u-rina'));
    expect(router.push).toHaveBeenCalledWith('/more/team/u-rina');
  });

  it('draws no counts where the server sent no load', async () => {
    team = { body: teamBody([teamMember()]) };
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    await settled('team-loading');
    expect(screen.queryByText('3 active')).not.toBeOnTheScreen();
    expect(screen.getByText('1 people · 1 projects')).toBeOnTheScreen();
  });

  it('shows the empty state for a team of nobody', async () => {
    team = { body: teamBody([], { total: 0 }) };
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    await settled('team-loading');
    expect(screen.getByTestId('team-empty')).toBeOnTheScreen();
    expect(screen.getByText('No team yet')).toBeOnTheScreen();
  });

  it("shows the server's own sentence on a failure, and retries", async () => {
    team = {
      status: 422,
      body: {
        error: 'Pengurutan itu tidak tersedia untukmu.',
        code: 'SORT_NOT_ALLOWED',
        status: 422,
      },
    };
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    await waitFor(() =>
      expect(screen.getByText('Pengurutan itu tidak tersedia untukmu.')).toBeOnTheScreen(),
    );
    team = { body: teamBody([teamMember()]) };
    await fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByTestId('team-row-u-rina')).toBeOnTheScreen());
  });

  it('asks for the next slice on Load more', async () => {
    team = { body: teamBody([teamMember()], { total: 40 }) };
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    await settled('team-loading');
    await fireEvent.press(screen.getByTestId('team-more'));
    await waitFor(() => expect(server.to('/api/app/team').at(-1)?.search.get('offset')).toBe('1'));
  });

  it('takes the closing note from whoami, not from a role of its own', async () => {
    role = 'admin';
    team = { body: teamBody([teamMember()]) };
    await render(<TeamScreen />, { wrapper: GluestackUIProvider });
    await waitFor(() =>
      expect(
        screen.getByText('Approving new users and changing roles happens in More › Users.'),
      ).toBeOnTheScreen(),
    );
  });
});

describe('PersonScreen', () => {
  it('shows the facts, the shared projects and the open tasks; rows open their items', async () => {
    person = {
      body: personBody({
        tasks: [
          {
            number: 15,
            title: 'Review the design',
            status: 'todo',
            dueDate: '2026-10-09',
            projectId: 'p-atlas',
          },
        ],
        load: { active: 1, overdue: 0 },
      }),
    };
    await render(<PersonScreen id="u-rina" />, { wrapper: GluestackUIProvider });
    await settled('person-loading');
    expect(screen.getByText('Rina Wulandari')).toBeOnTheScreen();
    expect(screen.getByText('rina@kantor.id')).toBeOnTheScreen();
    expect(screen.getByText('1 active · 0 overdue')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('#15 Review the design'));
    expect(router.push).toHaveBeenCalledWith('/tasks/15');
    await fireEvent.press(screen.getByText('Atlas (Member)'));
    expect(router.push).toHaveBeenCalledWith('/projects/p-atlas');
  });

  it('says why a task list is not shown, instead of showing an empty one', async () => {
    person = { body: personBody({ tasksVisible: false, tasks: undefined }) };
    await render(<PersonScreen id="u-rina" />, { wrapper: GluestackUIProvider });
    await settled('person-loading');
    expect(
      screen.getByText(
        "Other people's task lists are visible only to the project Manager and Admin.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('No active tasks.')).not.toBeOnTheScreen();
  });

  it('reads a 404 as "not found", for a hidden account as much as a missing one', async () => {
    person = { status: 404, body: { error: 'Tidak ditemukan.', code: 'NOT_FOUND', status: 404 } };
    await render(<PersonScreen id="u-gone" />, { wrapper: GluestackUIProvider });
    await waitFor(() => expect(screen.getByText('Person not found')).toBeOnTheScreen());
    expect(screen.queryByText('Tidak ditemukan.')).not.toBeOnTheScreen();
  });

  it("shows any other failure with the server's sentence", async () => {
    person = { status: 500, body: { error: 'Ada yang salah.', code: 'INTERNAL', status: 500 } };
    await render(<PersonScreen id="u-rina" />, { wrapper: GluestackUIProvider });
    await waitFor(() => expect(screen.getByText('Ada yang salah.')).toBeOnTheScreen());
  });
});
