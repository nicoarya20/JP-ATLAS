// The app's route tree with every Tasks route, for the Tasks screen tests. The Tasks tab, the task detail and its sheets
// read the stubbed server (tasks-fixtures); the screens not yet on the API get the role under test.
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
import { resetArchive } from '../../src/data/archive.store';
import { forgetAllResources } from '../../src/data/resource';
import type { Role } from '../../src/data/sample';
import { resetTaskLists } from '../../src/data/tasks.api';
import { resetTaskDetails } from '../../src/data/tasks.detail.api';
import { resetQueries } from '../../src/data/tasks.query-state';
import { resetTasks } from '../../src/data/tasks.store';
import { CsvScreen } from '../../src/screens/tasks/csv/csv.screen';
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

function routes(role: Role) {
  return {
    _layout: RootLayout,
    '(tabs)/_layout': TabsLayout,
    '(tabs)/(home)/_layout': HomeStack,
    '(tabs)/(home)/index': stub('screen-home'),
    '(tabs)/tasks/_layout': TasksStack,
    '(tabs)/tasks/index': TasksScreen,
    '(tabs)/tasks/filter': TasksFilterScreen,
    '(tabs)/tasks/[id]/index': TaskDetailScreen,
    '(tabs)/tasks/[id]/edit': () => <TaskEditScreen role={role} />,
    '(tabs)/tasks/[id]/reopen': ReopenScreen,
    '(tabs)/tasks/[id]/cancel': CancelScreen,
    'tasks/new/_layout': NewTaskStack,
    'tasks/new/index': TaskWriteScreen,
    'tasks/new/form': () => <TaskFormScreen role={role} />,
    'tasks/csv': CsvScreen,
  };
}

/** Render the app at `url` as `role` (default: the session's Project Manager). */
export const openTasks = (url: string, role: Role = 'pm'): Promise<RenderRouterResult> =>
  renderRouter(routes(role), { initialUrl: url, wrapper: GluestackUIProvider });

/** Every store a Tasks screen writes, back to the sample after each test. */
export function resetTaskStores() {
  afterEach(async () => {
    await act(async () => {
      resetTasks();
      resetArchive();
      resetQueries();
      resetTaskLists();
      resetTaskDetails();
      forgetAllResources();
      resetSnack();
    });
  });
}
