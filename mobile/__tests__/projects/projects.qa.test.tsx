// Projects QA pass (W4e): a primary says why it is off, a project in the Trash has no tasks to show or add, and the
// screen-reader names — one stop per card, step, bar and member, no visible "+" or "•" read aloud, the Lead's note,
// and the remove dialog's tasks sentence.
//
// The accessibility intent is unchanged; only what feeds it moved to the server. Two assertions had to change
// because the thing they named is gone, both documented where it was removed:
//
// - **Edit's "a project with this name already exists".** There is no unique constraint on `project.name`, so the
//   rule would refuse a name the server accepts. The reason Save is now off with nothing to send is "Change
//   something first.", and that is what the hint must say.
// - **"+ Milestone" / "+ Phase" and List / Kanban.** The routes exist, the forms and the server-backed board do not.
//   So the Milestone heading is asserted where a milestone actually is, and not as something an editor could add.
//
// The project card's spoken name lost its member count: `WireProjectListItem` carries no member list (the row is
// about the project, not its people), so the count is not there to read.
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { answerProjects, openProjects, resetProjectStores } from '../helpers/projects-router';
import { DODI, ME } from '../helpers/projects-wire';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));
/** A project in the Trash: no field says so, `can.update` coming back as the deny code does (A-15). */
const IN_TRASH = { can: { update: 'PROJECT_IN_TRASH', trash: true } } as const;

describe('names and reasons on the forms', () => {
  it('Edit: Save says why it is off while there is nothing to send', async () => {
    await openProjects('/projects/atlas/edit');
    await screen.findByTestId('edit-name');
    expect(button('Save changes')).toBeDisabled();
    expect(button('Save changes').props.accessibilityHint).toBe('Change something first.');
    await fireEvent.changeText(screen.getByTestId('edit-name'), 'Atlas v2');
    expect(button('Save changes')).toBeEnabled();
    expect(button('Save changes').props.accessibilityHint).toBeUndefined();
  });

  it('Edit: a blank name says why under the field and as the hint', async () => {
    await openProjects('/projects/atlas/edit');
    await screen.findByTestId('edit-name');
    await fireEvent.changeText(screen.getByTestId('edit-name'), '  ');
    expect(screen.getByText('Enter a project name.')).toBeOnTheScreen();
    expect(button('Save changes')).toBeDisabled();
    expect(button('Save changes').props.accessibilityHint).toBe('Enter a project name.');
  });

  it('Form: a blank name says why once touched; Save names the reason from the start', async () => {
    await openProjects('/projects/new/form');
    await screen.findByTestId('form-name');
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

  it('Extend: Save names each reason it is off, in turn', async () => {
    await openProjects('/projects/atlas/extend');
    await screen.findByTestId('project-extend');
    // Nothing picked yet: the new deadline is the first thing missing.
    expect(button('Save')).toBeDisabled();
    expect(button('Save').props.accessibilityHint).toBe('Pick a new deadline.');
    await fireEvent.press(screen.getByTestId('extend-next'));
    await fireEvent(screen.getByTestId('extend-next-picker'), 'onChange', {
      nativeEvent: { timestamp: Date.UTC(2026, 10, 30), utcOffset: 0 },
    });
    // Now the reason is.
    await waitFor(() => expect(button('Save').props.accessibilityHint).toBe('Enter a reason.'));
    await fireEvent.changeText(screen.getByTestId('extend-reason'), 'Client asked');
    await waitFor(() => expect(button('Save')).toBeEnabled());
    await fireEvent.changeText(screen.getByTestId('extend-reason'), ' ');
    expect(screen.getByText('Enter a reason.')).toBeOnTheScreen();
    expect(button('Save')).toBeDisabled();
  });

  it('the Choose buttons name their way', async () => {
    await openProjects('/projects/new');
    expect(button('Choose: Tell us about the project')).toBeOnTheScreen();
    expect(button('Choose: Use a template')).toBeOnTheScreen();
  });
});

describe('a project in the Trash', () => {
  it('its Tasks tab says where the tasks are, with no New task', async () => {
    answerProjects({ detail: IN_TRASH });
    await openProjects('/projects/atlas?tab=tasks');
    await waitFor(() =>
      expect(screen.getByText('This project is in Archive, and its tasks went with it.')).toBeOnTheScreen(),
    );
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeOnTheScreen();
    expect(screen.queryByText('No tasks match these filters.')).not.toBeOnTheScreen();
  });

  it('Create project opens the project it just made, saying "Project created"', async () => {
    await openProjects('/projects/new/form');
    await screen.findByTestId('form-name');
    await fireEvent.changeText(screen.getByTestId('form-name'), 'Leave app');
    await press('Create project');
    // The answer carries the new id, so the screen goes there rather than to a fixed project.
    await waitFor(() => expect(screen).toHavePathname('/projects/atlas'));
    expect(screen.getByText('Project created')).toBeOnTheScreen();
  });
});

describe('the project Tasks tab', () => {
  it('a card reads what it shows, and the count is honest about being a page', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    await waitFor(() => expect(button(/^#14 Write the API spec, In progress,/)).toBeOnTheScreen());
    expect(button('New task')).toBeOnTheScreen();
    expect(screen.getByText('3 tasks loaded')).toBeOnTheScreen();
  });

  it('a search that matches nothing says so, and Reset filters clears it', async () => {
    await openProjects('/projects/atlas?tab=tasks');
    const search = screen.getByPlaceholderText('Search title, #number, or tag…');
    await fireEvent.changeText(search, 'zzz nothing');
    await waitFor(() =>
      expect(screen.getByText('No tasks match these filters.')).toBeOnTheScreen(),
    );
    await press('Reset filters');
    await waitFor(() =>
      expect(screen.queryByText('No tasks match these filters.')).not.toBeOnTheScreen(),
    );
  });
});

describe('one stop per card, step and bar', () => {
  it('the project card reads name, status, Lead, health, progress and due', async () => {
    await openProjects('/projects');
    expect(
      button(/^Atlas Project, Active, Lead: Nico Arya, .+, Progress 70%, Due Oct 31$/),
    ).toBeOnTheScreen();
  });

  it('Overview: each phase step and bar is one element; an attention row adds its sub and due', async () => {
    await openProjects('/projects/atlas');
    await waitFor(() => expect(screen.getByLabelText('Planning, done')).toBeOnTheScreen());
    expect(screen.getByLabelText('Development, current')).toBeOnTheScreen();
    expect(screen.getByLabelText('Testing, upcoming')).toBeOnTheScreen();
    // The tick is drawn, not read: the step's own label already says "done".
    expect(screen.queryByText('✓')).not.toBeOnTheScreen();
    const bar = screen.getByRole('progressbar', { name: 'Tasks done' });
    expect(bar.props.accessibilityValue).toMatchObject({ min: 0, max: 100 });
    expect(screen.queryByText('Tasks done')).not.toBeOnTheScreen();
    expect(button('See all phases')).toBeOnTheScreen();
    expect(button(/^Overdue: #12 Fix SSO login, .+, Due \w+ \d+$/)).toBeOnTheScreen();
  });

  it('Phases: the Milestone heading sits on the phase that has one, and nowhere else', async () => {
    await openProjects('/projects/atlas?tab=phases');
    await waitFor(() => expect(screen.getByTestId('phase-Planning')).toBeOnTheScreen());
    expect(within(screen.getByTestId('phase-Planning')).getByText('Milestone')).toBeOnTheScreen();
    expect(within(screen.getByTestId('phase-Testing')).queryByText('Milestone')).not.toBeOnTheScreen();
  });
});

describe('Members', () => {
  it('reads each member once; the Lead says why it stays; removing keeps their tasks theirs', async () => {
    await openProjects('/projects/atlas?tab=members');
    await waitFor(() => expect(screen.getByTestId(`member-${ME.id}`)).toBeOnTheScreen());
    expect(button('Add member')).toBeOnTheScreen();
    // Name, (You), Lead and the job title read as one stop; the sub line is the title alone (A-9).
    expect(screen.getByLabelText(`${ME.name}, (You), Lead, Product Designer`)).toBeOnTheScreen();
    expect(screen.getByText("The Lead stays Manager and can't be removed.")).toBeOnTheScreen();
    expect(button(`Remove ${ME.name}`).props.accessibilityHint).toBe(
      "The Lead stays Manager and can't be removed.",
    );
    await press(`Remove ${DODI.name}`);
    const dialog = within(await screen.findByTestId('member-confirm'));
    expect(dialog.getByText(/Their tasks stay assigned to them\.$/)).toBeOnTheScreen();
  });
});
