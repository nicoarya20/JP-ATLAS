import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import TabsLayout from '../app/(tabs)/_layout';
import EventsRoute from '../app/(tabs)/events';
import HomeRoute from '../app/(tabs)/index';
import MoreRoute from '../app/(tabs)/more';
import ProjectsRoute from '../app/(tabs)/projects';
import TasksRoute from '../app/(tabs)/tasks';
import { GluestackUIProvider } from '../src/components/ui/gluestack-ui-provider';

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeRoute,
  '(tabs)/tasks': TasksRoute,
  '(tabs)/projects': ProjectsRoute,
  '(tabs)/events': EventsRoute,
  '(tabs)/more': MoreRoute,
};

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };

/** Native tab host and its tab screens from the rendered tree (all tabs stay mounted; the host picks one). */
function tabHost() {
  const find = (node: Node | string | null, type: string): Node[] => {
    if (!node || typeof node === 'string') return [];
    if (node.type === type) return [node];
    return (node.children ?? []).flatMap((child) => find(child, type));
  };
  const tree = screen.toJSON() as Node;
  const [host] = find(tree, 'RNSTabsHostIOS');
  return { host, tabs: find(host, 'RNSTabsScreenIOS') };
}

/** screenKey of the tab screen that contains `element`. */
function tabKeyOf(element: { parent: unknown }) {
  let node = element as { type?: unknown; props?: { screenKey?: string }; parent: unknown } | null;
  while (node && node.type !== 'RNSTabsScreenIOS') node = node.parent as typeof node;
  return node?.props?.screenKey;
}

describe('tab routes', () => {
  it('shows the prototype tab bar: Home, Tasks, Projects, Events, More', async () => {
    await renderRouter(routes, { initialUrl: '/', wrapper: GluestackUIProvider });

    const { tabs } = tabHost();
    expect(tabs.map((t) => t.props.title)).toEqual(['Home', 'Tasks', 'Projects', 'Events', 'More']);
    expect(tabs.map((t) => t.props.iconResourceName)).toEqual([
      'house',
      'checkmark.circle',
      'folder',
      'calendar',
      'ellipsis',
    ]);
  });

  it.each([
    ['/', 'index', 'Good morning, Nico'], // Home's header is the greeting (prototype), not the tab name
    ['/tasks', 'tasks', 'Tasks'],
    ['/projects', 'projects', 'Projects'],
    ['/events', 'events', 'Events'],
    ['/more', 'more', 'More'],
  ])('%s selects the %s tab and renders its %s screen', async (path, key, title) => {
    await renderRouter(routes, { initialUrl: path, wrapper: GluestackUIProvider });

    expect(screen).toHavePathname(path);
    expect(tabHost().host.props.navStateRequest).toMatchObject({ selectedScreenKey: key });
    expect(tabKeyOf(screen.getByRole('header', { name: title }))).toBe(key);
  });
});
