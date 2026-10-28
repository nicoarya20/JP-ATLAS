// Projects ① list against a stubbed `GET /api/app/projects`: the cards the server sent, the
// request each control makes (scope, sort, status, perhatian, q, page), loading, failure, empty, no-match and
// "Load more". The paging rules themselves are in __tests__/data/projects.api.test.ts.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetProjectsQuery } from '../../src/data/projects.api';
import { forgetAllResources } from '../../src/data/resource';
import { ProjectsScreen } from '../../src/screens/projects/list/projects.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { atlasItem, many, page, query, sinarItem } from '../helpers/projects-fixtures';
import { Providers } from '../helpers/providers';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};
/** The query strings of every list request so far. */
const asked = () =>
  (server?.calls ?? []).filter((u) => u.includes('/api/app/projects?')).map(query);

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

const wrap = { wrapper: Providers };
const showList = () => render(<ProjectsScreen />, wrap);
const cardIds = () =>
  screen.queryAllByTestId(/^project-card-/).map((c) => String(c.props.testID).slice(13));

describe('Projects list', () => {
  test('asks for every project the viewer may see, nearest deadline first, and reads each card', async () => {
    serve({ '/api/app/projects?': { body: page([atlasItem(), sinarItem()]) } });
    await showList();
    expect(await screen.findByTestId('project-card-p-atlas')).toHaveAccessibleName(
      'Atlas Project, Active, Lead: Nico Pratama, At risk, 1 tugas penting terlambat, Progress 70%, Due Oct 31',
    );
    // No Lead, no deadline, no tasks, not active: says so instead of blanks, and no condition.
    expect(screen.getByTestId('project-card-p-sinar')).toHaveAccessibleName(
      'Sinar Rebrand, On hold, Lead: No lead, No tasks yet, Progress –, Due No deadline',
    );
    expect(asked()).toEqual([{ scope: 'all', sort: 'due', page: '1', limit: '25' }]);
    await fireEvent.press(screen.getByTestId('project-card-p-atlas'));
    expect(router.push).toHaveBeenCalledWith('/projects/p-atlas');
  });

  test('loading, then a failure with the server sentence; Try again asks again', async () => {
    let answer = () => {};
    const s = serve({
      '/api/app/projects?': {
        status: 503,
        body: { error: 'Sedang pemeliharaan.' },
        wait: new Promise<void>((r) => {
          answer = r;
        }),
      },
    });
    await showList();
    expect(screen.getByTestId('projects-loading')).toBeOnTheScreen();
    await act(async () => answer());
    expect(await screen.findByText('Sedang pemeliharaan.')).toBeOnTheScreen();
    s.use({ '/api/app/projects?': { body: page([atlasItem()]) } });
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('project-card-p-atlas')).toBeOnTheScreen();
  });

  test('no project at all: the empty state, not a no-match', async () => {
    serve({ '/api/app/projects?': { body: page([]) } });
    await showList();
    expect(await screen.findByTestId('projects-empty')).toBeOnTheScreen();
    expect(screen.queryByText('No projects match these filters.')).not.toBeOnTheScreen();
  });

  test('the name search goes to the server after a pause; no match resets search and filters', async () => {
    serve({
      '/api/app/projects?': (url) =>
        query(url).q === 'zz' ? { body: page([]) } : { body: page([atlasItem()]) },
    });
    await showList();
    await fireEvent.changeText(await screen.findByPlaceholderText('Search project name…'), '  zz ');
    await act(async () => jest.advanceTimersByTime(300));
    expect(await screen.findByText('No projects match these filters.')).toBeOnTheScreen();
    expect(asked()[1]).toEqual({ scope: 'all', sort: 'due', page: '1', limit: '25', q: 'zz' });
    await fireEvent.press(screen.getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByTestId('project-card-p-atlas')).toBeOnTheScreen();
    expect(asked().at(-1)).toEqual({ scope: 'all', sort: 'due', page: '1', limit: '25' });
    expect(screen.getByPlaceholderText('Search project name…').props.value).toBe('');
  });

  test('Load more asks the next page and adds its new rows; the button goes once all are shown', async () => {
    serve({
      '/api/app/projects?': (url) =>
        query(url).page === '2'
          ? { body: page([...many(1, 25), ...many(2, 26)], { total: 27, n: 2 }) }
          : { body: page(many(25), { total: 27 }) },
    });
    await showList();
    expect(await screen.findByText('Showing 25 of 27')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('projects-more'));
    expect(await screen.findByTestId('project-card-p-27')).toBeOnTheScreen();
    // p-25 came back on page 2 as well (the list moved): it is shown once.
    expect(cardIds()).toHaveLength(27);
    expect(asked()[1]).toMatchObject({ page: '2', limit: '25' });
    expect(screen.queryByTestId('projects-more')).not.toBeOnTheScreen();
  });

  test('a failed Load more keeps the cards and says why', async () => {
    serve({
      '/api/app/projects?': (url) =>
        query(url).page === '2'
          ? { status: 500, body: { error: 'Gagal memuat proyek.' } }
          : { body: page(many(25), { total: 30 }) },
    });
    await showList();
    await fireEvent.press(await screen.findByTestId('projects-more'));
    // In a notice, and under the cards until the next good answer.
    expect(await screen.findByTestId('projects-error')).toHaveTextContent('Gagal memuat proyek.');
    expect(cardIds()).toHaveLength(25);
  });
});
