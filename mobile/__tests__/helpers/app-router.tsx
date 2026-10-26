// The app's route tree for router tests (tab bar, Create, More), rendered with expo-router's renderRouter.
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import AuthStack from '../../app/(auth)/_layout';
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
import ProfileStack from '../../app/profile/_layout';
import NewTaskStack from '../../app/tasks/new/_layout';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';

// The root layout waits for Manrope; jest has no font assets, so report it loaded.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

/** Stand-in for a screen a module worker ports later: only its place in the route tree matters here. */
const stub = (testID: string) => () => <Text testID={testID}>{testID}</Text>;

// Layouts go in as whole modules so their `unstable_settings` (anchor) apply, as in the app. Every route a layout
// registers is listed (a stub where the screen is not under test), so expo-router warns of no missing route.
const ROUTES = {
  _layout: RootLayout,
  '(auth)/_layout': AuthStack,
  '(auth)/login': stub('screen-login'),
  '(auth)/account': stub('screen-account'),
  '(auth)/pending': stub('screen-pending'),
  '(auth)/denied': stub('screen-denied'),
  '(tabs)/_layout': TabsLayout,
  '(tabs)/(home)/_layout': HomeStack,
  '(tabs)/(home)/index': HomeRoute,
  '(tabs)/tasks/_layout': TasksStack,
  '(tabs)/tasks/index': TasksRoute,
  '(tabs)/tasks/filter': stub('screen-tasks-filter'),
  '(tabs)/tasks/[id]/index': stub('screen-task'),
  '(tabs)/tasks/[id]/edit': stub('screen-task-edit'),
  '(tabs)/tasks/[id]/return': stub('screen-task-return'),
  '(tabs)/tasks/[id]/cancel': stub('screen-task-cancel'),
  '(tabs)/projects/_layout': ProjectsStack,
  '(tabs)/projects/index': ProjectsRoute,
  '(tabs)/projects/filter': stub('screen-projects-filter'),
  '(tabs)/projects/[id]/index': stub('screen-project'),
  '(tabs)/projects/[id]/edit': stub('screen-project-edit'),
  '(tabs)/projects/[id]/settings': stub('screen-project-settings'),
  '(tabs)/projects/[id]/extend': stub('screen-project-extend'),
  '(tabs)/projects/[id]/archive': stub('screen-project-archive'),
  '(tabs)/projects/[id]/task-filter': stub('screen-project-task-filter'),
  '(tabs)/events/_layout': EventsStack,
  '(tabs)/events/index': EventsRoute,
  '(tabs)/events/filter': stub('screen-events-filter'),
  '(tabs)/events/[id]/index': stub('screen-event'),
  '(tabs)/events/[id]/results': stub('screen-event-results'),
  '(tabs)/events/[id]/record': stub('screen-event-record'),
  '(tabs)/events/[id]/recording': stub('screen-event-recording'),
  '(tabs)/events/[id]/outcomes/[step]': stub('screen-event-outcomes'),
  '(tabs)/events/[id]/cancel': stub('screen-event-cancel'),
  '(tabs)/events/[id]/archive': stub('screen-event-archive'),
  '(tabs)/more/_layout': MoreStack,
  '(tabs)/more/index': MoreIndex,
  '(tabs)/more/inbox': stub('screen-inbox'),
  '(tabs)/more/team/index': stub('screen-team'),
  '(tabs)/more/team/[id]': stub('screen-person'),
  '(tabs)/more/users': stub('screen-users'),
  '(tabs)/more/archive/index': stub('screen-archive'),
  '(tabs)/more/archive/[key]/delete': stub('screen-archive-delete'),
  '(tabs)/more/settings/index': stub('screen-settings'),
  '(tabs)/more/settings/profile': stub('screen-settings-profile'),
  create: CreateRoute,
  'tasks/new/_layout': NewTaskStack,
  'tasks/new/index': stub('screen-task-new'),
  'tasks/new/form': stub('screen-task-form'),
  'tasks/csv': stub('screen-task-csv'),
  'projects/new': stub('screen-project-new'),
  'events/new': stub('screen-event-new'),
  leave: stub('screen-leave'),
  'profile/_layout': ProfileStack,
  'profile/index': stub('screen-profile'),
  'profile/calendar': stub('screen-calendar'),
};

/** Render the app at `initialUrl`. */
export const openApp = (initialUrl: string): Promise<RenderRouterResult> =>
  renderRouter(ROUTES, { initialUrl, wrapper: GluestackUIProvider });
