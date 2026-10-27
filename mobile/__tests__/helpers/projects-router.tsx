// The app's route tree with every Projects route, for the Projects screen tests.
//
// `role` reaches only the screens still on sample data. The list and the detail take no role any
// more: what they offer comes from the server (`caps` and the project's own `can{}`), so a test
// about what a Member may do seeds the session and stubs those answers instead of passing a word.
import { act } from '@testing-library/react-native';
import { type RenderRouterResult, renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import HomeStack from '../../app/(tabs)/(home)/_layout';
import * as ProjectsStack from '../../app/(tabs)/projects/_layout';
import * as TasksStack from '../../app/(tabs)/tasks/_layout';
import NewProjectStack from '../../app/projects/new/_layout';
import NewTaskStack from '../../app/tasks/new/_layout';
import { resetSnack } from '../../src/components/snack/use-snack';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { resetArchive } from '../../src/data/archive.store';
import { resetProjects } from '../../src/data/projects.store';
import type { Role } from '../../src/data/sample';
import { resetQueries } from '../../src/data/tasks.query-state';
import { resetTasks } from '../../src/data/tasks.store';
import { ProjectDetailScreen } from '../../src/screens/projects/detail/project-detail.screen';
import { ProjectEditScreen } from '../../src/screens/projects/edit/project-edit.screen';
import { ProjectsFilterScreen } from '../../src/screens/projects/filter/projects-filter.screen';
import { ProjectsScreen } from '../../src/screens/projects/list/projects.screen';
import { ProjectDraftScreen } from '../../src/screens/projects/new/draft.screen';
import { ProjectFormScreen } from '../../src/screens/projects/new/form.screen';
import { NewProjectScreen } from '../../src/screens/projects/new/new.screen';
import { ProjectStoryScreen } from '../../src/screens/projects/new/story.screen';
import { ProjectTemplateScreen } from '../../src/screens/projects/new/template.screen';
import {
  ProjectSettingsScreen,
  ProjectTaskFilterScreen,
} from '../../src/screens/projects/settings/project-tasks-routes';
import { ArchiveProjectScreen } from '../../src/screens/projects/sheets/archive.screen';
import { ExtendProjectScreen } from '../../src/screens/projects/sheets/extend.screen';

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
    '(tabs)/tasks/[id]/index': stub('screen-task'),
    'tasks/new/_layout': NewTaskStack,
    'tasks/new/form': stub('screen-task-form'),
    '(tabs)/projects/_layout': ProjectsStack,
    '(tabs)/projects/index': () => <ProjectsScreen />,
    '(tabs)/projects/filter': ProjectsFilterScreen,
    '(tabs)/projects/[id]/index': () => <ProjectDetailScreen />,
    '(tabs)/projects/[id]/edit': () => <ProjectEditScreen role={role} />,
    '(tabs)/projects/[id]/settings': () => <ProjectSettingsScreen role={role} />,
    '(tabs)/projects/[id]/extend': () => <ExtendProjectScreen role={role} />,
    '(tabs)/projects/[id]/archive': () => <ArchiveProjectScreen role={role} />,
    '(tabs)/projects/[id]/task-filter': ProjectTaskFilterScreen,
    'projects/new/_layout': NewProjectStack,
    'projects/new/index': () => <NewProjectScreen role={role} />,
    'projects/new/form': () => <ProjectFormScreen role={role} />,
    'projects/new/story': () => <ProjectStoryScreen role={role} />,
    'projects/new/draft': () => <ProjectDraftScreen role={role} />,
    'projects/new/template': () => <ProjectTemplateScreen role={role} />,
  };
}

/** Render the app at `url` as `role` (default: the session's Project Manager). */
export const openProjects = (url: string, role: Role = 'pm'): Promise<RenderRouterResult> =>
  renderRouter(routes(role), { initialUrl: url, wrapper: GluestackUIProvider });

/** Every store a Projects screen writes, back to the sample after each test. */
export function resetProjectStores() {
  afterEach(async () => {
    await act(async () => {
      resetProjects();
      resetTasks();
      resetArchive();
      resetQueries();
      resetSnack();
    });
  });
}
