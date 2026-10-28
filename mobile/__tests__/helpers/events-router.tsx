// The app's route tree with every Events route, for the Events screen tests; each screen gets the role under test.
import { act } from '@testing-library/react-native';
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import HomeStack from '../../app/(tabs)/(home)/_layout';
import * as EventsStack from '../../app/(tabs)/events/_layout';
import * as TasksStack from '../../app/(tabs)/tasks/_layout';
import { resetSnack } from '../../src/components/snack/use-snack';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetArchive } from '../../src/data/archive.store';
import { resetEvents } from '../../src/data/events.store';
import { forgetAllResources } from '../../src/data/resource';
import type { Role } from '../../src/data/sample';
import { resetTasks } from '../../src/data/tasks.store';
import { EventDetailScreen } from '../../src/screens/events/detail/event-detail.screen';
import { EventsFilterScreen } from '../../src/screens/events/filter/events-filter.screen';
import { EventFormScreen } from '../../src/screens/events/form/event-form.screen';
import { EventsScreen } from '../../src/screens/events/list/events.screen';
import { OutcomesScreen } from '../../src/screens/events/outcomes/outcomes.screen';
import { RecordReadyScreen } from '../../src/screens/events/record/record-ready.screen';
import { RecordingScreen } from '../../src/screens/events/record/recording.screen';
import { EventResultsScreen } from '../../src/screens/events/results/results.screen';
import { ArchiveEventScreen } from '../../src/screens/events/sheets/archive.screen';
import { CancelEventScreen } from '../../src/screens/events/sheets/cancel.screen';
import { serveAuth } from './auth-server';
import { whoamiRoute } from './whoami-fixtures';

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
    '(tabs)/tasks/index': stub('screen-tasks'),
    '(tabs)/tasks/[no]': stub('screen-task'),
    '(tabs)/events/_layout': EventsStack,
    '(tabs)/events/index': () => <EventsScreen role={role} />,
    '(tabs)/events/filter': EventsFilterScreen,
    '(tabs)/events/[id]/index': () => <EventDetailScreen role={role} />,
    '(tabs)/events/[id]/results': EventResultsScreen,
    '(tabs)/events/[id]/record': RecordReadyScreen,
    '(tabs)/events/[id]/recording': RecordingScreen,
    '(tabs)/events/[id]/outcomes/[step]': () => <OutcomesScreen role={role} />,
    '(tabs)/events/[id]/cancel': () => <CancelEventScreen role={role} />,
    '(tabs)/events/[id]/archive': () => <ArchiveEventScreen role={role} />,
    'events/new': () => <EventFormScreen role={role} />,
  };
}

/** Render the app at `url` as `role` (default: the session's Project Manager). */
export const openEvents = (url: string, role: Role = 'pm'): Promise<RenderRouterResult> =>
  renderRouter(routes(role), { initialUrl: url, wrapper: GluestackUIProvider });

/**
 * Every store an Events screen writes, back to the sample after each test. The tab bar reads whoami and the Inbox
 * count on mount; they are answered here, so no read leaves jest.
 */
export function resetEventStores() {
  let server: ReturnType<typeof serveAuth> | null = null;
  beforeEach(() => {
    forgetAllResources();
    server = serveAuth({
      ...whoamiRoute('pm'),
      '/api/app/inbox/count': { body: { action: 0, infoUnread: 0 } },
    });
  });
  afterEach(async () => {
    server?.restore();
    server = null;
    await act(async () => {
      resetEvents();
      resetTasks();
      resetArchive();
      resetSnack();
    });
  });
}
