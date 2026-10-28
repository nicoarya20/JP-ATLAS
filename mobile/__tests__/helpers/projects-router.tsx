// The app's route tree with every Projects route, for the Projects screen tests. The list, the detail and the write
// screens read the server (stub it with serveAuth).
import { act } from '@testing-library/react-native';
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import HomeStack from '../../app/(tabs)/(home)/_layout';
import * as ProjectsStack from '../../app/(tabs)/projects/_layout';
import * as TasksStack from '../../app/(tabs)/tasks/_layout';
import NewTaskStack from '../../app/tasks/new/_layout';
import { resetSnack } from '../../src/components/snack/use-snack';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetQueries } from '../../src/data/tasks.query-state';
import { ProjectDetailScreen } from '../../src/screens/projects/detail/project-detail.screen';
import { ProjectEditScreen } from '../../src/screens/projects/edit/project-edit.screen';
import { ProjectsFilterScreen } from '../../src/screens/projects/filter/projects-filter.screen';
import { ProjectsScreen } from '../../src/screens/projects/list/projects.screen';
import { ProjectFormScreen } from '../../src/screens/projects/new/form.screen';
import { ProjectTaskFilterScreen } from '../../src/screens/projects/settings/project-tasks-routes';
import { ArchiveProjectScreen } from '../../src/screens/projects/sheets/archive.screen';
import { ExtendProjectScreen } from '../../src/screens/projects/sheets/extend.screen';

// The root layout waits for Manrope; jest has no font assets, so report it loaded.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

/** Stand-in for a screen another module ports: only its place in the route tree matters here. */
const stub = (testID: string) => () => <Text testID={testID}>{testID}</Text>;

const ROUTES = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/(home)/_layout': HomeStack,
  '(tabs)/(home)/index': stub('screen-home'),
  '(tabs)/tasks/_layout': TasksStack,
  '(tabs)/tasks/index': stub('screen-tasks'),
  '(tabs)/tasks/[id]/index': stub('screen-task'),
  'tasks/new/_layout': NewTaskStack,
  'tasks/new/form': stub('screen-task-form'),
  '(tabs)/projects/_layout': ProjectsStack,
  '(tabs)/projects/index': ProjectsScreen,
  '(tabs)/projects/filter': ProjectsFilterScreen,
  '(tabs)/projects/[id]/index': ProjectDetailScreen,
  '(tabs)/projects/[id]/edit': ProjectEditScreen,
  '(tabs)/projects/[id]/extend': ExtendProjectScreen,
  '(tabs)/projects/[id]/archive': ArchiveProjectScreen,
  '(tabs)/projects/[id]/task-filter': ProjectTaskFilterScreen,
  'projects/new': ProjectFormScreen,
};

/** Render the app at `url`. */
export const openProjects = (url: string): Promise<RenderRouterResult> =>
  renderRouter(ROUTES, { initialUrl: url, wrapper: GluestackUIProvider });

/** Every cache and query a Projects screen keeps, emptied after each test. */
export function resetProjectStores() {
  afterEach(async () => {
    await act(async () => {
      resetQueries();
      resetSnack();
    });
  });
}
