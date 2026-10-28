// The app's route tree with every Tasks route, for the Tasks screen tests. The Tasks tab, the task detail and its sheets
// read the stubbed server (tasks-fixtures); so do New task · Fill form and Edit task.
import { act } from '@testing-library/react-native';
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import HomeStack from '../../app/(tabs)/(home)/_layout';
import * as TasksStack from '../../app/(tabs)/tasks/_layout';
import NewTaskStack from '../../app/tasks/new/_layout';
import { resetSnack } from '../../src/components/snack/use-snack';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { forgetAllResources } from '../../src/data/resource';
import { resetTaskLists } from '../../src/data/tasks.api';
import { resetTaskDetails } from '../../src/data/tasks.detail.api';
import { resetTaskForms } from '../../src/data/tasks.form.api';
import { resetQueries } from '../../src/data/tasks.query-state';
import { TaskDetailScreen } from '../../src/screens/tasks/detail/task-detail.screen';
import { TaskEditScreen } from '../../src/screens/tasks/edit/task-edit.screen';
import { TasksFilterScreen } from '../../src/screens/tasks/filter/tasks-filter.screen';
import { TasksScreen } from '../../src/screens/tasks/list/tasks.screen';
import { TaskFormScreen } from '../../src/screens/tasks/new/form.screen';
import { TaskWriteScreen } from '../../src/screens/tasks/new/write.screen';
import { CancelScreen } from '../../src/screens/tasks/sheets/cancel.screen';
import { ReopenScreen } from '../../src/screens/tasks/sheets/reopen.screen';

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
  '(tabs)/tasks/index': TasksScreen,
  '(tabs)/tasks/filter': TasksFilterScreen,
  '(tabs)/tasks/[id]/index': TaskDetailScreen,
  '(tabs)/tasks/[id]/edit': TaskEditScreen,
  '(tabs)/tasks/[id]/reopen': ReopenScreen,
  '(tabs)/tasks/[id]/cancel': CancelScreen,
  'tasks/new/_layout': NewTaskStack,
  'tasks/new/index': TaskWriteScreen,
  'tasks/new/form': TaskFormScreen,
};

/** Render the app at `url`. */
export const openTasks = (url: string): Promise<RenderRouterResult> =>
  renderRouter(ROUTES, { initialUrl: url, wrapper: GluestackUIProvider });

/** Every cache and query a Tasks screen keeps, emptied after each test. */
export function resetTaskStores() {
  afterEach(async () => {
    await act(async () => {
      resetQueries();
      resetTaskLists();
      resetTaskDetails();
      resetTaskForms();
      forgetAllResources();
      resetSnack();
    });
  });
}
