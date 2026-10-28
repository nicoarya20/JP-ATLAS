// The app's route tree with every Events route, for the Events screen tests. Every Events screen reads the server
// (answer it through `eventsServer().use`).
import { act } from '@testing-library/react-native';
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import HomeStack from '../../app/(tabs)/(home)/_layout';
import * as EventsStack from '../../app/(tabs)/events/_layout';
import * as ProjectsStack from '../../app/(tabs)/projects/_layout';
import * as TasksStack from '../../app/(tabs)/tasks/_layout';
import { resetSnack } from '../../src/components/snack/use-snack';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetEventsQuery } from '../../src/data/events.api';
import { forgetAllResources } from '../../src/data/resource';
import { EventDetailScreen } from '../../src/screens/events/detail/event-detail.screen';
import { EventsFilterScreen } from '../../src/screens/events/filter/events-filter.screen';
import { EventFormScreen } from '../../src/screens/events/form/event-form.screen';
import { EventsScreen } from '../../src/screens/events/list/events.screen';
import { CancelEventScreen } from '../../src/screens/events/sheets/cancel.screen';
import { type AuthRoutes, serveAuth } from './auth-server';
import { type Role, whoamiRoute } from './whoami-fixtures';

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
  '(tabs)/tasks/[no]': stub('screen-task'),
  '(tabs)/projects/_layout': ProjectsStack,
  '(tabs)/projects/index': stub('screen-projects'),
  '(tabs)/projects/[id]/index': stub('screen-project'),
  '(tabs)/events/_layout': EventsStack,
  '(tabs)/events/index': EventsScreen,
  '(tabs)/events/filter': EventsFilterScreen,
  '(tabs)/events/[id]/index': EventDetailScreen,
  '(tabs)/events/[id]/cancel': CancelEventScreen,
  'events/new': EventFormScreen,
};

/** Render the app at `url`. */
export const openEvents = (url: string): Promise<RenderRouterResult> =>
  renderRouter(ROUTES, { initialUrl: url, wrapper: GluestackUIProvider });

/** What every Events screen reads around it: who is signed in (the tab bar's "+") and the Inbox count. */
const AROUND = (role: Role): AuthRoutes => ({
  ...whoamiRoute(role),
  '/api/app/inbox/count': { body: { action: 0, infoUnread: 0 } },
});

/**
 * A stubbed server per test, and every store an Events screen writes back to its start after each test. `use(routes,
 * role)` answers `routes` first (more specific paths go first: a stub matches any URL containing it), then whoami as
 * `role` and the Inbox count; nothing else leaves jest.
 */
export function eventsServer() {
  let server: ReturnType<typeof serveAuth> | null = null;
  beforeEach(() => {
    forgetAllResources();
    server = serveAuth(AROUND('pm'));
  });
  afterEach(async () => {
    server?.restore();
    server = null;
    await act(async () => {
      resetEventsQuery();
      resetSnack();
    });
  });
  return {
    use: (answers: AuthRoutes, role: Role = 'pm') => {
      const around = Object.entries(AROUND(role)).filter(([k]) => !(k in answers));
      server?.use({ ...answers, ...Object.fromEntries(around) });
    },
    /** Every URL asked so far. */
    calls: () => server?.calls ?? [],
  };
}
