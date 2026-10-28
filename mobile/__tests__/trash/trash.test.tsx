// The Trash against a stubbed `/api/app/trash`: the cards the server sent in the app's words, the kind chips and the
// request they make, "Load more", Restore with its notice and what it marks stale, a refused Restore, and Delete
// forever (T3) — offered only by the item's `can.purge`, unlocked by typing the name, sent as a DELETE.
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { forgetAllResources } from '../../src/data/resource';
import { resetTrashFilter, trashResource } from '../../src/data/trash.api';
import { PurgeScreen } from '../../src/screens/trash/purge.screen';
import { TrashScreen } from '../../src/screens/trash/trash.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';
import { event, project, task, trashPage, trashQuery } from '../helpers/trash-fixtures';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  resetTrashFilter();
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

const showTrash = () => render(<TrashScreen />, { wrapper: Providers });
const showPurge = (key: string) => {
  setParams({ key });
  return render(<PurgeScreen />, { wrapper: Providers });
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const listCalls = (s: ReturnType<typeof serveAuth>) =>
  s.calls.filter((u) => u.includes('/api/app/trash?')).map(trashQuery);

describe('TrashScreen', () => {
  test('every card in the app words: kind, title, where / who / when, what went along, days left', async () => {
    serve({
      '/api/app/trash?': { body: trashPage([project(), task(), event({ deletedBy: null })]) },
    });
    await showTrash();
    const p = within(await screen.findByTestId('trash-project-p-sinar'));
    expect(p.getByText('Sinar Website')).toBeOnTheScreen();
    expect(p.getByText('Deleted by Nico Arya · Oct 6')).toBeOnTheScreen();
    expect(p.getByText('Includes 8 tasks and 2 events')).toBeOnTheScreen();
    expect(p.getByTestId('trash-left')).toHaveTextContent('Deleted for good in 12 days');
    const t = within(screen.getByTestId('trash-task-t-12'));
    expect(t.getByText('#12 Fix the login copy')).toBeOnTheScreen();
    expect(t.getByText('Atlas Project · Deleted by Nico Arya · Oct 6')).toBeOnTheScreen();
    const e = within(screen.getByTestId('trash-event-e-3'));
    expect(e.getByText('No project · Deleted · Oct 6')).toBeOnTheScreen();
    expect(screen.getByText('3 items')).toBeOnTheScreen();
    expect(button('All 3')).toBeSelected();
    // No `can.purge` key (not an Admin): no Delete forever at all.
    expect(screen.queryByRole('button', { name: /^Delete forever/ })).not.toBeOnTheScreen();
  });

  test('a kind chip asks the server for that kind; counts stay those of every kind', async () => {
    const s = serve({
      '/api/app/trash?': (url) =>
        trashQuery(url).kind === 'task'
          ? { body: trashPage([task()], { counts: { project: 1, task: 1, event: 0 } }) }
          : { body: trashPage([project(), task()]) },
    });
    await showTrash();
    await screen.findByTestId('trash-project-p-sinar');
    await fireEvent.press(button('Tasks 1'));
    expect(await screen.findByText('1 item')).toBeOnTheScreen();
    expect(screen.queryByTestId('trash-project-p-sinar')).not.toBeOnTheScreen();
    expect(button('Tasks 1')).toBeSelected();
    expect(button('All 2')).toBeOnTheScreen();
    expect(listCalls(s).map((q) => [q.kind, q.page, q.limit])).toEqual([
      ['all', '1', '25'],
      ['task', '1', '25'],
    ]);
  });

  test('Load more asks for the next page and appends it', async () => {
    const first = Array.from({ length: 25 }, (_, i) => task({ id: `t-${i}`, number: i }));
    const s = serve({
      '/api/app/trash?': (url) =>
        trashQuery(url).page === '2'
          ? { body: trashPage([task({ id: 't-99', number: 99 })], { total: 26, page: 2 }) }
          : { body: trashPage(first, { total: 26 }) },
    });
    await showTrash();
    await fireEvent.press(await screen.findByTestId('trash-more'));
    expect(await screen.findByTestId('trash-task-t-99')).toBeOnTheScreen();
    expect(screen.queryByTestId('trash-more')).not.toBeOnTheScreen();
    expect(listCalls(s).at(-1)).toMatchObject({ kind: 'all', page: '2', limit: '25' });
  });

  test('Restore posts to the item, says what came back and reads the Trash again', async () => {
    let restored = false;
    const s = serve({
      '/api/app/trash/project/p-sinar/restore': () => {
        restored = true;
        return { body: { id: 'p-sinar', tasks: 8 } };
      },
      '/api/app/trash?': () => ({ body: trashPage(restored ? [] : [project()]) }),
    });
    await showTrash();
    await fireEvent.press(await screen.findByRole('button', { name: 'Restore: Sinar Website' }));
    expect(await screen.findByText('Project restored with 8 tasks')).toBeOnTheScreen();
    expect(await screen.findByTestId('trash-empty')).toBeOnTheScreen();
    expect(s.calls.some((u) => u.endsWith('/api/app/trash/project/p-sinar/restore'))).toBe(true);
  });

  test('a refused Restore is disabled with the reason; a refusal from the server is its own sentence', async () => {
    serve({
      '/api/app/trash/task/t-12/restore': {
        status: 409,
        body: { error: 'Proyeknya masih di Sampah.', code: 'CONFLICT' },
      },
      '/api/app/trash?': {
        body: trashPage([task(), event({ can: { restore: 'EXPIRED' }, daysLeft: 0 })]),
      },
    });
    await showTrash();
    expect(await screen.findByRole('button', { name: 'Restore: Sprint review' })).toBeDisabled();
    expect(
      screen.getByText('Its time in the Trash is over, so it can no longer be restored.'),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('trash-event-e-3')).getByTestId('trash-left'),
    ).toHaveTextContent('Its time in the Trash is over');
    await fireEvent.press(button('Restore: #12 Fix the login copy'));
    expect(await screen.findByText('Proyeknya masih di Sampah.')).toBeOnTheScreen();
    expect(screen.getByTestId('trash-task-t-12')).toBeOnTheScreen();
  });

  test('Delete forever opens the sheet of that item', async () => {
    serve({
      '/api/app/trash?': { body: trashPage([task({ can: { restore: true, purge: true } })]) },
    });
    await showTrash();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Delete forever: #12 Fix the login copy' }),
    );
    expect(router.push).toHaveBeenCalledWith('/more/archive/task-t-12/delete');
  });

  test('empty: says so, without chips', async () => {
    serve({ '/api/app/trash?': { body: trashPage([]) } });
    await showTrash();
    expect(await screen.findByText('Trash is empty')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'All 0' })).not.toBeOnTheScreen();
  });

  test('failed: the reason from the server', async () => {
    serve({
      '/api/app/trash?': {
        status: 503,
        body: { error: 'Sedang pemeliharaan.', code: 'MAINTENANCE' },
      },
    });
    await showTrash();
    expect(await screen.findByTestId('trash-failed')).toBeOnTheScreen();
    expect(screen.getByText('Sedang pemeliharaan.')).toBeOnTheScreen();
  });
});

describe('PurgeScreen', () => {
  const purgeable = () => project({ can: { restore: true, purge: true } });

  test('T3: names what goes, unlocks once the name is typed, sends DELETE and closes', async () => {
    const s = serve({
      '/api/app/trash/project/p-sinar': (_url, init) =>
        init?.method === 'DELETE'
          ? {
              body: {
                kind: 'project',
                id: 'p-sinar',
                purged: { projects: 1, tasks: 8, events: 2 },
              },
            }
          : { status: 405, body: null },
      '/api/app/trash?': { body: trashPage([purgeable()]) },
    });
    await showPurge('project-p-sinar');
    expect(
      await screen.findByText(
        'Project “Sinar Website” with 8 tasks and 2 events will be gone for good. This cannot be undone.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('confirm-action')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('type-to-confirm'), 'Sinar');
    expect(screen.getByTestId('confirm-action')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('type-to-confirm'), 'Sinar Website');
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByText('Deleted forever')).toBeOnTheScreen();
    expect(router.back).toHaveBeenCalled();
    expect(s.calls.filter((u) => u.endsWith('/api/app/trash/project/p-sinar'))).toHaveLength(1);
  });

  test('a refused delete stays on the sheet with the reason', async () => {
    serve({
      '/api/app/trash/project/p-sinar': {
        status: 403,
        body: { error: 'Hanya Admin yang bisa menghapus permanen.', code: 'NOT_ADMIN' },
      },
      '/api/app/trash?': { body: trashPage([purgeable()]) },
    });
    await showPurge('project-p-sinar');
    await fireEvent.changeText(await screen.findByTestId('type-to-confirm'), 'Sinar Website');
    await fireEvent.press(screen.getByTestId('confirm-action'));
    expect(await screen.findByTestId('purge-error')).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  test('without can.purge, or for an item no longer there, only says so', async () => {
    serve({ '/api/app/trash?': { body: trashPage([project()]) } });
    await showPurge('project-p-sinar');
    await act(() => trashResource.ensure());
    expect(screen.getByText('This item is no longer in the Trash.')).toBeOnTheScreen();
    expect(screen.queryByTestId('type-to-confirm')).not.toBeOnTheScreen();
  });
});
