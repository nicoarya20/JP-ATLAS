// Projects ⑧–⑪ detail against stubbed `/api/app/projects/:id*` reads: the header from the detail, each Overview part
// from its own read (and failing on its own), the Phases and Members tabs, a project that is not there, and the
// four tabs (the Tasks tab itself: projects.tasks-tab.test.tsx). The view rules are in __tests__/data/projects.view.test.ts.
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetProjectsQuery } from '../../src/data/projects.api';
import { forgetAllResources } from '../../src/data/resource';
import { ProjectDetailScreen } from '../../src/screens/projects/detail/project-detail.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import { atlasDetail, atlasRoutes, emptyPlan, notFound } from '../helpers/projects-fixtures';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

let server: ReturnType<typeof serveAuth> | null = null;
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
  jest.clearAllMocks();
});
afterEach(() => {
  server?.restore();
  server = null;
});

const open = (tab?: string) => {
  setParams(tab ? { id: 'p-atlas', tab } : { id: 'p-atlas' });
  return render(<ProjectDetailScreen />, { wrapper: Providers });
};

describe('Project detail header', () => {
  test('status, condition and its reason, Lead and deadline, the extension pill; four tabs', async () => {
    serve(atlasRoutes());
    await open();
    expect(await screen.findByTestId('screen-project')).toBeOnTheScreen();
    expect(screen.getAllByText('Atlas Project').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeOnTheScreen();
    expect(screen.getByText('At risk')).toBeOnTheScreen();
    expect(screen.getByText('1 tugas penting terlambat')).toBeOnTheScreen();
    expect(screen.getByText('Lead: Nico Pratama · Due: Oct 31, 2026')).toBeOnTheScreen();
    expect(screen.getByText('Extended ×1')).toBeOnTheScreen();
    const tabs = within(screen.getByTestId('project-tabs'));
    expect(tabs.getAllByRole('tab')).toHaveLength(4);
    expect(tabs.getByRole('tab', { name: 'Tasks' })).toBeOnTheScreen();
    await fireEvent.press(tabs.getByRole('tab', { name: 'Members' }));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'members' });
  });

  test('a condition set by hand says who set it', async () => {
    serve(
      atlasRoutes(
        atlasDetail({
          condition: { level: 'off_track', reason: 'Vendor mundur' },
          conditionOverride: {
            condition: 'off_track',
            reason: 'Vendor mundur',
            setByName: 'Nico Pratama',
            expiresAt: null,
          },
        }),
      ),
    );
    await open();
    expect(await screen.findByText('Set by hand by Nico Pratama')).toBeOnTheScreen();
    expect(screen.getByText('Vendor mundur')).toBeOnTheScreen();
  });

  test('an unknown tab opens the Overview', async () => {
    serve(atlasRoutes());
    await open('files');
    expect(await screen.findByText('Recent activity')).toBeOnTheScreen();
  });

  test('a 404 says the project is not there (Trash or not yours alike)', async () => {
    serve({ '/api/app/projects/p-atlas': notFound });
    await open();
    expect(
      await screen.findByText('It may have been moved to the Trash, or you are not in it.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('project-failed')).not.toBeOnTheScreen();
  });

  test('any other failure shows the server sentence and Try again', async () => {
    const s = serve({
      '/api/app/projects/p-atlas': { status: 500, body: { error: 'Server sedang sibuk.' } },
    });
    await open();
    expect(await screen.findByText('Server sedang sibuk.')).toBeOnTheScreen();
    s.use(atlasRoutes());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('screen-project')).toBeOnTheScreen();
  });
});

describe('Overview', () => {
  test('progress, the phase steps and next milestone, attention rows (each task once), activity', async () => {
    serve(atlasRoutes());
    await open();
    expect(await screen.findByText('Now: Build · 25%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Design, done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Build, current')).toBeOnTheScreen();
    expect(screen.getByText('◆ Next milestone: Beta ready')).toBeOnTheScreen();
    expect(screen.getByText('Oct 12, 2026 · in 5 days')).toBeOnTheScreen();
    expect(screen.getByText('Start Sep 1 · due Oct 31 · 24 days left')).toBeOnTheScreen();
    const rows = within(await screen.findByTestId('project-attention'));
    expect(rows.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual([
      'Overdue: #12 Hero section, Rina · Due Oct 5',
      'Awaiting review: #17 Copy review, Unassigned',
    ]);
    await fireEvent.press(rows.getByLabelText(/^Overdue: #12/));
    expect(router.push).toHaveBeenCalledWith('/tasks/12');
    expect(await screen.findByText('Rina menyelesaikan #12 Hero section')).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText('See all phases'));
    expect(router.setParams).toHaveBeenCalledWith({ tab: 'phases' });
  });

  test('a failed part fails alone; its Try again asks only that read', async () => {
    const routes = atlasRoutes();
    const s = serve({
      ...routes,
      '/api/app/projects/p-atlas/activity': { status: 500, body: { error: 'Riwayat gagal.' } },
    });
    await open();
    expect(await screen.findByText('Riwayat gagal.')).toBeOnTheScreen();
    expect(screen.getByText('Now: Build · 25%')).toBeOnTheScreen();
    s.use(routes);
    await fireEvent.press(
      within(screen.getByTestId('overview-activity-failed')).getByRole('button', {
        name: 'Try again',
      }),
    );
    expect(await screen.findByText('Rina menyelesaikan #12 Hero section')).toBeOnTheScreen();
  });

  test('no plan yet and nothing needing attention say so', async () => {
    serve({
      ...atlasRoutes(),
      '/api/app/projects/p-atlas/plan': { body: emptyPlan() },
      '/api/app/tasks?': { body: { items: [], nextCursor: null } },
    });
    await open();
    expect(await screen.findByText('No phases yet.')).toBeOnTheScreen();
    expect(await screen.findByText('No tasks need attention.')).toBeOnTheScreen();
  });
});

describe('Phases and Members tabs', () => {
  test('Phases: a card per phase, milestones by phase and loose, the deadline history', async () => {
    serve(atlasRoutes());
    await open('phases');
    expect(await screen.findByText('3 phases')).toBeOnTheScreen();
    const design = within(screen.getByTestId('phase-ph-1'));
    expect(design.getByText('Sep 1–24')).toBeOnTheScreen();
    expect(design.getByLabelText('◆ Design signed off, Reached Sep 23')).toBeOnTheScreen();
    expect(within(screen.getByTestId('phase-ph-2')).getByText('From Sep 25')).toBeOnTheScreen();
    const launch = within(screen.getByTestId('phase-ph-3'));
    expect(launch.getByText('No dates')).toBeOnTheScreen();
    expect(launch.getByText('No tasks in this phase yet')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('phase-loose')).getByLabelText('◆ Go live, Oct 31 · Waiting'),
    ).toBeOnTheScreen();
    const history = within(await screen.findByTestId('deadline-history'));
    expect(history.getByText('Original deadline: Oct 20, 2026')).toBeOnTheScreen();
    expect(history.getByText('Oct 20 → Oct 31')).toBeOnTheScreen();
    expect(history.getByText('Waiting on others')).toBeOnTheScreen();
    expect(history.getByText('Menunggu API vendor')).toBeOnTheScreen();
    expect(history.getByText('by Nico Pratama · Oct 2, 2026')).toBeOnTheScreen();
  });

  test('Members: one stop per member with role, (You) and Lead; the only-Manager note for an editor', async () => {
    serve(atlasRoutes());
    await open('members');
    expect(await screen.findByText('2 members')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Nico Pratama, (You), Lead, Project Manager, Manager'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Rina Wulandari, Member')).toBeOnTheScreen();
    expect(screen.getByText(/Nico Pratama is the only Manager/)).toBeOnTheScreen();
  });

  test('Members: no only-Manager note for someone who cannot edit the project', async () => {
    serve(atlasRoutes(atlasDetail({ can: {} })));
    await open('members');
    expect(await screen.findByText('2 members')).toBeOnTheScreen();
    expect(screen.queryByText(/is the only Manager/)).not.toBeOnTheScreen();
  });
});
