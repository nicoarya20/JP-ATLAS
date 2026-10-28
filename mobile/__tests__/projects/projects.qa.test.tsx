// Projects QA pass (W4e) on the screens still on the sample data: Edit refuses another project's name, a primary says
// why it is off, Create project ends on the list while Atlas is archived. The list and detail read the server now;
// their screen-reader names are in projects.list.test.tsx and projects.detail.test.tsx.
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { archiveProject } from '../../src/data/projects.store';
import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
// Nothing is mounted yet, so no act(): an act() before renderRouter leaves the router rendering nothing.
const archiveAtlas = () => void archiveProject('atlas', 'Nico');

describe('names and reasons on the forms', () => {
  it("Edit: another project's name (any case) is refused under the field and as Save's hint", async () => {
    await openProjects('/projects/atlas/edit');
    const name = screen.getByTestId('edit-name');
    await fireEvent.changeText(name, ' internal TOOLS ');
    expect(screen.getByText('A project with this name already exists.')).toBeOnTheScreen();
    expect(button('Save changes')).toBeDisabled();
    expect(button('Save changes').props.accessibilityHint).toBe(
      'A project with this name already exists.',
    );
    await fireEvent.changeText(name, 'atlas project');
    expect(screen.queryByText('A project with this name already exists.')).not.toBeOnTheScreen();
    expect(button('Save changes')).toBeEnabled();
  });

  it('Form: a blank name says why once touched; Save names the reason from the start', async () => {
    await openProjects('/projects/new/form');
    expect(screen.queryByText('Enter a project name.')).not.toBeOnTheScreen();
    expect(button('Create project').props.accessibilityHint).toBe('Enter a project name.');
    await fireEvent(screen.getByTestId('form-name'), 'blur');
    expect(screen.getByText('Enter a project name.')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('form-name'), 'Leave app');
    expect(screen.queryByText('Enter a project name.')).not.toBeOnTheScreen();
    expect(button('Create project').props.accessibilityHint).toBeUndefined();
  });

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

  it('Extend: a cleared reason says why Save is off', async () => {
    await openProjects('/projects/atlas/extend');
    expect(button('Save')).toBeEnabled();
    await fireEvent.changeText(screen.getByTestId('extend-reason'), ' ');
    expect(screen.getByText('Enter a reason.')).toBeOnTheScreen();
    expect(button('Save')).toBeDisabled();
    expect(button('Save').props.accessibilityHint).toBe('Enter a reason.');
  });

  it('the Choose buttons name their way', async () => {
    await openProjects('/projects/new');
    expect(button('Choose: Tell us about the project')).toBeOnTheScreen();
    expect(button('Choose: Use a template')).toBeOnTheScreen();
  });
});

describe('a project in Archive', () => {
  it('Create project ends on the Projects list, still saying "Project created"', async () => {
    archiveAtlas();
    await openProjects('/projects/new/form');
    await fireEvent.changeText(screen.getByTestId('form-name'), 'Leave app');
    await press('Create project');
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(screen.getByText('Project created')).toBeOnTheScreen();
  });
});
