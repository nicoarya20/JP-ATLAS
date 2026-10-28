// Projects ③ ⑤–⑦ New project ways still on the sample data (port of prototype projects.create.test /
// projects.story.test), hidden behind `/projects/new` → the form but reachable by URL: three ways with one Cancel,
// story → draft → Create project, the template's estimated end; each Create opens the project with "Project
// created". A Member is sent away. The form itself reads the server: projects.form.test.tsx.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { serveAuth } from '../helpers/auth-server';
import { whoami } from '../helpers/projects-fixtures';
import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

// The ways open the form (whoami) and end on a project (its reads): fetch stays stubbed, so a read with no stub fails
// here instead of reaching a server.
let server: ReturnType<typeof serveAuth> | null = null;
beforeEach(() => {
  server = serveAuth({ '/api/app/whoami': { body: whoami() } });
});
afterEach(() => {
  server?.restore();
  server = null;
});

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));

async function expectCreated() {
  await waitFor(() => expect(screen).toHavePathname('/projects/atlas'));
  expect(screen.getByText('Project created')).toBeOnTheScreen();
}

describe('New project', () => {
  it('offers three ways, the story one recommended, and one Cancel', async () => {
    await openProjects('/projects/new/choose');
    expect(screen.getAllByRole('button', { name: /^Choose: / })).toHaveLength(3);
    expect(within(screen.getByTestId('way-story')).getByText('Recommended')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Cancel' })).toHaveLength(1);
    await fireEvent.press(
      within(screen.getByTestId('way-form')).getByRole('button', {
        name: 'Choose: Fill in the form yourself',
      }),
    );
    await waitFor(() => expect(screen).toHavePathname('/projects/new/form'));
  });

  it('a Member is sent home', async () => {
    await openProjects('/projects/new/choose', 'member');
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
    expect(screen.getByLabelText('Estimated end: Fri, Dec 11, 2026 (60 days)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Data migration' }));
    expect(screen.getByLabelText('Estimated end: Wed, Nov 11, 2026 (30 days)')).toBeOnTheScreen();
    await press('Create project');
    await expectCreated();
  });
});
