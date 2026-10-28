// Project detail writes against stubbed `/api/app/projects/:id*`: the ⋯ menu and Extend deadline as the project's
// `can{}` allows (a deny code says why), a phase's Start / Complete, and on the Members tab adding someone, changing a
// role and removing a member behind a T2 confirmation, with the server's refusals in the app's words.
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { resetProjectsQuery } from '../../src/data/projects.api';
import { forgetAllResources } from '../../src/data/resource';
import { ProjectDetailScreen } from '../../src/screens/projects/detail/project-detail.screen';
import { type AuthRoutes, serveAuth } from '../helpers/auth-server';
import {
  atlasDetail,
  atlasMembers,
  atlasRoutes,
  pickerPeople,
  recording,
  type Sent,
} from '../helpers/projects-fixtures';
import { Providers } from '../helpers/providers';
import { setParams } from '../helpers/router-mock';
import { drainToastTimers } from '../helpers/toast-timers';

jest.mock('expo-router', () => require('../helpers/router-mock').routerMock());

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
  jest.clearAllMocks();
  sent = [];
});
afterEach(() => {
  server?.restore();
  server = null;
});

const DETAIL = '/api/app/projects/p-atlas';
const open = (tab?: string) => {
  setParams(tab ? { id: 'p-atlas', tab } : { id: 'p-atlas' });
  return render(<ProjectDetailScreen />, { wrapper: Providers });
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const confirm = () => within(screen.getByTestId('member-confirm'));

async function menuItem(name: string) {
  await fireEvent.press(await screen.findByTestId('project-actions'));
  await fireEvent.press(await screen.findByText(name));
}

describe('the ⋯ menu and Extend deadline', () => {
  test('an editor who may trash: Edit, Move to Trash and Extend deadline open their screens', async () => {
    serve(atlasRoutes());
    await open();
    await menuItem('Edit project');
    expect(router.push).toHaveBeenCalledWith('/projects/p-atlas/edit');
    await menuItem('Move to Trash');
    expect(router.push).toHaveBeenCalledWith('/projects/p-atlas/archive');
    await fireEvent.press(button('Extend deadline'));
    expect(router.push).toHaveBeenCalledWith('/projects/p-atlas/extend');
  });

  test('a deny code keeps the item and says why; no edit, no Extend deadline', async () => {
    serve(atlasRoutes(atlasDetail({ can: { trash: 'ROLE_CANNOT_TRASH' } })));
    await open();
    await menuItem('Move to Trash');
    expect(
      await screen.findByText(
        'Only an Admin or a Project Manager can delete a project. Ask them to do it.',
      ),
    ).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.queryByText('Edit project')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Extend deadline' })).not.toBeOnTheScreen();
  });

  test('a viewer gets no menu; a closed project or one without a deadline no Extend deadline', async () => {
    serve(atlasRoutes(atlasDetail({ can: {} })));
    await open();
    await screen.findByTestId('screen-project');
    expect(screen.queryByTestId('project-actions')).not.toBeOnTheScreen();
    server?.restore();
    forgetAllResources();
    serve(atlasRoutes(atlasDetail({ status: 'completed' })));
    await open();
    await screen.findAllByTestId('project-actions');
    expect(screen.queryByRole('button', { name: 'Extend deadline' })).not.toBeOnTheScreen();
  });
});

describe('phase steps', () => {
  test('Complete the phase in progress, Start the next; the plan is read again with a notice', async () => {
    const s = serve({
      '/p-atlas/phases/': recording(sent, { body: {} }),
      ...atlasRoutes(),
    });
    await open('phases');
    await screen.findByTestId('phase-ph-2');
    expect(within(screen.getByTestId('phase-ph-1')).queryByRole('button')).not.toBeOnTheScreen();
    expect(button('Start phase Launch')).toBeOnTheScreen();
    await fireEvent.press(button('Complete phase Build'));
    expect(await screen.findByText('Phase completed')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'PATCH', path: `${DETAIL}/phases/ph-2`, body: { status: 'done' } },
    ]);
    expect(s.calls.filter((u) => u.endsWith('/plan'))).toHaveLength(2);
  });

  test('someone who may not edit sees no step', async () => {
    serve(atlasRoutes(atlasDetail({ can: {} })));
    await open('phases');
    await screen.findByTestId('phase-ph-2');
    expect(screen.queryByRole('button', { name: /phase/ })).not.toBeOnTheScreen();
  });
});

describe('members', () => {
  const memberRoutes = (
    reply = { body: atlasMembers() } as { status?: number; body?: unknown },
  ) => ({
    '/p-atlas/members/': recording(sent, reply),
    ...atlasRoutes(),
  });

  test('the Lead keeps Manager and has no Remove; a role change is confirmed, sent and said', async () => {
    serve(memberRoutes());
    await open('members');
    expect(await screen.findByTestId('member-role-u-nico')).toBeDisabled();
    expect(screen.getByTestId('member-role-u-nico').props.accessibilityHint).toBe(
      "The Lead stays Manager and can't be removed.",
    );
    expect(screen.queryByRole('button', { name: 'Remove Nico Pratama' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('member-role-u-rina'));
    // The roles legend says "Viewer" too; the picker's option comes first in the tree.
    const [option] = screen.getAllByText('Viewer');
    if (!option) throw new Error('the role picker did not open');
    await fireEvent.press(option);
    expect(
      confirm().getByText('Rina Wulandari becomes Viewer in “Atlas Project”.'),
    ).toBeOnTheScreen();
    await fireEvent.press(confirm().getByTestId('confirm-action'));
    expect(await screen.findByText('Role changed')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'PATCH', path: `${DETAIL}/members/u-rina`, body: { role: 'viewer' } },
    ]);
  });

  test('Remove names the impact; the member is removed and it is said', async () => {
    serve(memberRoutes());
    await open('members');
    await fireEvent.press(await screen.findByRole('button', { name: 'Remove Rina Wulandari' }));
    expect(
      confirm().getByText(
        'Rina Wulandari loses access to “Atlas Project”. Their tasks stay in the project, still assigned to them.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(confirm().getByTestId('confirm-action'));
    expect(await screen.findByText('Member removed')).toBeOnTheScreen();
    expect(sent).toEqual([{ method: 'DELETE', path: `${DETAIL}/members/u-rina`, body: undefined }]);
  });

  test("a refusal stays in the dialog in the app's words", async () => {
    serve(
      memberRoutes({ status: 409, body: { error: 'Proyek harus punya…', code: 'LAST_MANAGER' } }),
    );
    await open('members');
    await fireEvent.press(await screen.findByRole('button', { name: 'Remove Rina Wulandari' }));
    await fireEvent.press(confirm().getByTestId('confirm-action'));
    expect(
      await confirm().findByText(
        'A project needs at least one manager. Make someone else a manager first.',
      ),
    ).toBeOnTheScreen();
  });

  test('your own Remove is off and says why', async () => {
    const items = atlasMembers().items.map((m) => ({
      ...m,
      isLead: m.userId === 'u-rina',
      role: 'manager' as const,
    }));
    serve({ '/p-atlas/members': { body: { items } }, ...atlasRoutes() });
    await open('members');
    const mine = await screen.findByRole('button', { name: 'Remove Nico Pratama' });
    expect(mine).toBeDisabled();
    expect(mine.props.accessibilityHint).toBe(
      "You can't remove yourself. Ask another manager to do it.",
    );
  });

  test('+ Member: pick a role, Add someone; they join and the picker asks again', async () => {
    const s = serve({
      '/api/app/team/picker': { body: pickerPeople() },
      '/p-atlas/members': (url, init) =>
        init?.method === 'POST'
          ? recording(sent, { status: 201, body: atlasMembers() })(url, init)
          : { body: atlasMembers() },
      ...atlasRoutes(),
    });
    await open('members');
    await fireEvent.press(await screen.findByRole('button', { name: 'Add member' }));
    await fireEvent.press(
      within(screen.getByTestId('member-add')).getByRole('button', { name: 'Viewer' }),
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Add Sari Dewi' }));
    expect(await screen.findByText('Sari Dewi added')).toBeOnTheScreen();
    expect(sent).toEqual([
      { method: 'POST', path: `${DETAIL}/members`, body: { userId: 'u-sari', role: 'viewer' } },
    ]);
    const asked = s.calls.filter((u) => u.includes('/team/picker'));
    expect(asked).toHaveLength(2);
    expect(asked[0]).toContain('projectId=p-atlas');
  });
});
