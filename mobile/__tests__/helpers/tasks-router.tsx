// The app's route tree with every Tasks route, for the Tasks screen tests; each screen gets the role under test.
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
import { forgetTaskResources } from '../../src/data/tasks.api';
import type { WireTaskDetail, WireTaskListItem } from '../../src/data/tasks.api.types';
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
import { ReturnScreen } from '../../src/screens/tasks/sheets/return.screen';
import { serveAuth } from './auth-server';
import { resetSessionForTest, seedSession } from './session-fixtures';
import { SAMPLE_ROWS } from './tasks-api-server';
import { type FakeTaskApi, fakeTaskApi } from './tasks-api-state';

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
    // Neither the list nor the board takes a role: what may be done is the server's answer.
    '(tabs)/tasks/index': TasksScreen,
    '(tabs)/tasks/filter': TasksFilterScreen,
    // The detail and the Cancel sheet take no role: what may be done to a task is the server's
    // answer now (can{}), not the screen's guess from who is signed in.
    '(tabs)/tasks/[id]/index': TaskDetailScreen,
    '(tabs)/tasks/[id]/edit': () => <TaskEditScreen role={role} />,
    '(tabs)/tasks/[id]/return': () => <ReturnScreen role={role} />,
    '(tabs)/tasks/[id]/cancel': CancelScreen,
    '(tabs)/tasks/[id]/reopen': ReopenScreen,
    'tasks/new/_layout': NewTaskStack,
    'tasks/new/index': TaskWriteScreen,
    'tasks/new/form': () => <TaskFormScreen role={role} />,
    'tasks/csv': CsvScreen,
  };
}

/**
 * The task API, stubbed for a screen test. The lists, the board and the detail all read
 * `/api/app/tasks` now, so a test that does not serve it sees the honest "couldn't load" state
 * instead of the screen it meant to look at.
 *
 * It remembers what was written to it (`tasks-api-state.ts`), because that is the only way a test
 * can tell a write that worked from one that silently did nothing. Rows are the fixture in
 * `tasks-api-server.ts`; a test that cares about other rows, or about a detail with steps on it,
 * installs its own with `serveTasks()`.
 */
let server: ReturnType<typeof serveAuth> | null = null;
let api: FakeTaskApi | null = null;

export function serveTasks(
  rows: readonly WireTaskListItem[] = SAMPLE_ROWS,
  details: Record<number, Partial<WireTaskDetail>> = {},
) {
  server?.restore();
  api = fakeTaskApi(rows, details);
  server = serveAuth(api.routes);
  return server;
}

/** The server's own state, for an assertion about what a write really left behind. */
export function taskApi(): FakeTaskApi {
  if (!api) throw new Error('No task API is being served: call serveTasks() first');
  return api;
}

/** Render the app at `url` as `role` (default: the session's Project Manager). */
export async function openTasks(url: string, role: Role = 'pm'): Promise<RenderRouterResult> {
  if (!server) serveTasks();
  const rendered = await renderRouter(routes(role), {
    initialUrl: url,
    wrapper: GluestackUIProvider,
  });
  // The list asks for its rows in a mount effect, so the render is not finished until that request
  // is: without this a test looks at the state the screen shows while a request is still out.
  await settleTasks();
  return rendered;
}

/** Let a request the screen just made settle; for a search or a filter applied mid-test. */
export const settleTasks = () => act(async () => {});

/** Every store a Tasks screen writes, back to the sample after each test. */
export function resetTaskStores() {
  beforeEach(() => {
    resetSessionForTest();
    seedSession();
    forgetAllResources();
    forgetTaskResources();
    serveTasks();
  });
  afterEach(async () => {
    await act(async () => {
      resetTasks();
      resetArchive();
      resetQueries();
      resetSnack();
    });
    server?.restore();
    server = null;
    api = null;
  });
}
