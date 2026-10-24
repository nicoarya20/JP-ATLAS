// Projects ③–⑦ New project (port of prototype projects.create.test / projects.story.test): three ways with one Cancel,
// the form (Create waits for a name, the creator stays Manager), story → draft → Create project, the template's
// estimated end; each Create opens the project with "Project created". A Member is sent away.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));

async function expectCreated() {
  await waitFor(() => expect(screen).toHavePathname('/projects/atlas'));
  expect(screen.getByText('Project created')).toBeOnTheScreen();
}

describe('New project', () => {
  it('offers three ways, the story one recommended, and one Cancel', async () => {
    await openProjects('/projects/new');
    expect(screen.getAllByRole('button', { name: 'Choose' })).toHaveLength(3);
    expect(within(screen.getByTestId('way-story')).getByText('Recommended')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
    await fireEvent.press(
      within(screen.getByTestId('way-form')).getByRole('button', { name: 'Choose' }),
    );
    await waitFor(() => expect(screen).toHavePathname('/projects/new/form'));
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/new', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Fill in project form', () => {
  it('Create project waits for a name; the creator stays Manager', async () => {
    await openProjects('/projects/new/form');
    expect(button('Create project')).toBeDisabled();
    expect(button('Role of Nico Pratama')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Project name, required'), 'Leave App');
    await press('Create project');
    await expectCreated();
  });

  it('a quick pick sets the end date from the start', async () => {
    await openProjects('/projects/new/form');
    expect(button('End date')).toHaveAccessibilityValue({ text: 'Nov 7' });
    expect(screen.getByRole('button', { name: '1 mo' })).toBeSelected();
    await press('1 wk');
    expect(screen.getByRole('button', { name: '1 wk' })).toBeSelected();
    expect(button('End date')).toHaveAccessibilityValue({ text: 'Oct 14' });
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/new/form', 'member');
    await waitFor(() => expect(screen).toHavePathname('/'));
  });
});

describe('Story → draft', () => {
  it('builds the draft from the story, then Create project opens the project', async () => {
    await openProjects('/projects/new/story');
    expect(screen.getByTestId('project-story-text').props.value).toMatch(/^We want to build/);
    expect(screen.getByText(/\/ 2000 characters$/)).toBeOnTheScreen();
    expect(button('Speak')).toBeDisabled();
    await press(/^Build draft/);
    await waitFor(() => expect(screen).toHavePathname('/projects/new/draft'));
    expect(screen.getByText('Not a project yet')).toBeOnTheScreen();
    expect(screen.getByText('4 phases · 4 milestones · 8 tasks')).toBeOnTheScreen();
    await press('Create project');
    await expectCreated();
  });

  it('unchecking a phase hides its tasks; a task type can be changed', async () => {
    await openProjects('/projects/new/draft');
    const phase = within(screen.getByTestId('draft-phase-1'));
    expect(phase.getByLabelText('Task type of Design the screens')).toBeOnTheScreen();
    await fireEvent.press(phase.getByLabelText('1. Planning'));
    expect(phase.queryByLabelText('Task type of Design the screens')).not.toBeOnTheScreen();
  });

  it('Edit opens the form', async () => {
    await openProjects('/projects/new/draft');
    await press('Edit');
    await waitFor(() => expect(screen).toHavePathname('/projects/new/form'));
  });
});

describe('Use template', () => {
  it('estimates the end from the picked template and the start date', async () => {
    await openProjects('/projects/new/template');
    expect(screen.getByRole('radio', { name: 'Internal app' })).toBeChecked();
    expect(screen.getByTestId('template-end')).toHaveTextContent('Fri, Dec 11, 2026 (60 days)');
    await fireEvent.press(screen.getByRole('radio', { name: 'Data migration' }));
    expect(screen.getByTestId('template-end')).toHaveTextContent('Wed, Nov 11, 2026 (30 days)');
    await press('Create project');
    await expectCreated();
  });
});
