// The Team screens against a stubbed `/api/app/team`: the rows the server sent, search and sort sent to it, loading,
// failure, empty and no-match, "Load more", and one person by account id. The data layer is
// __tests__/data/team.api.test.ts.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { forgetAllResources } from '../../src/data/resource';
import { resetTeamQuery } from '../../src/data/team.api';
import { PersonScreen } from '../../src/screens/team/person.screen';
import { TeamScreen } from '../../src/screens/team/team.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { list, me, query, rina, rinaDetail } from '../helpers/team-fixtures';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  resetTeamQuery();
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

const showTeam = () => render(<TeamScreen />, { wrapper: GluestackUIProvider });
const showPerson = (id: string) =>
  render(<PersonScreen id={id} />, { wrapper: GluestackUIProvider });

describe('TeamScreen', () => {
  test('rows read every line the server sent, me marked (You); a row opens the person by account id', async () => {
    serve({ '/api/app/team?': { body: list([me(), rina()]) } });
    await showTeam();
    expect(
      await screen.findByText('2 people · 1 project · 5 active tasks · 1 overdue'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('team-row-u-nico')).toHaveAccessibleName(/^Nico Pratama \(You\), /);
    expect(screen.getByTestId('team-row-u-rina')).toHaveAccessibleName(
      'Rina Wulandari, Designer, Member · Atlas Project, 3 active, 1 overdue',
    );
    expect(screen.queryByText(/Available/)).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('team-row-u-rina'));
    expect(router.push).toHaveBeenCalledWith('/more/team/u-rina');
  });

  test('a Member: no counts, no load sorts, and the note says why', async () => {
    serve({
      '/api/app/team?': { body: list([me(), rina({ load: undefined })], { counts: false }) },
    });
    await showTeam();
    expect(
      await screen.findByText(
        'Task counts per person are visible only to that person, the project Manager and Admin.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('team-sort')).not.toBeOnTheScreen();
    expect(screen.getByTestId('team-row-u-rina')).toHaveAccessibleName(
      'Rina Wulandari, Designer, Member · Atlas Project',
    );
  });

  test('sorting asks the server; a refused sort shows its sentence and goes back to Name', async () => {
    const s = serve({
      '/api/app/team?': (url) =>
        query(url).sort === 'overdue'
          ? {
              status: 422,
              body: { error: 'Urutan ini tidak tersedia untuk Anda.', code: 'SORT_NOT_ALLOWED' },
            }
          : { body: list([me(), rina()]) },
    });
    await showTeam();
    await fireEvent.press(await screen.findByRole('radio', { name: 'Overdue' }));
    expect(await screen.findByText('Urutan ini tidak tersedia untuk Anda.')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Name' })).toBeChecked();
    expect(s.calls.filter((u) => u.includes('sort=overdue'))).toHaveLength(1);
  });

  test('search goes to the server after typing pauses; no match offers a reset', async () => {
    const s = serve({
      '/api/app/team?': (url) =>
        query(url).q ? { body: list([], { total: 0 }) } : { body: list([me(), rina()]) },
    });
    await showTeam();
    await fireEvent.changeText(await screen.findByPlaceholderText('Search name…'), 'zz');
    await act(async () => jest.advanceTimersByTime(300));
    expect(await screen.findByText('No one matches this search.')).toBeOnTheScreen();
    expect(s.calls.filter((u) => u.includes('q=zz'))).toHaveLength(1);
  });

  test('loading, then a failure in the server words with "Try again"', async () => {
    let release = () => {};
    const held = new Promise<void>((r) => {
      release = r;
    });
    serve({
      '/api/app/team?': {
        status: 503,
        body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
        wait: held,
      },
    });
    await showTeam();
    expect(screen.getByTestId('team-loading')).toBeOnTheScreen();
    await act(async () => release());
    expect(await screen.findByText('Sedang pemeliharaan.')).toBeOnTheScreen();
    server?.use({ '/api/app/team?': { body: list([rina()]) } });
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('team-row-u-rina')).toBeOnTheScreen();
  });

  test('no team yet: the empty state', async () => {
    serve({ '/api/app/team?': { body: list([], { total: 0 }) } });
    await showTeam();
    expect(await screen.findByText('No team yet')).toBeOnTheScreen();
  });

  test('"Load more" appends the next page', async () => {
    serve({
      '/api/app/team?': (url) =>
        Number(query(url).offset)
          ? { body: list([rina()], { total: 2 }) }
          : { body: list([me()], { total: 2 }) },
    });
    await showTeam();
    expect(await screen.findByText('Showing 1 of 2')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('team-more'));
    expect(await screen.findByTestId('team-row-u-rina')).toBeOnTheScreen();
    expect(screen.queryByTestId('team-more')).not.toBeOnTheScreen();
  });
});

describe('PersonScreen', () => {
  test('facts, shared projects and tasks; a task opens', async () => {
    serve({ '/api/app/team/u-rina': { body: rinaDetail() } });
    await showPerson('u-rina');
    expect(await screen.findByText('Rina Wulandari')).toBeOnTheScreen();
    expect(screen.getByText('Shared projects')).toBeOnTheScreen();
    expect(screen.queryByText('Account role')).not.toBeOnTheScreen();
    expect(screen.getByText('2 active · 1 overdue')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByLabelText('#14 Polish onboarding, Overdue, Atlas Project · Due Oct 5'),
    );
    expect(router.push).toHaveBeenCalledWith('/tasks/14');
  });

  test('may not see the work: says so, and names no other project', async () => {
    serve({
      '/api/app/team/u-rina': {
        body: rinaDetail({
          tasks: undefined,
          load: undefined,
          tasksVisible: false,
          alsoElsewhere: true,
        }),
      },
    });
    await showPerson('u-rina');
    expect(await screen.findByTestId('person-tasks-hidden')).toBeOnTheScreen();
    expect(screen.getByText(/also works on other projects/)).toBeOnTheScreen();
  });

  test('someone who shares no project: not found, in the server words', async () => {
    serve({
      '/api/app/team/u-x': {
        status: 404,
        body: { error: 'Orang ini tidak ditemukan.', code: 'NOT_FOUND' },
      },
    });
    await showPerson('u-x');
    expect(await screen.findByText('Person not found')).toBeOnTheScreen();
    expect(screen.getByText('Orang ini tidak ditemukan.')).toBeOnTheScreen();
  });
});
