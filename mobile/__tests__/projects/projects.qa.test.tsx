// Projects QA pass (W4e) on the New project ways still on the sample data (hidden, reachable by URL): a primary says
// why it is off, and the Choose buttons name their way. The server-backed screens' reasons are in
// projects.form.test.tsx and projects.edit.test.tsx; the list and detail names in projects.list/detail tests.
import { fireEvent, screen } from '@testing-library/react-native';

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

describe('names and reasons on the forms', () => {
  it('Story: a blank story keeps Build draft off with its reason; the bullets are not read', async () => {
    await openProjects('/projects/new/story');
    expect(screen.getByLabelText("The project's goal")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('project-story-text'), '   ');
    expect(screen.getByText('Write your story first.')).toBeOnTheScreen();
    expect(button('Build draft')).toBeDisabled();
    expect(button('Build draft').props.accessibilityHint).toBe('Write your story first.');
  });

  it('Template: Start date is required; a blank name says why', async () => {
    await openProjects('/projects/new/template');
    expect(button('Start date, required')).toBeOnTheScreen();
    expect(screen.getByText('Start date *', { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('template-name'), '');
    expect(screen.getByText('Enter a project name.')).toBeOnTheScreen();
    expect(button('Create project').props.accessibilityHint).toBe('Enter a project name.');
  });

  it('the Choose buttons name their way', async () => {
    await openProjects('/projects/new/choose');
    expect(button('Choose: Tell us about the project')).toBeOnTheScreen();
    expect(button('Choose: Use a template')).toBeOnTheScreen();
  });
});
