// Projects ⑧–⑪ detail (port of prototype projects.detail.test / projects.tabs.test): header and tabs in the route
// param, attention rows open the task, the Tasks tab (List/Kanban in the param, an action per status, View for a
// Member, its own filter route), phases, and a Member kept out of projects they are not in.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
const tab = (name: string) =>
  fireEvent.press(within(screen.getByTestId('project-tabs')).getByRole('tab', { name }));

describe('Project detail', () => {
  it('opens on Overview with the progress, next milestone and tasks needing attention', async () => {
    await openProjects('/projects/atlas');
    expect(screen.getByTestId('screen-project')).toBeOnTheScreen();
    expect(screen.getAllByText('Atlas Project').length).toBeGreaterThan(0);
    expect(screen.getByText('◆ Next milestone: Beta release')).toBeOnTheScreen();
    await press(/^Overdue: #12 Fix SSO login/);
    await waitFor(() => expect(screen).toHavePathname('/tasks/12'));
  });

  it('switches tabs in place through the route param', async () => {
    await openProjects('/projects/atlas');
    await tab('Members');
    expect(screen).toHaveSearchParams({ id: 'atlas', tab: 'members' });
    expect(screen).toHavePathname('/projects/atlas');
    expect(screen.getByTestId('member-Rina')).toBeOnTheScreen();
    await tab('Phases');
    expect(screen.getByText('Deadline history')).toBeOnTheScreen();
  });

  it('says so for a project that is not there', async () => {
    await openProjects('/projects/nope');
    expect(screen.getByTestId('project-missing')).toBeOnTheScreen();
  });

  it('keeps a Member out of a project they are not in', async () => {
    await openProjects('/projects/sinar', 'member');
    expect(screen.getByTestId('project-missing')).toBeOnTheScreen();
  });

  it('a Member gets no ⋯ menu', async () => {
    await openProjects('/projects/atlas', 'member');
    expect(screen.getByTestId('screen-project')).toBeOnTheScreen();
    expect(screen.queryByTestId('project-actions')).not.toBeOnTheScreen();
  });

  it('a PM gets Edit, Settings and Move to Archive in the ⋯ menu', async () => {
    await openProjects('/projects/atlas');
    await fireEvent.press(screen.getByTestId('project-actions'));
    expect(await screen.findByText('Edit project')).toBeOnTheScreen();
    expect(screen.getByText('Project settings')).toBeOnTheScreen();
    expect(screen.getByText('Move to Archive')).toBeOnTheScreen();
  });
});

describe('Tasks tab', () => {
  it('gives each status its action; Start working says Task started', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    expect(button('Start working #14 Write the API spec')).toBeOnTheScreen();
    expect(button('Request review #12 Fix SSO login')).toBeOnTheScreen();
    expect(button(/^Review #17 /)).toBeOnTheScreen();
    await press('Start working #14 Write the API spec');
    expect(screen.getByText('Task started')).toBeOnTheScreen();
    await press(/^Review #17 /);
    await waitFor(() => expect(screen).toHavePathname('/tasks/17'));
  });

  it('a Member gets View on every task', async () => {
    await openProjects('/projects/atlas?tab=tasks', 'member');
    expect(screen.queryByRole('button', { name: /^Start working/ })).not.toBeOnTheScreen();
    expect(button('View #14 Write the API spec')).toBeOnTheScreen();
  });

  it('Kanban lives in the route param; the filter opens the project task-filter sheet', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await fireEvent.press(
      within(screen.getByTestId('project-task-view')).getByRole('tab', { name: 'Kanban' }),
    );
    expect(screen).toHaveSearchParams({ id: 'atlas', tab: 'tasks', view: 'board' });
    await fireEvent.press(screen.getByLabelText('Filter and sort'));
    await waitFor(() => expect(screen).toHavePathname('/projects/atlas/task-filter'));
  });

  it('+ New task opens the task form with the project picked', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await press('+ New task');
    await waitFor(() => expect(screen).toHavePathname('/tasks/new/form'));
    expect(screen).toHaveSearchParams({ project: 'atlas' });
  });
});

describe('Phases tab', () => {
  it('shows the phases with their actions for a PM; Add phase is a notice', async () => {
    await openProjects('/projects/atlas?tab=phases');
    await press('+ Phase');
    expect(screen.getByText('Add phase')).toBeOnTheScreen();
  });
});
