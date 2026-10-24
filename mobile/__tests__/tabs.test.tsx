import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { type RenderRouterResult, testRouter } from 'expo-router/testing-library';

import { resetSnack, showSnack } from '../src/components/snack/use-snack';
import { openApp as open } from './helpers/app-router';

type NavState = { routes: { name: string; state?: NavState }[] };
/** Screens in the Tasks tab's stack (router state: root → (tabs) → tasks). */
function tasksStackDepth(view: RenderRouterResult) {
  const find = (state: NavState | undefined, name: string) =>
    state?.routes.find((r) => r.name === name)?.state;
  const root = view.getRouterState() as NavState | undefined;
  const tabs = find(find(root, '__root'), '(tabs)');
  return find(tabs, 'tasks')?.routes.length;
}

const tab = (name: string) => screen.getByRole('tab', { name });
/** Pick a tab the way a screen reader does; touches and drags are covered in navigation/tab-bar.bubble.test.tsx. */
const pick = (name: string) =>
  fireEvent(tab(name), 'accessibilityAction', {
    nativeEvent: { actionName: 'activate' },
  });
// The pill is a tablist container but not an accessibility element itself, so it is found by testID.
const bar = () => screen.queryByTestId('tab-bar');

describe('tab bar', () => {
  it('names the five prototype tabs in order and selects Home at /', async () => {
    await open('/');

    expect(bar()).toBeOnTheScreen();
    expect(bar()).toHaveAccessibleName('App navigation');
    expect(bar()?.props.accessibilityRole).toBe('tablist');
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual([
      'Home',
      'Tasks',
      'Projects',
      'Events',
      'More',
    ]);
    expect(tab('Home')).toBeSelected();
    expect(tab('Tasks')).not.toBeSelected();
  });

  // Each tab screen carries testID `screen-<tab>`, so the check does not depend on its copy.
  it.each([
    ['/', 'Home', 'screen-home'],
    ['/tasks', 'Tasks', 'screen-tasks'],
    ['/projects', 'Projects', 'screen-projects'],
    ['/events', 'Events', 'screen-events'],
  ])('%s selects %s and renders %s', async (path, name, testID) => {
    await open(path);

    expect(screen).toHavePathname(path);
    expect(tab(name)).toBeSelected();
    expect(screen.getByTestId(testID)).toBeOnTheScreen();
  });

  it('switches screens from a tab', async () => {
    await open('/');

    await pick('Tasks');

    expect(screen).toHavePathname('/tasks');
    expect(tab('Tasks')).toBeSelected();
    expect(screen.getByTestId('screen-tasks')).toBeOnTheScreen();
  });

  it('does not navigate from More (its panel arrives in F1d)', async () => {
    await open('/projects');

    await pick('More');

    expect(screen).toHavePathname('/projects');
    expect(tab('Projects')).toBeSelected();
  });

  it('sends a link to /more home, since More has no screen of its own', async () => {
    await open('/more');

    expect(screen).toHavePathname('/');
    expect(tab('Home')).toBeSelected();
  });

  it('selects More on the screens the More panel opens', async () => {
    await open('/more/inbox');

    expect(screen.getByTestId('screen-inbox')).toBeOnTheScreen();
    expect(tab('More')).toBeSelected();
  });

  it('pops a tab back to its root when another tab is picked', async () => {
    const view = await open('/tasks/12');
    expect(screen.getByTestId('screen-task')).toBeOnTheScreen();

    // The bar is hidden on a task, so leave by a link (as a Home row would), then come back from the bar.
    await act(() => router.navigate('/'));
    expect(screen).toHavePathname('/');
    // The tab view pops the tab it left once its switch transition ends (a frame later).
    await waitFor(() => expect(tasksStackDepth(view)).toBe(1));
    await pick('Tasks');

    expect(screen).toHavePathname('/tasks');
    expect(screen.getByTestId('screen-tasks')).toBeOnTheScreen();
  });
});

describe('tab stacks', () => {
  it('puts the task list under a task opened by a link, so back lands on it', async () => {
    await open('/tasks/12');

    await act(() => router.back());

    expect(screen).toHavePathname('/tasks');
    expect(screen.getByTestId('screen-tasks')).toBeOnTheScreen();
  });
});

describe('tab bar visibility (docs/phase1-navigation.md §2.6)', () => {
  it.each(['/tasks/12', '/more/settings'])('hides the bar on %s', async (path) => {
    await open(path);

    expect(screen).toHavePathname(path);
    expect(bar()).not.toBeOnTheScreen();
  });

  it('keeps the bar on a project, which shows its tab', async () => {
    await open('/projects/3');

    expect(screen.getByTestId('screen-project')).toBeOnTheScreen();
    expect(tab('Projects')).toBeSelected();
  });

  it('keeps the bar under a root sheet opened over a tab screen', async () => {
    await open('/');

    await pick('Events');
    await testRouter.push('/create');

    expect(await screen.findByTestId('screen-create')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Events', hidden: true })).toBeSelected();
  });
});

describe('snack host', () => {
  afterEach(() => act(() => resetSnack()));

  it('draws a snack over any tab screen, from the one host the tabs mount', async () => {
    await open('/projects');

    await act(() => showSnack({ message: 'Project archived' }));

    expect(screen.getByTestId('snack')).toHaveTextContent('Project archived');
    expect(tab('Projects')).toBeSelected();
  });
});
