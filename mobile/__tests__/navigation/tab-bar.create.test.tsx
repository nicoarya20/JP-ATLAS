// Port of the "+" parts of the prototype's src/test/tabbar.test.jsx and of home.create.test.jsx (docs/phase1-navigation.md
// §2.4, §2.7): what the "+" creates per tab from the server's caps (`GET /api/app/whoami`, stubbed per role), its fold,
// and the Create sheet. expo-router's testing library swaps Reanimated for its mock, so the fold's motion is tested on
// the component alone (create-fab.test.tsx).
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { forgetAllResources } from '../../src/data/resource';
import type { Role } from '../../src/data/sample/people';
import { CREATE_ROUTES, type CreateGo, createHref } from '../../src/navigation/create-href';
import { openApp } from '../helpers/app-router';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { sheetGone } from '../helpers/sheet-gone';
import { whoamiRoute } from '../helpers/whoami-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  forgetAllResources();
});
afterEach(() => {
  server?.restore();
  server = null;
});

/** The app at `path` for `role`'s caps; `routes` answers whatever else the screen asks (the More badge). */
async function open(path: string, role: Role = 'pm', routes: AuthRoutes = {}) {
  server = serveAuth({
    ...whoamiRoute(role),
    '/api/app/inbox/count': { body: { action: 0, infoUnread: 0 } },
    ...routes,
  });
  return openApp(path);
}

// Folded, the "+" is hidden from screen readers, which queries skip by default.
const fab = () => screen.getByTestId('create-fab', { includeHiddenElements: true });
const pickTab = (name: string) =>
  fireEvent(screen.getByRole('tab', { name }), 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
  });

async function openCreate(role: Role) {
  await open('/', role);
  await fireEvent.press(await screen.findByRole('button', { name: 'Create' }));
  expect(screen).toHavePathname('/create');
  return screen.getByTestId('screen-create');
}

describe('the "+" beside the tab bar', () => {
  it.each([
    ['/tasks', 'member', 'New task', '/tasks/new', 'screen-task-new'],
    ['/projects', 'pm', 'New project', '/projects/new', 'screen-project-new'],
    ['/events', 'member', 'New event', '/events/new', 'screen-event-new'],
  ] as const)('on %s (%s) is %s and opens %s', async (path, role, label, to, testID) => {
    await open(path, role);

    // only the "+" carries the name (no second button in the screen header)
    expect(await screen.findAllByRole('button', { name: label })).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: label }));

    expect(screen).toHavePathname(to);
    expect(await screen.findByTestId(testID)).toBeOnTheScreen();
  });

  it.each(['/', '/more/inbox'])(
    'opens the Create sheet on %s, whose tab has no "new"',
    async (path) => {
      await open(path);

      await fireEvent.press(await screen.findByRole('button', { name: 'Create' }));

      expect(screen).toHavePathname('/create');
      expect(screen.getByTestId('screen-create')).toBeOnTheScreen();
    },
  );

  it('stays folded until the caps are in, and when they fail', async () => {
    await open('/tasks', 'pm', {
      '/api/app/whoami': { status: 503, body: { error: 'Sedang pemeliharaan.' } },
    });
    await waitFor(() =>
      expect(server?.calls.some((u) => u.includes('/api/app/whoami'))).toBe(true),
    );
    expect(fab()).toHaveProp('accessibilityElementsHidden', true);
    expect(screen.queryByRole('button', { name: /^(Create|New task)$/ })).not.toBeOnTheScreen();
  });

  it('folds away for a Member on Projects and comes back on Tasks', async () => {
    await open('/projects', 'member');
    await screen.findByTestId('create-fab', { includeHiddenElements: true });
    await waitFor(() =>
      expect(server?.calls.some((u) => u.includes('/api/app/whoami'))).toBe(true),
    );

    // folded: out of touch and out of the screen reader's reach
    expect(fab()).toHaveProp('accessibilityElementsHidden', true);
    expect(fab()).toHaveProp('pointerEvents', 'none');
    expect(screen.queryByRole('button', { name: /^(Create|New project)$/ })).not.toBeOnTheScreen();

    await pickTab('Tasks');

    expect(screen.getByRole('button', { name: 'New task' })).toBeOnTheScreen();
    expect(fab()).toHaveProp('accessibilityElementsHidden', false);
    expect(fab()).toHaveProp('pointerEvents', 'auto');
  });

  it('stays the same element while it folds, so it can unfold instead of popping in', async () => {
    await open('/tasks', 'member');
    await screen.findByRole('button', { name: 'New task' });
    const first = fab();

    await pickTab('Projects');
    expect(fab()).toHaveProp('accessibilityElementsHidden', true);
    await pickTab('Events');

    expect(fab()).toBe(first);
  });
});

describe('Create sheet', () => {
  it('lets a Manager pick task, project or event; import stays hidden (no server route)', async () => {
    const sheet = await openCreate('pm');

    for (const name of ['Task', 'Project', 'Event']) {
      expect(within(sheet).getByText(name)).toBeOnTheScreen();
    }
    expect(within(sheet).queryByText('Import tasks')).not.toBeOnTheScreen();
    expect(within(sheet).queryByText(/leave/i)).not.toBeOnTheScreen();
    expect(within(sheet).getByRole('header')).toHaveTextContent('Create');
    expect(within(sheet).getByText('What do you want to add?')).toBeOnTheScreen();
  });

  it('leaves Project out when the caps say so (a Member)', async () => {
    const sheet = await openCreate('member');

    expect(within(sheet).getByText('Task')).toBeOnTheScreen();
    expect(within(sheet).queryByText('Project')).not.toBeOnTheScreen();
  });

  it('offers no leave to an Admin either', async () => {
    const sheet = await openCreate('admin');

    expect(within(sheet).queryByText(/leave/i)).not.toBeOnTheScreen();
  });

  it('closes with the X', async () => {
    const sheet = await openCreate('pm');

    await fireEvent.press(within(sheet).getByRole('button', { name: 'Close' }));

    await sheetGone('screen-create');
    expect(screen).toHavePathname('/');
  });

  it('swaps itself for the picked screen, so leaving that screen lands back where "+" was', async () => {
    const sheet = await openCreate('pm');

    await fireEvent.press(within(sheet).getByRole('button', { name: 'Event' }));
    await sheetGone('screen-create');
    expect(screen).toHavePathname('/events/new');

    await act(() => router.back());
    expect(screen).toHavePathname('/');
  });
});

describe('create routes', () => {
  it.each(Object.entries(CREATE_ROUTES) as [CreateGo, string][])(
    '%s opens %s, a route the root stack registers',
    async (go, path) => {
      await open('/');

      await act(() => router.push(createHref(go)));

      expect(screen).toHavePathname(path);
    },
  );
});
