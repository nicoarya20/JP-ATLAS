// Projects QA pass (W4e): Edit refuses another project's name, a primary says why it is off, a project in Archive has
// no tasks to show or add, Create project ends on the list while Atlas is archived, and the screen-reader names (one
// stop per card, step, bar and member; no "+" or "•"; the Lead's note; the remove dialog's tasks sentence).
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

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
  it('its Tasks tab says where the tasks are, with no New task', async () => {
    archiveAtlas();
    await openProjects('/projects/atlas?tab=tasks');
    expect(screen.getByText('Tasks are in Archive with the project.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeOnTheScreen();
    expect(screen.queryByText('No tasks match these filters.')).not.toBeOnTheScreen();
  });

  it('Create project ends on the Projects list, still saying "Project created"', async () => {
    archiveAtlas();
    await openProjects('/projects/new/form');
    await fireEvent.changeText(screen.getByTestId('form-name'), 'Leave app');
    await press('Create project');
    await waitFor(() => expect(screen).toHavePathname('/projects'));
    expect(screen.getByText('Project created')).toBeOnTheScreen();
  });
});

describe('the project Tasks tab', () => {
  it('a board emptied by the search says so, and Reset filters clears it', async () => {
    await openProjects('/projects/atlas?tab=tasks&view=board');
    const search = screen.getByPlaceholderText('Search title, #number, or tag…');
    await fireEvent.changeText(search, 'zzz nothing');
    expect(screen.getByText('No tasks match these filters.')).toBeOnTheScreen();
    await press('Reset filters');
    expect(screen.queryByText('No tasks match these filters.')).not.toBeOnTheScreen();
  });

  it('List / Kanban is a radio group named View; a task card reads what it shows', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    const row = screen.getByTestId('project-task-view');
    expect(row.props).toMatchObject({
      accessibilityRole: 'radiogroup',
      accessibilityLabel: 'View',
    });
    const view = within(row);
    expect(view.getByRole('radio', { name: 'List' })).toBeChecked();
    expect(button('New task')).toBeOnTheScreen();
    expect(button(/^#14 Write the API spec, To do, \w+, \w+, \w+, \w+ \d+$/)).toBeOnTheScreen();
  });
});

describe('one stop per card, step and bar', () => {
  it('the project card reads name, status, Lead, health, progress, due and member count', async () => {
    await openProjects('/projects');
    expect(
      button(/^Atlas Project, Active, Lead: Nico, .+, Progress 70%, Due Oct 31, 4 members$/),
    ).toBeOnTheScreen();
  });

  it('Overview: each phase step and bar is one element; an attention row adds its sub and due', async () => {
    await openProjects('/projects/atlas');
    expect(screen.getByLabelText('Planning, done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Development, current')).toBeOnTheScreen();
    expect(screen.getByLabelText('Testing, upcoming')).toBeOnTheScreen();
    expect(screen.queryByText('✓')).not.toBeOnTheScreen();
    const bar = screen.getByRole('progressbar', { name: 'Tasks done' });
    expect(bar.props.accessibilityValue).toMatchObject({ min: 0, max: 100 });
    expect(screen.queryByText('Tasks done')).not.toBeOnTheScreen();
    expect(button('See all phases')).toBeOnTheScreen();
    expect(button(/^Overdue: #12 Fix SSO login, .+, Due \w+ \d+$/)).toBeOnTheScreen();
  });

  it('Phases: the Milestone heading only where there is one or an editor can add one', async () => {
    await openProjects('/projects/atlas?tab=phases');
    expect(button('Add milestone to Testing')).toBeOnTheScreen();
    expect(within(screen.getByTestId('phase-Testing')).getByText('Milestone')).toBeOnTheScreen();
  });

  it('Phases for a Member: no Milestone heading on a phase without one', async () => {
    await openProjects('/projects/atlas?tab=phases', 'member');
    const testing = within(screen.getByTestId('phase-Testing'));
    expect(testing.queryByText('Milestone')).not.toBeOnTheScreen();
    expect(within(screen.getByTestId('phase-Planning')).getByText('Milestone')).toBeOnTheScreen();
  });
});

describe('Members', () => {
  it('reads each member once; the Lead says why it stays; removing keeps their tasks theirs', async () => {
    await openProjects('/projects/atlas?tab=members');
    expect(button('Add member')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Nico Pratama, \(You\), Lead, /)).toBeOnTheScreen();
    expect(screen.getByText("The Lead stays Manager and can't be removed.")).toBeOnTheScreen();
    expect(button('Remove Nico').props.accessibilityHint).toBe(
      "The Lead stays Manager and can't be removed.",
    );
    await press('Remove Dodi');
    const dialog = within(await screen.findByTestId('member-confirm'));
    expect(dialog.getByText(/Their tasks stay assigned to them\.$/)).toBeOnTheScreen();
  });
});
