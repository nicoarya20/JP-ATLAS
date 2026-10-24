// The app's route tree for router tests (tab bar, Create, More), rendered with expo-router's renderRouter.
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import HomeStack from '../../app/(tabs)/(home)/_layout';
import HomeRoute from '../../app/(tabs)/(home)/index';
import * as EventsStack from '../../app/(tabs)/events/_layout';
import EventsRoute from '../../app/(tabs)/events/index';
import MoreStack from '../../app/(tabs)/more/_layout';
import MoreIndex from '../../app/(tabs)/more/index';
import * as ProjectsStack from '../../app/(tabs)/projects/_layout';
import ProjectsRoute from '../../app/(tabs)/projects/index';
import * as TasksStack from '../../app/(tabs)/tasks/_layout';
import TasksRoute from '../../app/(tabs)/tasks/index';
import CreateRoute from '../../app/create';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

// The root layout waits for Manrope; jest has no font assets, so report it loaded.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

/** Stand-in for a screen a module worker ports later: only its place in the route tree matters here. */
const stub = (testID: string) => () => <Text testID={testID}>{testID}</Text>;

// Layouts go in as whole modules so their `unstable_settings` (anchor) apply, as in the app.
const ROUTES = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/(home)/_layout': HomeStack,
  '(tabs)/(home)/index': HomeRoute,
  '(tabs)/tasks/_layout': TasksStack,
  '(tabs)/tasks/index': TasksRoute,
  '(tabs)/tasks/[id]/index': stub('screen-task'),
  '(tabs)/projects/_layout': ProjectsStack,
  '(tabs)/projects/index': ProjectsRoute,
  '(tabs)/projects/[id]/index': stub('screen-project'),
  '(tabs)/events/_layout': EventsStack,
  '(tabs)/events/index': EventsRoute,
  '(tabs)/more/_layout': MoreStack,
  '(tabs)/more/index': MoreIndex,
  '(tabs)/more/inbox': stub('screen-inbox'),
  '(tabs)/more/team': stub('screen-team'),
  '(tabs)/more/users': stub('screen-users'),
  '(tabs)/more/archive': stub('screen-archive'),
  '(tabs)/more/settings/index': stub('screen-settings'),
  create: CreateRoute,
  'tasks/new': stub('screen-task-new'),
  'tasks/csv': stub('screen-task-csv'),
  'projects/new': stub('screen-project-new'),
  'events/new': stub('screen-event-new'),
  leave: stub('screen-leave'),
  profile: stub('screen-profile'),
};

/** Render the app at `initialUrl`. */
export const openApp = (initialUrl: string): Promise<RenderRouterResult> =>
  renderRouter(ROUTES, { initialUrl, wrapper: GluestackUIProvider });
