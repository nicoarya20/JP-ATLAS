// Projects ④ Fill in project form in the route tree against stubbed `/api/app/whoami`, `/api/app/team/picker` and
// `POST /api/app/projects`: who may create (whoami caps), Create waiting for a name, the quick picks, the body sent
// (blanks left out, a picked Lead sent as a Manager), the new project opened with "Project created", and a refusal
// kept on the form in the server's words.
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetProjectsQuery } from '../../src/data/projects.api';
import { forgetAllResources } from '../../src/data/resource';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  atlasDetail,
  atlasItem,
  atlasRoutes,
  page,
  pickerPeople,
  recording,
  type Sent,
  whoami,
} from '../helpers/projects-fixtures';
import { openProjects, resetProjectStores } from '../helpers/projects-router';
import { drainToastTimers } from '../helpers/toast-timers';

resetProjectStores();
drainToastTimers();

let server: ReturnType<typeof serveAuth> | null = null;
let sent: Sent[] = [];
const serve = (routes: AuthRoutes) => {
  server = serveAuth(routes);
  return server;
};

beforeEach(() => {
  forgetAllResources();
  resetProjectsQuery();
  sent = [];
});
afterEach(() => {
  server?.restore();
  server = null;
});

const FORM = '/projects/new';
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const press = (name: string | RegExp) => fireEvent.press(button(name));

/** whoami, the picker, the list and the Atlas reads (the new project opens as Atlas); the create answers `reply`. */
const routes = (
  reply: { status?: number; body?: unknown } = { status: 201, body: atlasDetail() },
  createProject = true,
): AuthRoutes => ({
  '/api/app/whoami': { body: whoami(createProject) },
  '/api/app/team/picker': { body: pickerPeople() },
  '/api/app/projects?': { body: page([atlasItem()]) },
  ...atlasRoutes(),
  // Last: every other path under it is matched above.
  '/api/app/projects': recording(sent, reply),
});

describe('Fill in project form', () => {
  test('waits for whoami; someone who may not create projects is sent home', async () => {
    let answer = () => {};
    serve({
      '/api/app/whoami': {
        body: whoami(false),
        wait: new Promise<void>((r) => {
          answer = r;
        }),
      },
    });
    await openProjects(FORM);
    expect(screen.getByTestId('form-loading')).toBeOnTheScreen();
    await act(async () => answer());
    await waitFor(() => expect(screen).toHavePathname('/'));
  });

  test('/projects/new is the form itself, with no blank screen redirecting to it', async () => {
    serve(routes());
    await openProjects('/projects');
    await act(async () => router.push(FORM));
    expect(await screen.findByTestId('project-form')).toBeOnTheScreen();
    expect(screen).toHavePathname(FORM);
  });

  test('a blank name says why once touched; Create sends what was filled in and opens the project', async () => {
    serve(routes());
    await openProjects(FORM);
    const create = await screen.findByRole('button', { name: 'Create project' });
    expect(create).toBeDisabled();
    expect(create.props.accessibilityHint).toBe('Enter a project name.');
    expect(screen.queryByText('Enter a project name.')).not.toBeOnTheScreen();
    await fireEvent(screen.getByTestId('form-name'), 'blur');
    expect(screen.getByText('Enter a project name.')).toBeOnTheScreen();
    // The creator stays a Manager.
    expect(button('Role of Nico Arya')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('form-name'), ' Leave App ');
    expect(button('Create project').props.accessibilityHint).toBeUndefined();
    await press('Create project');
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas'));
    expect(screen.getByText('Project created')).toBeOnTheScreen();
    expect(sent).toEqual([
      {
        method: 'POST',
        path: '/api/app/projects',
        body: {
          name: 'Leave App',
          status: 'active',
          priority: 'medium',
          startDate: '2026-10-07',
          dueDate: '2026-11-07',
        },
      },
    ]);
  });

  test('a quick pick sets the end date from the start', async () => {
    serve(routes());
    await openProjects(FORM);
    expect(await screen.findByRole('button', { name: '1 mo' })).toBeSelected();
    expect(button('End date')).toHaveAccessibilityValue({ text: 'Nov 7' });
    await press('1 wk');
    expect(button('1 wk')).toBeSelected();
    expect(button('End date')).toHaveAccessibilityValue({ text: 'Oct 14' });
  });

  test('someone picked can be the Lead: their role stays Manager, and both are sent', async () => {
    serve(routes());
    await openProjects(FORM);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add member' }));
    const picker = within(screen.getByTestId('form-picker'));
    await fireEvent.press(await picker.findByRole('button', { name: 'Add Sari Dewi' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add Budi Santoso' }));
    // Picked people leave the picker's results.
    expect(screen.queryByRole('button', { name: 'Add Sari Dewi' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('form-lead'));
    const [option] = screen.getAllByText('Sari Dewi');
    if (!option) throw new Error('No Sari Dewi option in the Lead picker');
    await fireEvent.press(option);
    expect(button('Role of Sari Dewi')).toBeDisabled();
    expect(button('Role of Sari Dewi').props.accessibilityHint).toBe(
      'The Lead is always a Manager.',
    );
    await fireEvent.changeText(screen.getByTestId('form-name'), 'Leave App');
    await press('Create project');
    await waitFor(() => expect(screen).toHavePathname('/projects/p-atlas'));
    expect(sent[0]?.body).toMatchObject({
      leadId: 'u-sari',
      members: [
        { userId: 'u-sari', role: 'manager' },
        { userId: 'u-budi', role: 'member' },
      ],
    });
  });

  test("removing the Lead gives the Lead back to the creator; a refusal stays in the server's words", async () => {
    serve(
      routes({ status: 422, body: { error: 'Nama proyek sudah dipakai.', code: 'VALIDATION' } }),
    );
    await openProjects(FORM);
    await fireEvent.press(await screen.findByRole('button', { name: 'Add member' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add Sari Dewi' }));
    await fireEvent.press(screen.getByTestId('form-lead'));
    const [option] = screen.getAllByText('Sari Dewi');
    if (!option) throw new Error('No Sari Dewi option in the Lead picker');
    await fireEvent.press(option);
    await press('Remove Sari Dewi');
    await fireEvent.changeText(screen.getByTestId('form-name'), 'Leave App');
    await press('Create project');
    expect(await screen.findByTestId('form-error')).toHaveTextContent('Nama proyek sudah dipakai.');
    expect(screen).toHavePathname(FORM);
    expect(sent[0]?.body).not.toHaveProperty('leadId');
    expect(sent[0]?.body).not.toHaveProperty('members');
  });
});
