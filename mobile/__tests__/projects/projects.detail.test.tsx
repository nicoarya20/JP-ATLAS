// Projects ⑧–⑪ detail (port of prototype projects.detail.test / projects.tabs.test): the header and the tab in the
// route param, the Overview's attention rows, the Tasks tab, Phases, Members, and what the ⋯ menu offers.
//
// What changed in Phase 2: **what a control offers comes from the project's own `can{}`, never from the signed-in
// role.** So the tests that used to pass `'member'` and expect less now hand the stub a project whose `can` is empty
// and expect the same less — which is the rule the screen actually follows, and the one the server enforces.
//
// Two blocks of the Phase 1 suite are gone with the features they covered, both listed in
// docs/phase2-gap-disembunyikan.md:
//
// - **The per-row task action** ("Start working", "Request review", "Review", "View" for a Member). The row carries
//   `can` and `primary`, but the writes behind them belong to the Tasks module and are not wired to this screen, so
//   the card opens the task instead of offering work it would not do.
// - **List / Kanban.** The board moves cards through the sample store, so handing it server rows would draw a board
//   whose drags change nothing. It waits on the Tasks module's own writes.
//
// "+ Phase" went the same way earlier, in the data layer's own pass: the route exists, the form does not.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { MEMBER_PROJECTS } from '../helpers/projects-api-server';
import { DODI, ME } from '../helpers/projects-wire';
import { answerProjects, openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
const tab = (name: string) =>
  fireEvent.press(within(screen.getByTestId('project-tabs')).getByRole('tab', { name }));

describe('Project detail', () => {
  it('opens on Overview with the progress and the tasks needing attention', async () => {
    await openProjects('/projects/atlas');
    expect(screen.getByTestId('screen-project')).toBeOnTheScreen();
    expect(screen.getAllByText('Atlas Project').length).toBeGreaterThan(0);
    // #12 is due before the test clock's day, so it arrives from the `due=overdue` query.
    await waitFor(() => expect(button(/^Overdue: #12 Fix SSO login/)).toBeOnTheScreen());
    await press(/^Overdue: #12 Fix SSO login/);
    await waitFor(() => expect(screen).toHavePathname('/tasks/12'));
  });

  it('shows the next milestone the plan names', async () => {
    answerProjects({
      plan: {
        nextMilestone: {
          id: 'm-1',
          projectId: 'atlas',
          phaseId: null,
          title: 'Beta release',
          description: null,
          dueDate: '2026-10-25',
          reachedAt: null,
        },
      },
    });
    await openProjects('/projects/atlas');
    await waitFor(() =>
      expect(screen.getByText('◆ Next milestone: Beta release')).toBeOnTheScreen(),
    );
  });

  it('switches tabs in place through the route param', async () => {
    await openProjects('/projects/atlas');
    await tab('Members');
    expect(screen).toHaveSearchParams({ id: 'atlas', tab: 'members' });
    expect(screen).toHavePathname('/projects/atlas');
    // A member row is keyed by userId, never by name: two people may share one (K4).
    await waitFor(() => expect(screen.getByTestId(`member-${DODI.id}`)).toBeOnTheScreen());
    await tab('Phases');
    await waitFor(() => expect(screen.getByTestId('deadline-history')).toBeOnTheScreen());
  });

  it('says so for a project that is not there', async () => {
    await openProjects('/projects/nope');
    await waitFor(() => expect(screen.getByTestId('project-missing')).toBeOnTheScreen());
  });

  it('says the same for a project the caller may not see: one 404 covers all three', async () => {
    answerProjects({ rows: MEMBER_PROJECTS });
    await openProjects('/projects/sinar', 'member');
    await waitFor(() => expect(screen.getByTestId('project-missing')).toBeOnTheScreen());
  });

  it('draws no ⋯ menu when the project grants nothing', async () => {
    answerProjects({ detail: { can: {} } });
    await openProjects('/projects/atlas');
    await waitFor(() => expect(screen.getByTestId('screen-project')).toBeOnTheScreen());
    expect(screen.queryByTestId('project-actions')).not.toBeOnTheScreen();
  });

  it('offers Edit and Move to Archive when can{} grants them, and nothing else', async () => {
    await openProjects('/projects/atlas');
    await fireEvent.press(screen.getByTestId('project-actions'));
    expect(await screen.findByText('Edit project')).toBeOnTheScreen();
    expect(screen.getByText('Move to Archive')).toBeOnTheScreen();
    // Project settings left the menu with GAP A-12: `can.manageKinds` exists but there is no
    // /api/app route for task kinds, so the screen behind it could only show sample data.
    expect(screen.queryByText('Project settings')).not.toBeOnTheScreen();
  });

  it('shows the server sentence and a retry when the header fails', async () => {
    answerProjects({ failDetail: true });
    await openProjects('/projects/atlas');
    await waitFor(() => expect(screen.getByTestId('project-failed')).toBeOnTheScreen());
    expect(screen.getByText('Proyek tidak dapat dimuat')).toBeOnTheScreen();
  });
});

describe('Tasks tab', () => {
  it('shows the cards the server sent, and opens a task from its card', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await waitFor(() => expect(screen.getByTestId('project-task-14')).toBeOnTheScreen());
    expect(screen.getByText('Write the API spec')).toBeOnTheScreen();
    // The card's link is the Pressable inside it, which reads what it shows (without the note).
    await fireEvent.press(screen.getByLabelText(/^#14 Write the API spec,/));
    await waitFor(() => expect(screen).toHavePathname('/tasks/14'));
  });

  it('counts what it loaded, not a total the keyset page does not carry (A-13)', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await waitFor(() => expect(screen.getByText('3 tasks loaded')).toBeOnTheScreen());
  });

  it('New task opens the task form with the project picked', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await waitFor(() => expect(button('New task')).toBeOnTheScreen());
    await press('New task');
    await waitFor(() => expect(screen).toHavePathname('/tasks/new/form'));
    expect(screen).toHaveSearchParams({ project: 'atlas' });
  });

  it('the filter opens the project task-filter sheet', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await fireEvent.press(screen.getByLabelText('Filter and sort'));
    await waitFor(() => expect(screen).toHavePathname('/projects/atlas/task-filter'));
  });

  it('says the project has no tasks, rather than leaving the tab blank', async () => {
    answerProjects({ tasks: [] });
    await openProjects('/projects/atlas?tab=tasks');
    await waitFor(() => expect(screen.getByTestId('project-tasks-empty')).toBeOnTheScreen());
  });
});

describe('Phases tab', () => {
  it('shows the phases with their range and progress', async () => {
    await openProjects('/projects/atlas?tab=phases');
    await waitFor(() => expect(screen.getByTestId('phase-Planning')).toBeOnTheScreen());
    expect(screen.getByTestId('phase-Development')).toBeOnTheScreen();
    expect(screen.getByTestId('phase-Testing')).toBeOnTheScreen();
  });

  it('shows the deadline history the extensions answer', async () => {
    await openProjects('/projects/atlas?tab=phases');
    await waitFor(() => expect(screen.getByTestId('deadline-history')).toBeOnTheScreen());
    // The manager's own words, shown as they wrote them (K5).
    expect(screen.getByText('Client asked for the report screen.')).toBeOnTheScreen();
  });
});

describe('Members tab', () => {
  it('names each member and marks the Lead and yourself', async () => {
    await openProjects('/projects/atlas?tab=members');
    await waitFor(() => expect(screen.getByTestId(`member-${ME.id}`)).toBeOnTheScreen());
    expect(screen.getByText('2 members')).toBeOnTheScreen();
    expect(screen.getByText('Nico Arya')).toBeOnTheScreen();
    expect(screen.getByText(DODI.name)).toBeOnTheScreen();
  });

  it('hides the role select and Remove when can.update is not granted', async () => {
    answerProjects({ detail: { can: {} } });
    await openProjects('/projects/atlas?tab=members');
    await waitFor(() => expect(screen.getByTestId(`member-${DODI.id}`)).toBeOnTheScreen());
    expect(screen.queryByRole('button', { name: `Remove ${DODI.name}` })).not.toBeOnTheScreen();
  });
});
